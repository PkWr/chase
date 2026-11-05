// Start screen, as on Form: a black screen with an open button; the About drawer slides out from the yellow strip.
// Shown when the address has no query string; opening it reveals the calculator underneath.
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('show-start')) return;
  var drawer = document.getElementById('startDrawer');
  var strip = document.getElementById('startStrip');
  var screen = document.getElementById('startScreen');

  // Marquee: a second copy follows the first so the loop is seamless; speed is set from the height.
  (function () {
    var inner = document.querySelector('.start-scroll-inner'), loop = inner && inner.querySelector('.start-loop');
    if (!loop) return;
    var copy = loop.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    inner.appendChild(copy);
    function speed() { var sz = parseFloat(getComputedStyle(inner.parentNode).fontSize) || 16; inner.style.animationDuration = Math.max(120, loop.offsetHeight / (sz * 0.25)) + 's'; }
    speed();
    window.addEventListener('resize', speed);
  })();

  function open() {
    if (!root.classList.contains('show-start')) return;
    root.classList.add('start-leaving');
    setTimeout(function () { root.classList.remove('show-start', 'start-leaving'); }, 500);
  }
  function setAbout(on) {
    drawer.classList.toggle('is-open', on);
    strip.setAttribute('aria-expanded', String(on));
  }

  // The text itself is the way in: click or press Enter.
  var scroller = document.querySelector('.start-scroll');
  scroller.addEventListener('click', open);
  scroller.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

  // Phones fire a pretend rollover around a tap; ignore those so the tap decides.
  var lastTouch = 0;
  var openedAt = 0;
  window.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') lastTouch = Date.now(); }, true);
  var touchy = function () { return Date.now() - lastTouch < 800; };
  strip.addEventListener('mouseenter', function () {
    if (!touchy() && !drawer.classList.contains('is-open')) { openedAt = Date.now(); setAbout(true); }
  });
  drawer.addEventListener('mouseleave', function () { if (!touchy()) setAbout(false); });
  scroller.addEventListener('mouseenter', function () { if (!touchy()) setAbout(false); });
  strip.addEventListener('click', function () {
    if (Date.now() - openedAt < 400) return;
    setAbout(!drawer.classList.contains('is-open'));
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setAbout(false); });
  screen.addEventListener('pointerdown', function (e) { if (!drawer.contains(e.target)) setAbout(false); });
})();
