import { start_sql } from "./sql.js"
import { log, log_h, show_error } from "./log.js"
import { esc, modal, get_input } from "./util.js"

import { database_app } from "./database_app.js"
import { challenge_app } from "./challenge_app.js"

function activate_app(name) {
  let e = $(`#${name}`);
  e.insertBefore(e.parent())
  e.show();
  $('#apps').remove();
  $('#app-select').remove();
}

const inputElement = document.getElementById("database");
inputElement.addEventListener("change", async function() {
	const file = this.files[0];

  await start_sql(file);
  activate_app('database-app')
  $('#pagetitle').text('USC Database Tool')
  database_app();
}, false);

$('#newchal').click(async function() {
  activate_app('challenge-app')
  $('#pagetitle').text('USC Challenge Creator')
  challenge_app();
});
