function log(msg) {
  $('#log').append(msg+'\n');
}
function log_h(msg) {
  $('#log').append($(msg+'<br/>'));
}
function show_error(msg) {
  $('#errormsg').text(msg).show();
  throw msg;
}
function clear_error() {
  $('#errormsg').hide();
}

export { log, log_h, show_error, clear_error }
