'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var worker = new Worker('./lib/worker.sql-wasm.js');

window.sql_cbs = {};
var sqlid = 1;
function query(sql) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new Promise(function (resolve) {
    var sid = sqlid++;
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

var inputElement = document.getElementById("database");
inputElement.addEventListener("change", handleFiles, false);

function handleFiles() {
  var file = this.files[0];
  console.log(file);
  var reader = new FileReader();
  reader.onload = function (evt) {
    var db = evt.target.result;
    console.log(db);
    worker.postMessage({
      id: sqlid++,
      action: "open",
      buffer: db /*Optional. An ArrayBuffer representing an SQLite Database file*/
    });
  };
  reader.readAsArrayBuffer(file);
}

worker.onerror = function (e) {
  console.error("Worker error: ", e);
  show_error(e);
};

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
  $('#log').append(msg + '\n');
}

var has_database = false;
var running = false;

worker.onmessage = function () {
  $('#inputdb').hide();
  console.log("Database opened");
  worker.onmessage = function (event) {
    var data = event.data;
    console.log(data);
    if (data.id in window.sql_cbs) {
      var cb = window.sql_cbs[data.id];
      delete window.sql_cbs[data.id];
      cb(data.results[0]);
    }
  };

  query('SELECT version from Database').then(sql_first).then(function (res) {
    var _res = _slicedToArray(res, 1),
        ver = _res[0];

    if (ver != 14) {
      show_error('Database is version ' + ver + '. This app only supports databases with version 14');
      throw "Bad version";
    }

    has_database = true;

    $('#actions').show();
    log('USC Database loaded (version ' + ver + ')');
  });
};

function esc(data) {
  return $('<div>').text(data).html();
}

function get_input(title, body) {
  var val = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

  return new Promise(function (resolve) {
    var c = $('#modal').addClass('is-active').find('.modal-content').html('\n<div class="box">\n  <div class="content">\n    <h3 class="is-3">' + esc(title) + '</h3>\n    <p>' + esc(body) + '</p>\n    <input class="input" type="text">\n    <button class="button is-fullwidth">Ok</button>\n  </div>\n</div>');
    c.find('button').click(function (x) {
      $('#modal').removeClass('is-active');
      resolve(c.find('input')[0].value);
    });
    c.find('input')[0].value = val;
  });
}

$('#btn-dump').click(async function () {
  if (!has_database || running) return;
  running = true;

  await query('SELECT path from Charts limit 20').then(sql_all).then(function (res) {
    log("Path of first 20 charts:");
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = res[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var r = _step.value;

        log(r);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  });
  await query('SELECT path from Folders limit 20').then(sql_all).then(function (res) {
    log("Path of first 20 folders:");
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = res[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var r = _step2.value;

        log(r);
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  });

  running = false;
});

$('#btn-paths').click(async function () {
  if (!has_database || running) return;
  running = true;

  log('Finding chart path');
  var all_rows = await query('SELECT rowid, path, folderid from Charts').then(sql_all);
  var possible_path = [];

  var sep = all_rows[0][1][0] === '/' ? '/' : '\\';
  log('Path seperator is ' + sep);

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = all_rows[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var row = _step3.value;

      var path = row[1].split(sep);
      //console.log(path);

      if (possible_path.length === 0) {
        possible_path = path;
        console.log(possible_path);
        continue;
      }

      for (var i = 0; i < path.length; i++) {
        // If we matched up to the end of our possible
        if (i >= possible_path.length) break;

        // If we found a different dir, then we need to truncate
        if (path[i] !== possible_path[i]) {
          possible_path = path.slice(0, i);
          console.log('checked', path);
          console.log(possible_path);
          break;
        }
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  var old_path = possible_path.join(sep);

  console.log(all_rows.length);

  old_path = await get_input('Original Song Directory Path', 'This is our guess of your original song folder, modify it if not correct:', old_path);
  if (old_path[old_path.length - 1] != sep) old_path += sep;
  log('Old song path is ' + old_path);

  var new_path = await get_input('New Song Directory Path', 'Enter the new absolute song folder path you want to use:', old_path);
  if (new_path[new_path.length - 1] != sep) new_path += sep;
  log('New song path is ' + new_path);

  log('Updating chart paths...');

  var charts_to_flush = [];
  var flush_charts = async function flush_charts(table) {
    var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (charts_to_flush.length === 0) return;

    var ps = {};
    var q = 'UPDATE ' + table + ' SET path = (case ';
    var or = '';
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = charts_to_flush[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var c = _step4.value;

        var _c = _slicedToArray(c, 2),
            id = _c[0],
            path = _c[1];

        q += 'when rowid=' + id + ' then $path' + id + ' ';
        or += 'or rowid=' + id + ' ';
        ps['$path' + id] = path;
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    q += 'end) where ' + or.slice(3);
    console.log(q);
    charts_to_flush.length = 0;
    await query(q, ps);
  };

  var update_count = 0;

  var folder_updates = {};

  // Update charts in chunks
  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = all_rows[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var _row = _step5.value;

      var _row2 = _slicedToArray(_row, 3),
          id = _row2[0],
          _path = _row2[1],
          fid = _row2[2];

      if (!_path.startsWith(old_path)) continue;

      // Get new path by replacing old
      var updated_path = new_path + _path.slice(old_path.length);

      if (!(fid in folder_updates)) {
        // Remove last part of path to get folder
        var folder_path = updated_path.split(sep).slice(0, -1).join(sep);
        folder_updates[fid] = folder_path;
      }

      update_count++;

      charts_to_flush.push([id, updated_path]);
      if (charts_to_flush.length >= 100) {
        flush_charts('Charts');
      }
    }
  } catch (err) {
    _didIteratorError5 = true;
    _iteratorError5 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion5 && _iterator5.return) {
        _iterator5.return();
      }
    } finally {
      if (_didIteratorError5) {
        throw _iteratorError5;
      }
    }
  }

  flush_charts('Charts');

  log('Done updating charts with new path. Updated path on ' + update_count + ' charts');

  // Update folders as well with correct paths
  update_count = 0;
  var _iteratorNormalCompletion6 = true;
  var _didIteratorError6 = false;
  var _iteratorError6 = undefined;

  try {
    for (var _iterator6 = Object.entries(folder_updates)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
      var f = _step6.value;

      charts_to_flush.push(f);
      update_count++;
      if (charts_to_flush.length >= 100) {
        flush_charts('Folders');
      }
    }
  } catch (err) {
    _didIteratorError6 = true;
    _iteratorError6 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion6 && _iterator6.return) {
        _iterator6.return();
      }
    } finally {
      if (_didIteratorError6) {
        throw _iteratorError6;
      }
    }
  }

  flush_charts('Folders');

  log('Done updating folders with new path. Updated path on ' + update_count + ' folders');

  running = false;
});

$('#btn-download').click(async function () {
  if (!has_database || running) return;
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
});