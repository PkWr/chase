// "Text starts" as a visual picker: one small icon per column, click the column where the text begins.
// The range slider (#textStartSlider) stays in the page as the single source of truth for ui.js;
// this file draws the icons from it, sets it when an icon is clicked, and redraws whenever
// ui.js changes the slider, the number of columns or the span.
(function () {
  var slider = document.getElementById('textStartSlider');
  var spanSlider = document.getElementById('columnSpanSlider');
  var numCols = document.getElementById('numCols');
  if (!slider || !spanSlider || !numCols) return;

  var host = document.createElement('div');
  host.id = 'startPicker';
  host.className = 'start-picker';
  host.setAttribute('role', 'radiogroup');
  host.setAttribute('aria-label', 'Column where text starts');
  var box = slider.closest('.slider-container');
  box.parentNode.insertBefore(host, box);
  box.classList.add('visually-hidden-control');

  var last = '';
  function render() {
    var n = Math.max(1, parseInt(numCols.value, 10) || 1);
    var span = Math.max(1, Math.min(n, parseInt(spanSlider.value, 10) || n));
    var start = Math.max(1, Math.min(n, parseInt(slider.value, 10) || 1));
    var sig = n + ':' + span + ':' + start;
    if (sig === last) return; // nothing changed: keep the buttons, so a click in progress is not lost
    last = sig;
    var lab = document.getElementById('startPickerValue');
    if (lab) lab.textContent = String(start);
    host.innerHTML = '';
    for (var k = 1; k <= n; k++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(k === start));
      b.setAttribute('aria-label', 'Column ' + k);
      b.title = 'Column ' + k;
      b.dataset.col = String(k);
      if (k > n - span + 1) { b.disabled = true; b.title = 'Column ' + k + ' leaves no room for a text box that spans ' + span; }
      b.className = 'start-col' + (k >= start && k < start + span ? ' has-text' : '') + (k === start ? ' is-start' : '');
      b.innerHTML = '<span class="n">' + k + '</span>';
      host.appendChild(b);
    }
  }

  host.addEventListener('click', function (e) {
    var b = e.target.closest('.start-col');
    if (!b) return;
    slider.value = b.dataset.col;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    render();
  });

  // Redraw when ui.js sets the sliders from code (loading saved settings, changing the column count).
  [slider, spanSlider].forEach(function (el) {
    var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { desc.set.call(this, v); render(); }
    });
    el.addEventListener('input', render);
  });
  numCols.addEventListener('input', function () { setTimeout(render, 0); });
  numCols.addEventListener('change', function () { setTimeout(render, 0); });
  new MutationObserver(render).observe(slider, { attributes: true, attributeFilter: ['max', 'min'] });
  window.addEventListener('load', render);
  render();
})();
