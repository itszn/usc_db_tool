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
  log_h('<font color="red">NOTE: Your browser does not support WASM, this tool will run much slower...</font>');
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
  if (results === undefined)
    return null;
  return results.values[0];
}

function sql_all(results) {
  if (results === undefined)
    return [];
  return results.values;
}

function show_error(msg) {
  $('#errormsg').text(msg).show();
  throw msg;
}

function log(msg) {
  $('#log').append(msg+'\n');
}
function log_h(msg) {
  $('#log').append($(msg+'<br/>'));
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
    if (ver < 14 || ver > 16) {
      show_error(`Database is version ${ver}. This app only supports databases with versions 14-16`);
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

function modal(title, body) {
  return new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
<div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p>${body}</p>
    <button class="button btno is-fullwidth">Ok</button>
    <button class="button btnc is-fullwidth is-danger">Cancel</button>
  </div>
</div>`);
    c.find('.btno').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(true);
    })
    c.find('.btnc').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(null);
    })
  });
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
    <button class="button btno is-fullwidth">Ok</button>
    <button class="button btnc is-fullwidth is-danger">Cancel</button>
  </div>
</div>`);
    c.find('.btno').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(c.find('input')[0].value);
    })
    c.find('.btnc').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(null);
    })
    c.find('input')[0].value = val;
  });
}

$('#btn-remove-col').click(() => {
(async function() {
  if (!has_database || running)
    return;

  running = true;

  // Get a list of all collections
  let collections = await (query(`SELECT DISTINCT collection from Collections`).then(sql_all));
  console.log(collections);

  if (collections.length === 0) {
    log("No collections found...");
    running = false;
    return;
  }

  let body = '';
  for (let f of collections) {
    body += `
<div class="field">
<label class="checkbox">
  <input type="checkbox">
  ${esc(f[0])}
</label>
</div>`;
  }
  let res = await modal('Select Collection To Delete',body);
  if (res === null) {
    running = false;
    return;
  }

  let ops = $('#modal').find('input');

  let deleted = 0;
  for (let i=0; i<collections.length; i++) {
    let o = ops.eq(i);

    if (!o[0].checked)
      continue;

    let old_name = collections[i][0];
    res = await (query(
      `DELETE FROM Collections WHERE collection=$oldname`,{
      '$oldname': old_name,
    }).then(sql_all));
  }

  log(`Deleted ${deleted} collection(s)`);

  running = false;

})().catch(show_error)
});

$('#btn-rename-col').click(() => {
(async function() {
  if (!has_database || running)
    return;

  running = true;

  // Get a list of all collections
  let collections = await (query(`SELECT DISTINCT collection from Collections`).then(sql_all));
  console.log(collections);

  if (collections.length === 0) {
    log("No collections found...");
    running = false;
    return;
  }

  let body = '';
  for (let f of collections) {
    body += `
<div class="field">
<label class="radio">
  <input type="radio">
  ${esc(f[0])}
</label>
</div>`;
  }
  let res = await modal('Select Collection To Rename',body);
  if (res === null) {
    running = false;
    return;
  }

  let ops = $('#modal').find('input');

  let old_name = null;
  for (let i=0; i<collections.length; i++) {
    let o = ops.eq(i);

    if (!o[0].checked)
      continue;

    old_name = collections[i][0];
    break;
  }

  if (old_name === null) {
    log("No collection selected");
    running = false;
    return;
  }


  let new_name = await get_input(
    'Rename Collection',
    `Enter the new name for the "${old_name}" collection:`,
     old_name 
  );
  if (new_name === null) {
    running = false;
    return;
  }

  if (new_name === old_name) {
    log(`New name same as old...`);
    running = false;
    return;
  }

  log(`Renaming collection '${old_name}'...`);

  res = await (query(
    `UPDATE Collections SET collection=$newname where collection=$oldname`,{
      '$oldname': old_name,
      '$newname': new_name,
    }).then(sql_all));

  log(`Collection renamed to '${new_name}'`);

  running = false;

})().catch(show_error)
});

$('#btn-stats-folders').click(() => {
(async function() {
  if (!has_database || running)
    return;

  running = true;

  let [dirs, base_dir] = await find_folders();
  dirs = Array.from(dirs.values());
  console.log(dirs)

  let body = '';
  for (let f of dirs) {
    body += `
<div class="field">
<label class="checkbox">
  <input type="checkbox" checked>
  ${esc(f)}
</label>
</div>`;
  }
  let res = await modal('Select Folders To Collect Stats For',body);
  if (res === null) {
    running = false;
    return;
  }

  let ops = $('#modal').find('input');
  console.log(dirs);
  console.log(ops);

  let where = [];
  for (let i=0; i<dirs.length; i++) {
    let o = ops.eq(i);

    console.log(o[0], o[0].checked);
    if (!o[0].checked)
      continue;

    let spath = base_dir + dirs[i];

    where.push(`path LIKE "${spath}%"`)
  }

  console.log(where);

  if (where.length == 0) {
    await do_stats('');
    return
  }

  where = ` AND (${where.join(' OR ')})`
  console.log(where);

  await do_stats(where);

})().catch(show_error)
});

