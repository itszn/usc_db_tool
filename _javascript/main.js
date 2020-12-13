import { start_sql } from "./sql.js"
import { database_app } from "./database_app.js"
import { log, log_h, show_error } from "./log.js"
import { esc, modal, get_input } from "./util.js"

const inputElement = document.getElementById("database");
inputElement.addEventListener("change", async function() {
	const file = this.files[0];
  $('#app-select').hide();

  await start_sql(file);
  $('#database-app').show();
  database_app();
}, false);

$('#newchal').click(async function() {
  $('#app-select').hide();
  $('#course-app').show();
	
});
