// "?" in the panel header: while help is on, tapping any control that has a tooltip
// shows its text in the panel instead of using it. Hover tooltips are not reachable on touch.
(function () {
  var link = document.getElementById('helpLink');
  var tip = document.getElementById('helpTip');
  if (!link || !tip) return;
  var on = false;
  var PROMPT = 'Help is on. Tap a control to read what it does.';
  function set(v) {
    on = v;
    document.body.classList.toggle('help-on', on);
    link.setAttribute('aria-pressed', String(on));
    tip.hidden = !on;
    tip.textContent = on ? PROMPT : '';
  }
  link.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); set(!on); });
  document.addEventListener('click', function (e) {
    if (!on) return;
    var el = e.target.closest && e.target.closest('[title]');
    if (el === link) return;
    if (el && !el.closest('#helpTip')) {
      e.preventDefault();
      e.stopPropagation();
      tip.textContent = el.getAttribute('title');
    }
  }, true);
  document.addEventListener('keydown', function (e) { if (on && e.key === 'Escape') set(false); });
})();
