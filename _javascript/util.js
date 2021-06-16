
function esc(data) {
  return $('<div>').text(data).html();
}

function modal(title, body, has_cancel=true) {
  return new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
<div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p>${body}</p>
    <button class="button btno is-fullwidth">Ok</button>
    ${has_cancel?
    `<button class="button btnc is-fullwidth is-danger">Cancel</button>`
    : ``}
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

function get_file(title, body, label="", ext=false, expected_name=undefined, type=ArrayBuffer) {
  return new Promise(resolve => {
    let c = $('#modal').addClass('is-active')
    .find('.modal-content').html(`
<div class="box">
  <div class="content">
    <h3 class="is-3">${esc(title)}</h3>
    <p class="modal-body">${body}</p>
    <div class="modal-error"></div>
    <label class="file-label" style="width: 100%">
      <input class="file-input" type="file" ${ext? `accept="${ext}"`:``}>
      <span class="file-cta has-text-centered" style="width: 100%; flex-direction: column;">
        <span class="file-label">
          ${label}
        </span>
      </span>
    </label>
    <button class="button btnc is-fullwidth mt-1 is-danger">Cancel</button>
  </div>
</div>`);
    let file = undefined;
    c.find('.file-input').on('change', async function() {
      file = this.files[0];
      if (file === undefined)
        return;

      c.find('.expected-file-error').remove();
      if (expected_name && file.name !== expected_name) {
        file = undefined;
        c.find('.modal-error').append($(`<div class="expected-file-error"><strong>Please only select ${expected_name}</strong></div>`));
      }
      $('#modal').removeClass('is-active')

      const reader = new FileReader();
      reader.onload = function(evt) {
        resolve(evt.target.result);
      }
      reader.['readAs'+(type.name || type)](file);
    });
    c.find('.btnc').click(x=>{
      $('#modal').removeClass('is-active')
      resolve(null);
    })
  });
}

function download(name, out) {
    let blob = new Blob([out]);
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.href = window.URL.createObjectURL(blob);
    a.download = name;
    a.onclick = function () {
      setTimeout(function () {
        window.URL.revokeObjectURL(a.href);
      }, 1500);
    };
    a.click();
}

export { esc, modal, get_input, modal_button_list, get_file, download }
