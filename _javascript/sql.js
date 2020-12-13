import { log, log_h, show_error, clear_error } from "./log.js"

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
var has_database = false;

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

function start_sql(file) {
  return new Promise((resolve, reject) => {
    if (wasm_supported) {
      worker = new Worker('./lib/worker.sql-wasm.js');
    } else {
      log_h('<font color="red">NOTE: Your browser does not support WASM, this tool will run much slower...</font>');
      worker = new Worker('./lib/worker.sql-asm.js');
    }
    worker.onmessage = () => {
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
        if (ver < 14 || ver > 18) {
          show_error(`Database is version ${ver}. This app only supports databases with versions 14-17`);
          reject("Bad version");
        }

        has_database = true;

        log(`USC Database loaded (version ${ver})`)
        clear_error();
        resolve()
      });
    }

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

    worker.onerror = e => {
      console.error("Worker error: ", e);
      show_error(e);
    }
  });

}

function download() {
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
    has_database = false;
  };

  worker.postMessage({ action: 'export' });
}


export { start_sql, query, sql_first, sql_all, download, has_database };