$('#btn-stats').click(() => {
  if (!has_database || running)
    return;

  running = true;

  do_stats();
});

function do_stats(where='') {
(async function() {
  running = true;

  log("Starting stat collection. This may take a few minutes");
  if (!wasm_supported) {
    log_h('<font color="red">NOTE: Your browser does not support WASM, this tool will run much slower...</font>');
  }

  let table = $('<table>').html(`
<thead>
  <th>Level</th>
  <th>Average</th>
  <th>Clear Average</th>
  <th>Best Score</th>
  <th># Clear</th>
  <th># Ex Clear</th>
  <th># UC</th>
  <th># PUC</th>
</thead>
<tbody>
</tbody>`);
  let body = table.find('tbody');
  $('#log').append(table);

  let prog = $('<progress value="0" max="4" style="width:100%"></progress>');
  $('#log').append(prog);

  let volforce = $('<div>0 VF</div>');
  $('#log').append(volforce);

  let low_best_vol = 0;
  let best_vol = [];

  for (let level=20; level>=10; level--) {
    prog.attr('value','0');

    // Get all charts and their max scores
    let raw_scores = await (query(`SELECT hash, title, (SELECT max(s.score) from Scores s where s.chart_hash=hash) from Charts where level=${level} ${where}`).then(sql_all));
    console.log(raw_scores);


    let scores = {};
    let best_score  = 0;
    let best_hash = '';

    for (let row of raw_scores) {
      let [hash, name, max_score] = row;
      if (max_score === null)
        continue;

      if (max_score > best_score) {
        best_score = max_score;
        best_hash = hash;
      }

      if (hash in scores) {
        log(`Duplicate charts found for '${name}'`);
        continue;
      }

      scores[hash] = {
        score: max_score,
        badge: max_score === 10000000? 'puc' : 'f' // Fail will be updated below,
      };
    }

    prog.attr('value','1');

    if (Object.keys(scores).length === 0) {
      body.append($(`<tr><td>${level}</td><td><b>0000</b>000</td><td><b>0000</b>000</td><td><b>0000</b>000</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>`));
      continue;

    }

    // Check if any charts have a UC
    let raw_misses = await (query(`SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.miss=0 limit 1) from Charts where level=${level} ${where}`).then(sql_all));
    console.log(raw_misses);


    for (let row of raw_misses) {
      let [hash, is_uc] = row;
      if (is_uc !== 1)
        continue;

      let chart = scores[hash];
      if (chart.badge != 'f') // If already puc, skip
        continue;

      chart.badge = 'uc'
    }

    prog.attr('value','2');

    // Check if any charts were using excessive
    let raw_ex = await (query(`SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.gameflags&1=1 and s.gauge>0 limit 1) from Charts where level=${level} ${where}`).then(sql_all));
    console.log(raw_ex);

    for (let row of raw_ex) {
      let [hash, is_hc] = row;
      if (is_hc !== 1)
        continue;

      let chart = scores[hash];
      if (chart.badge != 'f') // If already puc or uc, skip
        continue;

      chart.badge = 'hc'
    }

    prog.attr('value','3');

    // Check if any charts were cleared
    let raw_c = await (query(`SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.gameflags&1=0 and s.gauge>0.7 limit 1) from Charts where level=${level} ${where}`).then(sql_all));
    console.log(raw_c);

    prog.attr('value','4');

    for (let row of raw_c) {
      let [hash, is_c] = row;
      if (is_c !== 1)
        continue;

      let chart = scores[hash];
      if (chart.badge != 'f') // If already puc or uc, skip
        continue;

      chart.badge = 'c'
    }


    let avg_list = function(l) {
      if (l.length === 0)
        return 0;
      return l.reduce((a,b)=>a+b) / l.length;
    }

    console.log("Calcing");

    let score_list = Object.values(scores);

    for (let s of score_list) {

      let grade = 0.80;
      if (s.score >= 9900000)
        grade = 1.05;
      else if (s.score >= 9800000)
        grade = 1.02;
      else if (s.score >= 9700000)
        grade = 1.00;
      else if (s.score >= 9500000)
        grade = 0.97;
      else if (s.score >= 9300000)
        grade = 0.94;
      else if (s.score >= 9000000)
        grade = 0.91;
      else if (s.score >= 8700000)
        grade = 0.88;
      else if (s.score >= 7500000)
        grade = 0.85;
      else if (s.score >= 6500000)
        grade = 0.82;

      let clear = ({
        puc: 1.10,
        uc: 1.05,
        hc: 1.02,
        c: 1.00,
        f: 0.50,
      })[s.badge];

      let vol = level * 2 * (s.score/10000000) * grade * clear;
      vol = parseInt(vol) / 100;
      if (best_vol.length < 50 || low_best_vol < vol) {
        best_vol.push(vol);
        if (best_vol.length > 50) {
          best_vol = best_vol.sort().slice(-50);
          low_best_vol = best_vol[0];
        }
      }
    }

    let total_vol = best_vol.reduce((a,b)=>a+b);
    total_vol = parseInt(total_vol * 1000)/1000
    let vf_classes = [
      [0.0, 'Sienna', 'brown', 'white', [0, 2.5, 5.0, 7.5]],
      [10.0, 'Cobalt', 'navy', 'white', [10, 10.5, 11.0, 11.5]],
      [12.0, 'Dandelion', '#fcc800', 'black', [12.0, 12.5, 13.0, 13.5]],
      [14.0, 'Cyan', '#25b7c0', 'black', [14.0, 14.25, 14.5, 14.75]],
      [15.0, 'Scarlet', '#f73562', 'white' [15.0, 15.25, 15.5, 15.75]],
      [16.0, 'Coral', '#ff69b4', 'white', [16.0, 16.25, 16.5, 16.75]],
      [17.0, 'Argento', '#d5ddef', 'black', [17.0, 17.25, 17.5, 17.75]],
      [18.0, 'Eldora', 'gold', 'black', [18.0, 18.25, 18.5, 18.75]],
      [19.0, 'Crimson', 'red', 'white', [19.0, 19.25, 19.5, 19.75]],
      [20.0, 'Imperial', 'purple', 'white', [20.0, 21.0, 22.0, 23.0]]
    ];

    let vf_class;
    for (let c of vf_classes) {
      if (total_vol >= c[0])
        vf_class = c;
    }

    let stars = 1;
    for (let i=0; i<vf_class[4].length; i++) {
      if (total_vol > vf_class[4][i])
        stars = i+1;
    }

    volforce.text(`${total_vol} VF (${vf_class[1]} ${'\u2605'.repeat(stars)})`);

    let avg = avg_list(score_list.map(x=>x.score));
    let clr_avg = avg_list(score_list.filter(x=>x.badge !== 'f').map(x=>x.score));
    let badges = {}
    for (let score of score_list) {
      let b = score.badge;
      badges[b] = (badges[b]? badges[b] : 0) + 1;
    }

    let nums = function(n) {
      n = parseInt(n);
      if (n === 10000000)
        return '<b>10000</b>000';
      n = n.toString();
      n = '0'.repeat(7-n.length)+n;
      return `<b>${n.slice(0,4)}</b>${n.slice(4)}`
    }

    body.append($(`
<tr>
  <td>${level}</td>
  <td>${nums(avg)}</td>
  <td>${nums(clr_avg)}</td>
  <td>${nums(best_score)}</td>
  <td>${badges.c? badges.c : 0}</td>
  <td>${badges.hc? badges.hc : 0}</td>
  <td>${badges.uc? badges.uc : 0}</td>
  <td>${badges.puc? badges.puc : 0}</td>
</tr>`));
  }

  prog.remove();

  running = false;
})().catch(show_error)
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

async function find_folders(all_rows) {
  if (all_rows === undefined)
    all_rows =  await (
      query('SELECT rowid, path, folderid from Charts').then(sql_all));

  let [base_dir,sep] = await find_base_path(all_rows);
  base_dir += sep;

  log(`Base dir is ${base_dir}`);

  let dirs = new Set();

  console.log(base_dir);
  for (let row of all_rows) {
    let path = row[1];
    path = path.slice(base_dir.length);
    path = path.split(sep)[0]
    dirs.add(path)
  }

  return [dirs, base_dir];

}

async function find_base_path(all_rows) {
  if (all_rows === undefined)
    all_rows =  await (
      query('SELECT rowid, path, folderid from Charts').then(sql_all));

  let possible_path = [];

  let sep = all_rows[0][1][0] === '/'? '/' : '\\';

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
  return [possible_path.join(sep), sep];
}

$('#btn-paths').click(() => {
(async function() {
  if (!has_database || running)
    return;
  running = true;

  log('Finding main song folder');

  let all_rows =  await (
    query('SELECT rowid, path, folderid from Charts').then(sql_all));
  let [old_path, sep] = await find_base_path(all_rows);

  old_path = await get_input(
    'Original Song Directory Path',
    'This is our guess of your original song folder, modify it if not correct:',
    old_path
  );
  if (old_path=== null) {
    running = false;
    return;
  }

  if (old_path[old_path.length-1] != sep)
    old_path += sep;
  log(`Old song path is ${old_path}`)

  let new_path = await get_input(
    'New Song Directory Path',
    'Enter the new absolute song folder path you want to use:',
    old_path
  );
  if (new_path === null) {
    running = false;
    return;
  }

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
