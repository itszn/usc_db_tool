const wasm_supported = (() => {
    try {
        if (typeof WebAssembly === "object"
            && typeof WebAssembly.instantiate === "function") {
            const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (module instanceof WebAssembly.Module)
                return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
        }
    } catch (e) {
    }
    return false;
})();

var worker;

if (wasm_supported) {
	worker = new Worker('./lib/worker.sql-wasm.js');
} else {
	worker = new Worker('./lib/worker.sql-asm.js');
}

window.sql_cbs = {};
let sqlid = 1;
function query(sql, params={}) {
  return new Promise(resolve => {
    let sid = sqlid++;
    window.sql_cbs[sid] = resolve;

    console.log('running');
    worker.postMessage({
      id: sid,
      action: "exec",
      sql: sql,
      params: params
    });
  });
}


const inputElement = document.getElementById("database");
inputElement.addEventListener("change", handleFiles, false);

function handleFiles() {
	const file = this.files[0];
	console.log(file);
  const reader = new FileReader();
  reader.onload = function(evt) {
    let db = evt.target.result
    console.log(db);
    worker.postMessage({
      id:sqlid++,
      action:"open",
      buffer:db, /*Optional. An ArrayBuffer representing an SQLite Database file*/
    });
  }
  reader.readAsArrayBuffer(file);
	
}

worker.onerror = e => {
  console.error("Worker error: ", e);
  show_error(e);
}

function sql_first(results) {
  return results.values[0];
}

function sql_all(results) {
  return results.values;
}

function show_error(msg) {
  $('#errormsg').text(msg).show();
}

function log(msg) {
  $('#log').append(msg+'\n');
}

let has_database = false;
let running = false;

worker.onmessage = () => {
  $('#inputdb').hide();
  console.log("Database opened");
  worker.onmessage = event => {
    let data = event.data;
    console.log(data)
    if (data.id in window.sql_cbs) {
      let cb = window.sql_cbs[data.id];
      delete window.sql_cbs[data.id];
      if (data.error) {
        show_error(data.error);
      }
      if (data.results) {
        cb(data.results[0]);
      }
    }
  };


  query('SELECT version from Database').then(sql_first).then(res=>{
    let [ver] = res;
    if (ver != 14) {
      show_error(`Database is version ${ver}. This app only supports databases with version 14`);
      throw "Bad version";
    }

    has_database = true;

    $('#actions').show();
    log(`USC Database loaded (version ${ver})`)
  });
};

function esc(data) {
  return $('<div>').text(data).html();
}

function get_input(title, body, val="") {
  return new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
<div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p>${esc(body)}</p>
    <input class="input" type="text">
    <button class="button is-fullwidth">Ok</button>
  </div>
</div>`);
    c.find('button').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(c.find('input')[0].value);
    })
    c.find('input')[0].value = val;
  });
}

$('#btn-dump').click(() => {
(async function() {
  if (!has_database || running)
    return;
  running = true;

  await query('SELECT path from Charts limit 20').then(sql_all).then(res=>{
    log("Path of first 20 charts:");
    for (let r of res) {
      log(r)
    }
  });
  await query('SELECT path from Folders limit 20').then(sql_all).then(res=>{
    log("Path of first 20 folders:");
    for (let r of res) {
      log(r)
    }
  });

  running = false;

})().catch(show_error)
});

$('#btn-paths').click(() => {
(async function() {
  if (!has_database || running)
    return;
  running = true;

  log('Finding chart path');
	let all_rows =  await (query('SELECT rowid, path, folderid from Charts').then(sql_all));
  let possible_path = [];

  let sep = all_rows[0][1][0] === '/'? '/' : '\\';
  log(`Path seperator is ${sep}`);

  for (let row of all_rows) {
    let path = row[1].split(sep);
    //console.log(path);

    if (possible_path.length === 0) {
      possible_path = path;
      console.log(possible_path);
      continue;
    }

    for (let i=0; i<path.length; i++) {
      // If we matched up to the end of our possible
      if (i >= possible_path.length)
        break;

      // If we found a different dir, then we need to truncate
      if (path[i] !== possible_path[i]) {
        possible_path = path.slice(0, i);
        console.log('checked',path);
        console.log(possible_path);
        break;
      }
    }

  }
  let old_path = possible_path.join(sep);

  console.log(all_rows.length);

  old_path = await get_input(
    'Original Song Directory Path',
    'This is our guess of your original song folder, modify it if not correct:',
    old_path
  );
  if (old_path[old_path.length-1] != sep)
    old_path += sep;
  log(`Old song path is ${old_path}`)

  let new_path = await get_input(
    'New Song Directory Path',
    'Enter the new absolute song folder path you want to use:',
    old_path
  );
  if (new_path[new_path.length-1] != sep)
    new_path += sep;
  log(`New song path is ${new_path}`)

  log('Updating chart paths...')

  let charts_to_flush = [];
  let flush_charts = async function(table, force=false) {
    if (charts_to_flush.length === 0)
      return;

    let ps = {};
    let q = `UPDATE ${table} SET path = (case `;
    let or = ''
    for (let c of charts_to_flush) {
      let [id, path] = c;
      q += `when rowid=${id} then $path${id} `;
      or += `or rowid=${id} `;
      ps[`$path${id}`] = path;
    }
    q += `end) where ${or.slice(3)}`
    console.log(q);
    charts_to_flush.length = 0;
    await query(q, ps);
  }

  let update_count = 0;

  let folder_updates = {};

  // Update charts in chunks
  for (let row of all_rows) {
    let [id, path, fid] = row;

    if (!path.startsWith(old_path))
      continue;

    // Get new path by replacing old
    let updated_path = new_path + path.slice(old_path.length);

    if (!(fid in folder_updates)) {
      // Remove last part of path to get folder
      let folder_path = updated_path.split(sep).slice(0,-1).join(sep);
      folder_updates[fid] = folder_path;
    }

    update_count++;

    charts_to_flush.push([id, updated_path]);
    if (charts_to_flush.length >= 100) {
      flush_charts('Charts');
    }
  }
  flush_charts('Charts');

  log(`Done updating charts with new path. Updated path on ${update_count} charts`)

  // Update folders as well with correct paths
  update_count = 0;
  for (let f of Object.entries(folder_updates)) {
    charts_to_flush.push(f);
    update_count++;
    if (charts_to_flush.length >= 100) {
      flush_charts('Folders');
    }
  }
  flush_charts('Folders');

  log(`Done updating folders with new path. Updated path on ${update_count} folders`)

  running = false;
})().catch(show_error)
});


$('#btn-download').click(()=>{
(async function() {
  if (!has_database || running)
    return;
  running = true;

  worker.onmessage = function (event) {
    log("Exporting the database");
    var arraybuff = event.data.buffer;
    var blob = new Blob([arraybuff]);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.href = window.URL.createObjectURL(blob);
    a.download = "maps_modified.db";
		a.onclick = function () {
			setTimeout(function () {
				window.URL.revokeObjectURL(a.href);
			}, 1500);
		};
    a.click();

    log("Closing Database: refresh to restart");
    running = false;
    has_database = false;
  };

  worker.postMessage({ action: 'export' });

})().catch(show_error)
});
