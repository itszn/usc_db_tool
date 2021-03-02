import { get_input, modal_button_list, esc } from "./util.js"
const sha1 = require("js-sha1")

async function challenge_app() {

$('#level').on("change keypress input", function() {
  console.log(lv)
  let lv = parseInt($('#level').val());
  if (isNaN(lv))
    lv = ''
  else {
    if (lv < 1)
      lv = 1;
    if (lv > 11)
      lv = 11;
  }
  $('#level').val(lv);
  if (lv === 11)
    lv = '∞'
  $('.level-value').text(lv);
});

function get_index(el) {
  return el.parent().children().index(el);
}

let challenge = {charts:[], global:{}};
window.challenge = challenge;

async function add_chart(ident, title, level, meta) {
  let c = $('#new-chart').clone();
  c.insertBefore($('#add-chart'));
  c.find('.chart-title').text(`${title} [${level}]`);
  c.find('.chart-add-req').click(async function() {
    let chart = challenge.charts[get_index(c)-1];
    ask_for_req(chart.reqs, true, c);

  });
  c.find('.chart-remove-chart').click(function() {
    if (!confirm("Are you sure you want to remove this chart?"))
      return;
    let ind = get_index(c)-1;
    challenge.charts.splice(ind, 1);
    c.remove();
  });
  if (typeof ident === 'object') {
    c.find('.chart-ident').text('Manual');
  } else {
    c.find('.chart-ident').text(ident);
  }
  c.find('.chart-add-req').click(async function() {
    let chart = challenge.charts[get_index(c)-1];
    console.log(chart);
  });

  challenge.charts.push({
    ident:ident,
    meta:meta,
    reqs:{},
  });

  c.removeClass('hidden');
  console.log(get_index(c));
}

const reqs = [
  {id:"clear", txt:"Require clear to pass", type:'bool', opt:true, val:true},
  {id:"excessive_gauge", txt:"Play on excessive", type:'bool', val:true},
  {id:"ars", txt:"Force ARS (gauge fallback)", type:'bool', val:true},
  {
    id:"min_average_percentage", type:'int',
    txt:"Require average clear %",
    ftxt:"At least {0}% average clear",
    overrideable: false,
  },
  {
    id:"min_percentage", type:'int',
    txt:"Require clear % per chart",
    otxt:"Require clear %",
    ftxt:"{0}% clear per chart",
    oftxt:"At least {0}% clear"
  },
  {
    id:"min_chain", type:'int',
    txt:"Require minimum chain",
    ftxt:"At least {0} chain"
  },
  {
    id:"max_errors", type:'int',
    txt:"Max number of errors per chart",
    otxt:"Max number of errors",
    ftxt:"No more than {0} errors"
  },
  {
    id:"min_overall_errors", type:'int',
    txt:"Maximum number of errors",
    ftxt:"{0} errors or less",
    overrideable: false,
  },
  {
    id:"max_nears", type:'int',
    txt:"Max number of nears per chart",
    otxt:"Max number of nears",
    ftxt:"No more than {0} nears"
  },
  {
    id:"min_overall_nears", type:'int',
    txt:"Maximum number of nears",
    ftxt:"{0} nears or less",
    overrideable: false,
  },
  {
    id:"min_gauge", type:'int',
    txt:"Require minimum gauge %",
    ftxt:"Gauge of at least {0}%",
    trans: p => p/100,
  },
  {
    id:"min_average_gauge", type:'int',
    txt:"Minimum average gauge %",
    ftxt:"At least {0}% average gauge",
    trans: p => p/100,
    overrideable: false,
  },
  {
    id:"use_sdvx_complete_percentage", type:'bool',
    txt:"Use SDVX style completion % for fails",
    opt: true,
    overrideable: false
  },
  {
    id:"mirror", type:'bool',
    txt:"Mirror Mode Enabled",
    opt:true
  },
  {id:"clear", txt:"Do not require clear to pass", type:'bool', opt:true, val:false},
  {id:"excessive_gauge", txt:"Use effective gauge", type:'bool', opt:true, val:false, isDefault: true},
  {id:"allow_ars", txt:"Allow player to use ARS (gauge fallback)", type:'bool', val:true, isDefault: true},
  {id:"allow_ars", txt:"Do Not Allow player to use ARS (gauge fallback)", type:'bool', val:false},
  {id:"allow_excessive", txt:"Allow player to use excessive gauge", type:'bool', val:true, isDefault: true},
  {id:"allow_excessive", txt:"Do Not Allow player to use excessive gauge", type:'bool', val:false},
]


function add_req(cur, req_, val, override, el) {
  cur[req_.id] = {val:val, req:req_};

  let rl = el.find('.req-list');
  rl.empty();

  for (let req of reqs) {
    if (!(req.id in cur))
      continue

    if (req.val !== undefined) {
      if (cur[req.id].val !== req.val)
        continue;
    }

    let c = el.find('.new-req').clone();
    c.removeClass('hidden');
    c.removeClass('new-req');
    let cur_req = req;
    c.find('.remove-req').click(function() {
      delete cur[cur_req.id];
      c.remove();
      console.log(cur);
    });

    let text = (override && req.otxt)? req.otxt : req.txt;
    let ftext = (override && req.otxt)? req.oftxt : req.ftxt;
    if (ftext) {
      text = ftext.replace('{0}',cur[req.id].val);
    }
    c.find('.req-text').text(text);
    rl.append(c);
  }
}
async function ask_for_req(cur, override, el) {
  let opts = [];
  for (let r of reqs) {
    let req = r;
    if (req.id in cur)
      continue;
    if (override && r.overrideable===false)
      continue;
    if (r.isDefault) {
      if (!override)
        continue;
    }
    let title = (override && req.otxt)? req.otxt : req.txt
    opts.push({
      title: title,
      f: async function(resolve) {
        let val = req.val;
        if (val === undefined) {
          val = true;
          if (req.type === 'int') {
            val = parseInt(await get_input("Enter value",`Enter value for <code>${title}</code>`,'','',true));
          }
        }
        add_req(cur, req, val, override, el);
        resolve();
      }
    });
  }
  modal_button_list("Select Option To Add",`Select option to add to ${override?'this chart':'this challenge'}:`,opts)
}

$('.global-add-req').click(async function() {
  ask_for_req(challenge.global, false, $('#global-reqs'));

  
});

$('#add-chart').click(async function() {
  let p = modal_button_list(
    "Add Chart",
    `There are a few ways to specify charts, select from below:</p>

     <div class="file mt-3" style="width: 100%">
      <label class="file-label fullwidth">
        <input id="input-chart" class="file-input" type="file" accept=".ksh">
        <span class="file-cta has-text-centered fullwidth has-background-white" style="flex-direction: column;">
          <span class="file-label">Use specific .ksh file hash</span>
        </span>
      </label>
     </div>

     <p class="hidden">`,
    [
      {
        title:"Enter chart title and level manually",
        f:async function(resolve) {
          let name = await get_input(
            'Add Manual Chart',
            'Enter the chart title:','','Chart Title');
          if (name === null)
            return resolve(null);
          let level = await get_input(
            'Add Manual Chart',
            `Enter level of <b>${esc(name)}</b>:`,'','Chart Level',true);
          if (level === null)
            return resolve(null);
          add_chart({name:name, level:parseInt(level)},
                    name, level, {title:name, level:level})
          resolve();
        }
      },
      {
        title:"Enter .ksh path",
        f:async function(resolve) {
          let name = '';
          while (true) {
            name = await get_input(
              'Add Manual Chart',
              'Enter the path to chart (including folders after your song directory).<br/><br/>Example:<br/>Chart is at <code>C:\\Users\\amanda\\sdvx\\songs\\SDVX V Vivid Wave\\666\\mxm.ksh</code>,<br/>You would enter "SDVX V Vivid Wave\\666\\mxm.ksh"'+(name===''?'':'<br/><b>Must be a .ksh file</b>'),
              name,
              'Chart Path');
            if (name === null)
              return resolve(null);
            if (name.lastIndexOf('.ksh') === name.length-4)
              break;
          }
          let title;
          let level;
          if (name.indexOf('/') !== -1) {
            title = name.split('/').slice(-2);
          } else {
            title = name.split('\\').slice(-2);
          }
          console.log(title)
          level = title[1].slice(0,-4);
          title = title[0];

          add_chart(name, title, level, {title:title});
          resolve();
        }
      },
    ],
    // After making the modal
    async function(resolve) {
      $('#input-chart')[0].addEventListener("change", async function() {
        $('#modal').removeClass('is-active');
        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function(evt) {
          let data = evt.target.result
          let hash = sha1(data)

          reader.onload = function(evt) {
            let chart_meta = {};
            let lines = evt.target.result.split('\n--',1)[0].split('\n');
            for (let l of lines) {
              l = l.replace('\r','')
              let key = l.split('=',1)[0];
              let val = l.slice(key.length+1);
              chart_meta[key] = val;
            }
            console.log(chart_meta);
            add_chart(hash, chart_meta.title, chart_meta.level, chart_meta);
            resolve();
          }
          reader.readAsText(file);
        }
        reader.readAsArrayBuffer(file);
      });
    }
  )

});

$('#download').click(async function() {

  if ($('#title').val() == '') {
    $('#title').focus();
    return;
  }

  if (challenge.charts.length == 0)
    return;

  let level = parseInt($('#level').val());
  if (isNaN(level))
    level = 1;

  let data = {
    title: $('#title').val(),
    level: level,
    charts: [],
    global: {},
    overrides: []
  };


  for (let t of Object.entries(challenge.global)) {
    let [id, obj] = t;
    let val = obj.val;
    if (obj.req.trans) {
      val = obj.req.trans(val);
    }
    data.global[id] = obj.val;
  }
  for (let chart of challenge.charts) {
    data.charts.push(chart.ident);

    let over = {};
    for (let t of Object.entries(chart.reqs)) {
      console.log(t);
      let [id, obj] = t;
      let val = obj.val;
      if (obj.req.trans) {
        val = obj.req.trans(val);
      }
      over[id] = obj.val;
    }
    console.log(over);
    data.overrides.push(over);
    console.log(data, data.overrides);
  }
  let file_data = JSON.stringify(data, null, 2);

  var a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(file_data));
  a.setAttribute('download', data.title+'.chal');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

add_req(challenge.global, reqs[0], true, false, $('#global-reqs'));
//add_req(challenge.global, {id:'excessive_gauge'}, false, false, $('#global-reqs'));
}

export { challenge_app }
