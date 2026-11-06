// Margins and Columns icons cycle: off -> outline -> solid -> off.
(function () {
  ['showMargins', 'showColumns'].forEach(function (id) {
    var box = document.getElementById(id);
    if (!box) return;
    var label = box.closest('label');
    function sync() { if (label) label.classList.toggle('is-solid', box.dataset.solid === '1'); }
    box.addEventListener('click', function (e) {
      // The native toggle has already flipped box.checked.
      if (box.checked) { box.dataset.solid = '0'; }              // off -> outline
      else if (box.dataset.solid !== '1') { box.checked = true; box.dataset.solid = '1'; } // outline -> solid
      else { box.dataset.solid = '0'; }                           // solid -> off
      sync();
      box.dispatchEvent(new Event('change', { bubbles: true }));
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    box.addEventListener('change', sync);
    sync();
  });
})();

// Alignment icons drive the hidden #justifyText checkbox that the rest of the code reads.
(function () {
  var j = document.getElementById('justifyText'), l = document.getElementById('alignLeft'), r = document.getElementById('alignJustify');
  if (!j || !l || !r) return;
  function fromJ() { l.checked = !j.checked; r.checked = j.checked; }
  function set(v) { j.checked = v; j.dispatchEvent(new Event('change', { bubbles: true })); j.dispatchEvent(new Event('input', { bubbles: true })); }
  l.addEventListener('change', function () { if (l.checked) set(false); });
  r.addEventListener('change', function () { if (r.checked) set(true); });
  j.addEventListener('change', fromJ); // saved settings and Reset set the hidden checkbox; the icons follow it
  fromJ();
  document.addEventListener('DOMContentLoaded', fromJ);
  setTimeout(fromJ, 400);
})();

// The baseline grid icon only matters when there is more than one column.
(function () {
  var n = document.getElementById('numCols'), t = document.getElementById('baselineToggle'), box = document.getElementById('showBaseline');
  if (!n || !t || !box) return;
  function sync() {
    var multi = (parseInt(n.value, 10) || 1) > 1;
    t.hidden = !multi;
    if (!multi && box.checked) { box.checked = false; box.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  document.addEventListener('input', sync);
  document.addEventListener('change', sync);
  document.addEventListener('click', function () { setTimeout(sync, 50); });
  setTimeout(sync, 400);
})();

// Fold: Form's grab handle (.cp-grab). Same markup, labels and behaviour as Form's app.js.
(function () {
  var g = document.getElementById('grab'), p = document.getElementById('panel');
  if (!g || !p) return;
  g.onclick = function () {
    var c = p.classList.toggle('collapsed');
    g.setAttribute('aria-expanded', String(!c));
    g.setAttribute('aria-label', c ? 'Open controls' : 'Collapse controls');
    document.body.classList.toggle('cp-folded', c);
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
  };
})();

// Page mode icons drive the hidden #facingPages checkbox that the rest of the code reads.
(function () {
  var f = document.getElementById('facingPages'), one = document.getElementById('pageSingle'), two = document.getElementById('pageFacing');
  if (!f || !one || !two) return;
  function fromF() { one.checked = !f.checked; two.checked = f.checked; }
  function set(v) { f.checked = v; f.dispatchEvent(new Event('change', { bubbles: true })); f.dispatchEvent(new Event('input', { bubbles: true })); }
  one.addEventListener('change', function () { if (one.checked) set(false); });
  two.addEventListener('change', function () { if (two.checked) set(true); });
  f.addEventListener('change', fromF);
  var reset = document.getElementById('resetLink');
  if (reset) reset.addEventListener('click', function () { setTimeout(fromF, 100); });
  fromF();
  setTimeout(fromF, 400);
})();
