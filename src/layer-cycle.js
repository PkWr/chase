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
  fromJ();
  document.addEventListener('DOMContentLoaded', fromJ);
  setTimeout(fromJ, 400);
})();
