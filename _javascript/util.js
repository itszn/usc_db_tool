
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

export { esc, modal, get_input }
