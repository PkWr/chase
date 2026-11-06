// Phone only: the panel is a bottom sheet. It rests at half height with the page above;
// a finger pushing up on it (handle, header or content) lifts it over the page, and only
// then does its content scroll. Pulling down at the top of the content lowers it again.
(function () {
  var p = document.getElementById('panel');
  var g = document.getElementById('grab');
  if (!p || !g || !window.matchMedia) return;
  var mq = window.matchMedia('(max-width:900px)');
  var y0 = null, h0 = 0, dragging = false, fromContent = false;

  function full() { return document.body.classList.contains('sheet-full'); }
  function setFull(v) {
    document.body.classList.toggle('sheet-full', v);
    p.style.height = '';
    p.style.transition = '';
  }
  function folded() { return p.classList.contains('collapsed'); }
  function unfold() { if (folded()) g.click(); }

  p.addEventListener('touchstart', function (e) {
    if (!mq.matches || document.body.classList.contains('popped')) return;
    y0 = e.touches[0].clientY;
    h0 = p.getBoundingClientRect().height;
    dragging = false;
    fromContent = !e.target.closest('.cp-grab, .cp-head');
  }, { passive: true });

  p.addEventListener('touchmove', function (e) {
    if (y0 === null || !mq.matches) return;
    var dy = e.touches[0].clientY - y0;
    if (!dragging) {
      if (Math.abs(dy) < 8) return;
      // Content scrolls itself once the sheet is full and not at the top (or moving up).
      if (fromContent && full() && !(p.scrollTop <= 0 && dy > 0)) { y0 = null; return; }
      if (fromContent && folded()) { y0 = null; return; }
      dragging = true;
      p.style.transition = 'none';
    }
    e.preventDefault();
    var max = window.innerHeight * 0.9;
    p.style.height = Math.max(120, Math.min(max, h0 - dy)) + 'px';
  }, { passive: false });

  p.addEventListener('touchend', function () {
    if (y0 === null) return;
    y0 = null;
    if (!dragging) return;
    dragging = false;
    var h = p.getBoundingClientRect().height, vh = window.innerHeight;
    p.style.transition = '';
    if (h < vh * 0.3) { setFull(false); p.style.height = ''; if (!folded()) g.click(); return; }
    unfold();
    setFull(h > vh * 0.68);
    p.style.height = '';
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 250);
  });
})();
