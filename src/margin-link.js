// Link toggle for the Margins step: when on, every margin takes the value of the one being edited,
// so all margins stay equal. It works through the same input events the fields already send.
(function () {
  var section = document.querySelector('section[data-step="4"]');
  var head = section && section.querySelector('h2');
  if (!section || !head) return;
  var ids = ['topMargin', 'bottomMargin', 'leftMargin', 'rightMargin', 'innerMarginLeft', 'outerMarginLeft', 'innerMarginRight', 'outerMarginRight'];
  var linked = false;
  var busy = false;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'marginLink';
  btn.className = 'icon-btn margin-link';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'All margins equal');
  btn.title = 'All margins equal';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>';
  head.classList.add('margins-head');
  head.appendChild(btn);

  function spread(from) {
    if (busy || !from) return;
    busy = true;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el === from) return;
      el.value = from.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    busy = false;
  }

  btn.addEventListener('click', function () {
    linked = !linked;
    btn.setAttribute('aria-pressed', String(linked));
    if (linked) spread(document.getElementById('topMargin'));
  });
  section.addEventListener('input', function (e) {
    if (linked && !busy && ids.indexOf(e.target.id) >= 0) spread(e.target);
  });
})();
