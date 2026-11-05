// Columns and text box as one visual control: one icon per column, a plus (and minus) to change the
// number of columns, and click to choose which columns the text box covers. Clicking a column outside
// the selection extends it; clicking an end column of the selection shortens it; clicking inside
// selects that column alone. The number input and the two range sliders stay in the page, hidden, as
// the single source of truth for ui.js; this file draws from them and sets them from clicks.
(function () {
  var MAX = 12;
  var slider = document.getElementById('textStartSlider');
  var spanSlider = document.getElementById('columnSpanSlider');
  var numCols = document.getElementById('numCols');
  if (!slider || !spanSlider || !numCols) return;

  ['numColsGroup', 'spanGroup'].forEach(function (id) {
    var g = document.getElementById(id);
    if (g) g.classList.add('visually-hidden-control');
  });
  slider.closest('.slider-container').classList.add('visually-hidden-control');

  var host = document.createElement('div');
  host.id = 'startPicker';
  host.className = 'start-picker';
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', 'Columns and text box');
  slider.closest('.slider-container').parentNode.insertBefore(host, slider.closest('.slider-container'));
  var help = document.getElementById('startPickerHelp');

  function read() {
    var n = Math.max(1, parseInt(numCols.value, 10) || 1);
    var span = Math.max(1, Math.min(n, parseInt(spanSlider.value, 10) || n));
    var start = Math.max(1, Math.min(n - span + 1, parseInt(slider.value, 10) || 1));
    return { n: n, span: span, start: start };
  }

  var last = '';
  function render() {
    var r = read();
    var sig = r.n + ':' + r.span + ':' + r.start;
    if (sig === last) return; // unchanged: keep the buttons, so a click in progress is not lost
    last = sig;
    var lab = document.getElementById('startPickerLabel');
    var endCol = r.start + r.span - 1;
    if (lab) lab.textContent = 'Columns';
    if (help) {
      help.textContent = 'Text box: ' + (r.span > 1 ? 'columns ' + r.start + '\u2013' + endCol : 'column ' + r.start) + '. Tap columns to resize it.';
    }
    host.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'start-ctrl';
    var colsRow = document.createElement('div');
    colsRow.className = 'start-cols';
    host.appendChild(head);
    host.appendChild(colsRow);
    var cnt = document.createElement('span');
    cnt.className = 'start-count';
    cnt.setAttribute('aria-live', 'polite');
    cnt.textContent = String(r.n);
    [['minus', '\u2212', 'Remove a column', r.n <= 1], ['plus', '+', 'Add a column', r.n >= MAX]].forEach(function (d) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'start-col start-' + d[0];
      c.dataset.act = d[0];
      c.title = d[2];
      c.setAttribute('aria-label', d[2]);
      c.disabled = d[3];
      c.textContent = d[1];
      head.appendChild(c);
      if (d[0] === 'minus') head.appendChild(cnt);
    });
    for (var k = 1; k <= r.n; k++) {
      var b = document.createElement('button');
      b.type = 'button';
      var on = k >= r.start && k < r.start + r.span;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', 'Column ' + k + (on ? ', in the text box' : ''));
      b.title = 'Column ' + k;
      b.dataset.col = String(k);
      b.className = 'start-col' + (on ? ' has-text' : '');
      b.innerHTML = '<span class="n">' + k + '</span>';
      colsRow.appendChild(b);
    }
  }

  function fire(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }

  function setColumns(n) {
    numCols.value = String(n);
    fire(numCols);
    numCols.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setSelection(start, span) {
    spanSlider.value = String(span);
    fire(spanSlider);
    slider.value = String(start);
    fire(slider);
    last = '';
    render();
  }

  host.addEventListener('click', function (e) {
    var b = e.target.closest('.start-col');
    if (!b) return;
    var r = read();
    if (b.dataset.act === 'plus') {
      if (r.n < MAX) {
        // Going from one column to several: type defaults to left aligned (justified text in narrow columns opens up gaps)
        if (r.n === 1) {
          var left = document.getElementById('alignLeft');
          var just = document.getElementById('alignJustify');
          if (left && just && just.checked) left.click();
        }
        setColumns(r.n + 1);
        setTimeout(function () { last = ''; render(); }, 0);
      }
      return;
    }
    if (b.dataset.act === 'minus') {
      if (r.n > 1) {
        var n2 = r.n - 1;
        setColumns(n2);
        // keep the text box inside the remaining columns
        var st = Math.min(r.start, n2);
        setSelection(st, Math.min(r.span, n2 - st + 1));
      }
      return;
    }
    var k = parseInt(b.dataset.col, 10);
    var end = r.start + r.span - 1;
    if (k < r.start) setSelection(k, end - k + 1);
    else if (k > end) setSelection(r.start, k - r.start + 1);
    else if (r.span > 1 && k === r.start) setSelection(r.start + 1, r.span - 1);
    else if (r.span > 1 && k === end) setSelection(r.start, r.span - 1);
    else setSelection(k, 1);
  });

  // Redraw when ui.js sets the controls from code (saved settings, reset, a changed column count).
  [slider, spanSlider, numCols].forEach(function (el) {
    var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { desc.set.call(this, v); render(); }
    });
    el.addEventListener('input', function () { setTimeout(render, 0); });
    el.addEventListener('change', function () { setTimeout(render, 0); });
  });
  new MutationObserver(render).observe(slider, { attributes: true, attributeFilter: ['max', 'min'] });
  window.addEventListener('load', render);
  render();
})();
