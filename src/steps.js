// Steps for the calculator panel, as on Form: one group of controls at a time, Back and Next,
// and the specification download last. Sections carry data-step="1".."4" in index.html;
// the preview updates live throughout, so no calculation depends on the current step.
(function () {
  var titles = ['Page and margins', 'Columns and type', 'Text', 'Specification and download'];
  var step = 1;
  var back = document.getElementById('stepBack');
  var next = document.getElementById('stepNext');
  var now = document.getElementById('stepNow');
  var panel = document.querySelector('.container');
  if (!back || !next || !now || !panel) return;

  function show(n) {
    step = Math.min(titles.length, Math.max(1, n));
    document.body.setAttribute('data-step', String(step));
    now.textContent = 'Step ' + step + ' of ' + titles.length + ' · ' + titles[step - 1];
    back.disabled = step === 1;
    next.disabled = step === titles.length;
    panel.scrollTop = 0;
  }

  back.addEventListener('click', function () { show(step - 1); });
  next.addEventListener('click', function () { show(step + 1); });
  // Clicking the step label jumps back to the start, a quick way round for returning users.
  now.addEventListener('dblclick', function () { show(1); });
  show(1);
})();
