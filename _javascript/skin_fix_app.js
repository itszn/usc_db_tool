import { log, log_h, show_error } from "./log.js"
import { download, get_file, esc, modal, get_input } from "./util.js"

const fixes = {
  async gauge_fix() {
    location.hash = 'fixskin#gauge_fix';
    let txt = await get_file(
      'Open scripts\\gameplay.lua',
      'We can hopefully fix this by modifying <code>scripts\\gameplay.lua</code><br/>Just to be safe, you should make a copy of the file first',
      'Select scripts\\gameplay.lua',
      '.lua',
      'gameplay.lua',
      Text);
    if (txt === null) {
      location.hash = 'fixskin';
      return;
    }

    let did_anything = false;
    let out = txt.replaceAll(/gameplay\.gauge(?!Type|\.)/mg,(x,y,z)=>{
      did_anything = true;
      return 'gameplay.gauge.value';
    });
    out = txt.replaceAll(/gameplay\.gaugeType/mg,(x,y,z)=>{
      did_anything = true;
      return 'gameplay.gauge.type';
    });

    if (did_anything) {
      download('gameplay.lua',out);
    }
    else {
      modal(
        "Error Fixing Script",
        `No matching issue found. Your skin probably can't be fixed automaticly, sorry.`, false);
    }
  },

  async flags_fix() {
    location.hash = 'fixskin#flags_fix';
    let txt = await get_file(
      'Open scripts\\result.lua',
      'We can hopefully fix this by modifying <code>scripts\\result.lua</code><br/>Just to be safe, you should make a copy of the file first',
      'Select scripts\\result.lua',
      '.lua',
      'result.lua',
      Text);
    if (txt === null) {
      location.hash = 'fixskin';
      return;
    }
    let did_anything = false;
    let out = txt.replaceAll(/result.flags\s*&\s*2?/mg,()=>{
      did_anything = true;
      return 'result.mirror'
    });
    out = txt.replaceAll(/result.flags\s*&\s*3?/mg,()=>{
      did_anything = true;
      return 'result.random'
    });
    out = txt.replaceAll(/result.flags(\s*&\s*1)?/mg,(m,op)=>{
      did_anything = true;
      return 'result.gauge_type';
    });
    if (did_anything) {
      download('result.lua',out);
    }
    else {
      modal(
        "Error Fixing Script",
        `No matching issue found. Your skin probably can't be fixed automaticly, sorry.`, false);
    }
  }
}

function skin_app(file) {

  modal
  if (location.hash.length > 0) {
    let f = location.hash.split('#')[2];
    let fix = fixes[f];
    if (fix) fix();
  } else {
    location.hash = 'fixskin';
  }
  $('.fix').each((i,e)=>{
    e = $(e);
    let f = e.data('fix');
    let fix = fixes[f]
    if (!fix)
      return;
    e.click(()=>{
      fix();
    });
  });
}

export { skin_app };
