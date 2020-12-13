
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

function modal_button_list(title, body, buttons, after) {
  let p = new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
  <div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p>${body}</p>
    
    <div class="btn-button-list">
    </div>
    <button class="button btnc is-fullwidth is-danger mt-3">Cancel</button>
  </div>
  </div>`);
    for (let b of buttons) {
      let be = $(`<button class="button is-fullwidth mt-1 ${b.class|''}"></button>`).text(b.title);
      be.click(()=>{
        $('#modal').removeClass('is-active')
        b.f(resolve);
      });
      c.find('.btn-button-list').append(be);
    }
    c.find('.btnc').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(null);
    })

    if (after)
      after(resolve, c);
  });
}

function get_input(title, body, val="", placeholder="", number=false) {
  return new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
<div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p>${body}</p>
    <input class="input" type="${number?'number':'text'}" placeholder="${placeholder}">
    <button class="button btno is-fullwidth mt-3">Ok</button>
    <button class="button btnc is-fullwidth mt-1 is-danger">Cancel</button>
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

export { esc, modal, get_input, modal_button_list}
