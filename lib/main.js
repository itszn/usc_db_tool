"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var wasm_supported = function () {
  try {
    if ((typeof WebAssembly === "undefined" ? "undefined" : _typeof(WebAssembly)) === "object" && typeof WebAssembly.instantiate === "function") {
      var module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
    }
  } catch (e) {}
  return false;
}();

var worker;

if (wasm_supported) {
  worker = new Worker('./lib/worker.sql-wasm.js');
} else {
  log_h('<font color="red">NOTE: Your browser does not support WASM, this tool will run much slower...</font>');
  worker = new Worker('./lib/worker.sql-asm.js');
}

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
  if (results === undefined) return null;
  return results.values[0];
}

function sql_all(results) {
  if (results === undefined) return [];
  return results.values;
}

function show_error(msg) {
  $('#errormsg').text(msg).show();
  throw msg;
}

function log(msg) {
  $('#log').append(msg + '\n');
}
function log_h(msg) {
  $('#log').append($(msg + '<br/>'));
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
      if (data.error) {
        show_error(data.error);
      }
      if (data.results) {
        cb(data.results[0]);
      }
    }
  };

  query('SELECT version from Database').then(sql_first).then(function (res) {
    var _res = _slicedToArray(res, 1),
        ver = _res[0];

    if (ver != 14) {
      show_error("Database is version " + ver + ". This app only supports databases with version 14");
      throw "Bad version";
    }

    has_database = true;

    $('#actions').show();
    log("USC Database loaded (version " + ver + ")");
  });
};

function esc(data) {
  return $('<div>').text(data).html();
}

function modal(title, body) {
  return new Promise(function (resolve) {
    var c = $('#modal').addClass('is-active').find('.modal-content').html("\n<div class=\"box\">\n  <div class=\"content\">\n    <h3 class=\"is-3\">" + esc(title) + "</h3>\n    <p>" + body + "</p>\n    <button class=\"button is-fullwidth\">Ok</button>\n  </div>\n</div>");
    c.find('button').click(function (x) {
      $('#modal').removeClass('is-active');
      resolve();
    });
  });
}

function get_input(title, body) {
  var val = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

  return new Promise(function (resolve) {
    var c = $('#modal').addClass('is-active').find('.modal-content').html("\n<div class=\"box\">\n  <div class=\"content\">\n    <h3 class=\"is-3\">" + esc(title) + "</h3>\n    <p>" + esc(body) + "</p>\n    <input class=\"input\" type=\"text\">\n    <button class=\"button is-fullwidth\">Ok</button>\n  </div>\n</div>");
    c.find('button').click(function (x) {
      $('#modal').removeClass('is-active');
      resolve(c.find('input')[0].value);
    });
    c.find('input')[0].value = val;
  });
}

$('#btn-stats-folders').click(function () {
  (async function () {
    if (!has_database || running) return;

    running = true;

    var _ref = await find_folders(),
        _ref2 = _slicedToArray(_ref, 2),
        dirs = _ref2[0],
        base_dir = _ref2[1];

    dirs = Array.from(dirs.values());
    console.log(dirs);

    var body = '';
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = dirs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var f = _step.value;

        body += "\n<div class=\"field\">\n<label class=\"checkbox\">\n  <input type=\"checkbox\" checked>\n  " + esc(f) + "\n</label>\n</div>";
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

    await modal('Select Folders To Collect Stats For', body);

    var ops = $('#modal').find('input');
    console.log(dirs);
    console.log(ops);

    var where = [];
    for (var i = 0; i < dirs.length; i++) {
      var o = ops.eq(i);

      console.log(o[0], o[0].checked);
      if (!o[0].checked) continue;

      var spath = base_dir + dirs[i];

      where.push("path LIKE \"" + spath + "%\"");
    }

    console.log(where);

    if (where.length == 0) {
      await do_stats('');
      return;
    }

    where = " AND (" + where.join(' OR ') + ")";
    console.log(where);

    await do_stats(where);
  })().catch(show_error);
});

$('#btn-stats').click(function () {
  if (!has_database || running) return;

  running = true;

  do_stats();
});

