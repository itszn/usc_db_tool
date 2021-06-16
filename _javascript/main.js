import { start_sql } from "./sql.js"
import { log, log_h, show_error } from "./log.js"
import { esc, modal, get_input } from "./util.js"

import { database_app } from "./database_app.js"
import { challenge_app } from "./challenge_app.js"
import { replay_app } from "./replay_app.js"
import { skin_app } from "./skin_fix_app.js"

function activate_app(name) {
  let e = $(`#${name}`);
  e.insertBefore(e.parent())
  e.show();
  $('#apps').remove();
  $('#app-select').remove();
}


function main() {
{
  const inputElement = document.getElementById("database");
  let activate = async function() {
    const file = this.files[0];

    await start_sql(file);
    activate_app('database-app')
    $('#pagetitle').text('USC Database Tool')
    database_app();
  };
  if (location.hash == '#database')
    return activate();
  inputElement.addEventListener("change", activate, false);
}

{
  let activate = async function() {
    activate_app('challenge-app')
    $('#pagetitle').text('USC Challenge Creator')
    challenge_app();
  }
  if (location.hash == '#challenge') activate();
  $('#newchal').click(activate);
}

{
  let activate = async function() {
    activate_app('skin-app')
    $('#pagetitle').text('USC Outdated Skin Fixer')
    skin_app();
  }
  if (location.hash.split('#')[1] == 'fixskin')
    return activate();
  $('#fixskin').click(activate);
}

{
const inputElement = document.getElementById("replay");
  let activate = async function() {
    const file = this.files[0];

    activate_app('replay-app')
    $('#pagetitle').text('USC Replay Tool')
    replay_app(file);
  };
  if (location.hash == '#replay')
    return activate();
  inputElement.addEventListener("change", activate, false);
}}
main();