function do_stats() {
  var where = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  (async function () {
    running = true;

    log("Starting stat collection. This may take a few minutes");
    if (!wasm_supported) {
      log_h('<font color="red">NOTE: Your browser does not support WASM, this tool will run much slower...</font>');
    }

    var table = $('<table>').html("\n<thead>\n  <th>Level</th>\n  <th>Average</th>\n  <th>Clear Average</th>\n  <th>Best Score</th>\n  <th># Clear</th>\n  <th># Ex Clear</th>\n  <th># UC</th>\n  <th># PUC</th>\n</thead>\n<tbody>\n</tbody>");
    var body = table.find('tbody');
    $('#log').append(table);

    var prog = $('<progress value="0" max="4" style="width:100%"></progress>');
    $('#log').append(prog);

    var volforce = $('<div>0 VF</div>');
    $('#log').append(volforce);

    var low_best_vol = 0;
    var best_vol = [];

    for (var level = 20; level >= 10; level--) {
      prog.attr('value', '0');

      // Get all charts and their max scores
      var raw_scores = await query("SELECT hash, (SELECT max(s.score) from Scores s where s.chart_hash=hash) from Charts where level=" + level + " " + where).then(sql_all);
      console.log(raw_scores);

      var scores = {};
      var best_score = 0;
      var best_hash = '';
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = raw_scores[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var row = _step2.value;

          var _row = _slicedToArray(row, 2),
              hash = _row[0],
              max_score = _row[1];

          if (max_score === null) continue;

          if (max_score > best_score) {
            best_score = max_score;
            best_hash = hash;
          }

          scores[hash] = {
            score: max_score,
            badge: max_score === 10000000 ? 'puc' : 'f' // Fail will be updated below,
          };
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

      prog.attr('value', '1');

      if (Object.keys(scores).length === 0) {
        body.append($("<tr><td>" + level + "</td><td><b>0000</b>000</td><td><b>0000</b>000</td><td><b>0000</b>000</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>"));
        continue;
      }

      // Check if any charts have a UC
      var raw_misses = await query("SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.miss=0 limit 1) from Charts where level=" + level + " " + where).then(sql_all);
      console.log(raw_misses);

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = raw_misses[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _row2 = _step3.value;

          var _row3 = _slicedToArray(_row2, 2),
              hash = _row3[0],
              is_uc = _row3[1];

          if (is_uc !== 1) continue;

          var chart = scores[hash];
          if (chart.badge != 'f') // If already puc, skip
            continue;

          chart.badge = 'uc';
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

      prog.attr('value', '2');

      // Check if any charts were using excessive
      var raw_ex = await query("SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.gameflags&1=1 and s.gauge>0 limit 1) from Charts where level=" + level + " " + where).then(sql_all);
      console.log(raw_ex);

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = raw_ex[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var _row4 = _step4.value;

          var _row5 = _slicedToArray(_row4, 2),
              hash = _row5[0],
              is_hc = _row5[1];

          if (is_hc !== 1) continue;

          var _chart = scores[hash];
          if (_chart.badge != 'f') // If already puc or uc, skip
            continue;

          _chart.badge = 'hc';
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

      prog.attr('value', '3');

      // Check if any charts were cleared
      var raw_c = await query("SELECT hash, (SELECT 1 from Scores s where s.chart_hash=hash and s.gameflags&1=0 and s.gauge>0.7 limit 1) from Charts where level=" + level + " " + where).then(sql_all);
      console.log(raw_c);

      prog.attr('value', '4');

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = raw_c[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _row6 = _step5.value;

          var _row7 = _slicedToArray(_row6, 2),
              hash = _row7[0],
              is_c = _row7[1];

          if (is_c !== 1) continue;

          var _chart2 = scores[hash];
          if (_chart2.badge != 'f') // If already puc or uc, skip
            continue;

          _chart2.badge = 'c';
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

      var avg_list = function avg_list(l) {
        if (l.length === 0) return 0;
        return l.reduce(function (a, b) {
          return a + b;
        }) / l.length;
      };

      console.log("Calcing");

      var score_list = Object.values(scores);

      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = score_list[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var _puc$uc$hc$hc$c$f$s$b;

          var s = _step6.value;


          var grade = 0.80;
          if (s.score >= 9900000) grade = 1.05;else if (s.score >= 9800000) grade = 1.02;else if (s.score >= 9700000) grade = 1.00;else if (s.score >= 9500000) grade = 0.97;else if (s.score >= 9300000) grade = 0.94;else if (s.score >= 9000000) grade = 0.91;else if (s.score >= 8700000) grade = 0.88;else if (s.score >= 7500000) grade = 0.85;else if (s.score >= 6500000) grade = 0.82;

          var clear = (_puc$uc$hc$hc$c$f$s$b = {
            puc: 1.10,
            uc: 1.05,
            hc: 1.00
          }, _defineProperty(_puc$uc$hc$hc$c$f$s$b, "hc", 1.02), _defineProperty(_puc$uc$hc$hc$c$f$s$b, "c", 1.00), _defineProperty(_puc$uc$hc$hc$c$f$s$b, "f", 0.50), _puc$uc$hc$hc$c$f$s$b)[s.badge];

          var vol = level * 2 * (s.score / 10000000) * grade * clear;
          vol = parseInt(vol) / 100;
          if (best_vol.length < 50 || low_best_vol < vol) {
            best_vol.push(vol);
            if (best_vol.length > 50) {
              best_vol = best_vol.sort().slice(-50);
              low_best_vol = best_vol[0];
            }
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

      var total_vol = best_vol.reduce(function (a, b) {
        return a + b;
      });
      total_vol = parseInt(total_vol * 1000) / 1000;
      volforce.text(total_vol + " VF");

      var avg = avg_list(score_list.map(function (x) {
        return x.score;
      }));
      var clr_avg = avg_list(score_list.filter(function (x) {
        return x.badge !== 'f';
      }).map(function (x) {
        return x.score;
      }));
      var badges = {};
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = score_list[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var score = _step7.value;

          var b = score.badge;
          badges[b] = (badges[b] ? badges[b] : 0) + 1;
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7.return) {
            _iterator7.return();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      var nums = function nums(n) {
        n = parseInt(n);
        if (n === 10000000) return '<b>10000</b>000';
        n = n.toString();
        n = '0'.repeat(7 - n.length) + n;
        return "<b>" + n.slice(0, 4) + "</b>" + n.slice(4);
      };

      body.append($("\n<tr>\n  <td>" + level + "</td>\n  <td>" + nums(avg) + "</td>\n  <td>" + nums(clr_avg) + "</td>\n  <td>" + nums(best_score) + "</td>\n  <td>" + (badges.c ? badges.c : 0) + "</td>\n  <td>" + (badges.hc ? badges.hc : 0) + "</td>\n  <td>" + (badges.uc ? badges.uc : 0) + "</td>\n  <td>" + (badges.puc ? badges.puc : 0) + "</td>\n</tr>"));
    }

    prog.remove();

    running = false;
  })().catch(show_error);
}

$('#btn-dump').click(function () {
  (async function () {
    if (!has_database || running) return;
    running = true;

    await query('SELECT path from Charts limit 20').then(sql_all).then(function (res) {
      log("Path of first 20 charts:");
      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        for (var _iterator8 = res[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var r = _step8.value;

          log(r);
        }
      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8.return) {
            _iterator8.return();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }
    });
    await query('SELECT path from Folders limit 20').then(sql_all).then(function (res) {
      log("Path of first 20 folders:");
      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = res[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var r = _step9.value;

          log(r);
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9.return) {
            _iterator9.return();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }
    });

    running = false;
  })().catch(show_error);
});

async function find_folders(all_rows) {
  if (all_rows === undefined) all_rows = await query('SELECT rowid, path, folderid from Charts').then(sql_all);

  var _ref3 = await find_base_path(all_rows),
      _ref4 = _slicedToArray(_ref3, 2),
      base_dir = _ref4[0],
      sep = _ref4[1];

  log("Base dir is " + base_dir);

  var dirs = new Set();

  var _iteratorNormalCompletion10 = true;
  var _didIteratorError10 = false;
  var _iteratorError10 = undefined;

  try {
    for (var _iterator10 = all_rows[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
      var row = _step10.value;

      var path = row[1];
      path = path.slice(base_dir.length);
      path = path.split(sep)[0];
      dirs.add(path);
    }
  } catch (err) {
    _didIteratorError10 = true;
    _iteratorError10 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion10 && _iterator10.return) {
        _iterator10.return();
      }
    } finally {
      if (_didIteratorError10) {
        throw _iteratorError10;
      }
    }
  }

  return [dirs, base_dir];
}

async function find_base_path(all_rows) {
  if (all_rows === undefined) all_rows = await query('SELECT rowid, path, folderid from Charts').then(sql_all);

  var possible_path = [];

  var sep = all_rows[0][1][0] === '/' ? '/' : '\\';

  var _iteratorNormalCompletion11 = true;
  var _didIteratorError11 = false;
  var _iteratorError11 = undefined;

  try {
    for (var _iterator11 = all_rows[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
      var row = _step11.value;

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
    _didIteratorError11 = true;
    _iteratorError11 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion11 && _iterator11.return) {
        _iterator11.return();
      }
    } finally {
      if (_didIteratorError11) {
        throw _iteratorError11;
      }
    }
  }

  return [possible_path.join(sep), sep];
}

$('#btn-paths').click(function () {
  (async function () {
    if (!has_database || running) return;
    running = true;

    log('Finding main song folder');

    var all_rows = await query('SELECT rowid, path, folderid from Charts').then(sql_all);

    var _ref5 = await find_base_path(all_rows),
        _ref6 = _slicedToArray(_ref5, 2),
        old_path = _ref6[0],
        sep = _ref6[1];

    old_path = await get_input('Original Song Directory Path', 'This is our guess of your original song folder, modify it if not correct:', old_path);
    if (old_path[old_path.length - 1] != sep) old_path += sep;
    log("Old song path is " + old_path);

    var new_path = await get_input('New Song Directory Path', 'Enter the new absolute song folder path you want to use:', old_path);
    if (new_path[new_path.length - 1] != sep) new_path += sep;
    log("New song path is " + new_path);

    log('Updating chart paths...');

    var charts_to_flush = [];
    var flush_charts = async function flush_charts(table) {
      var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (charts_to_flush.length === 0) return;

      var ps = {};
      var q = "UPDATE " + table + " SET path = (case ";
      var or = '';
      var _iteratorNormalCompletion12 = true;
      var _didIteratorError12 = false;
      var _iteratorError12 = undefined;

      try {
        for (var _iterator12 = charts_to_flush[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
          var c = _step12.value;

          var _c = _slicedToArray(c, 2),
              id = _c[0],
              path = _c[1];

          q += "when rowid=" + id + " then $path" + id + " ";
          or += "or rowid=" + id + " ";
          ps["$path" + id] = path;
        }
      } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion12 && _iterator12.return) {
            _iterator12.return();
          }
        } finally {
          if (_didIteratorError12) {
            throw _iteratorError12;
          }
        }
      }

      q += "end) where " + or.slice(3);
      console.log(q);
      charts_to_flush.length = 0;
      await query(q, ps);
    };

    var update_count = 0;

    var folder_updates = {};

    // Update charts in chunks
    var _iteratorNormalCompletion13 = true;
    var _didIteratorError13 = false;
    var _iteratorError13 = undefined;

    try {
      for (var _iterator13 = all_rows[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
        var row = _step13.value;

        var _row8 = _slicedToArray(row, 3),
            id = _row8[0],
            path = _row8[1],
            fid = _row8[2];

        if (!path.startsWith(old_path)) continue;

        // Get new path by replacing old
        var updated_path = new_path + path.slice(old_path.length);

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
      _didIteratorError13 = true;
      _iteratorError13 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion13 && _iterator13.return) {
          _iterator13.return();
        }
      } finally {
        if (_didIteratorError13) {
          throw _iteratorError13;
        }
      }
    }

    flush_charts('Charts');

    log("Done updating charts with new path. Updated path on " + update_count + " charts");

    // Update folders as well with correct paths
    update_count = 0;
    var _iteratorNormalCompletion14 = true;
    var _didIteratorError14 = false;
    var _iteratorError14 = undefined;

    try {
      for (var _iterator14 = Object.entries(folder_updates)[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
        var f = _step14.value;

        charts_to_flush.push(f);
        update_count++;
        if (charts_to_flush.length >= 100) {
          flush_charts('Folders');
        }
      }
    } catch (err) {
      _didIteratorError14 = true;
      _iteratorError14 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion14 && _iterator14.return) {
          _iterator14.return();
        }
      } finally {
        if (_didIteratorError14) {
          throw _iteratorError14;
        }
      }
    }

    flush_charts('Folders');

    log("Done updating folders with new path. Updated path on " + update_count + " folders");

    running = false;
  })().catch(show_error);
});

$('#btn-download').click(function () {
  (async function () {
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
  })().catch(show_error);
});