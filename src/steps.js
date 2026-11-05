// Steps for the calculator panel, as on Form: one group of controls at a time, Back and Next,
// and the specification download last. Sections carry data-step="1".."4" in index.html;
// the preview updates live throughout, so no calculation depends on the current step.
(function () {
  var titles = ['Page and margins', 'Columns and type', 'Text', 'Specification and download'];
  var step = 1;
  var back = document.getElementById('stepBack');
  var next = document.getElementById('stepNext');
  var now = document.getElementById('stepNow');
  var cpNow = document.getElementById('cpNow');
  var panel = document.querySelector('.container');
  if (!back || !next || !now || !panel) return;

  function show(n) {
    step = Math.min(titles.length, Math.max(1, n));
    document.body.setAttribute('data-step', String(step));
    var label = 'Step ' + step + ' of ' + titles.length + ' · ' + titles[step - 1];
    now.textContent = label;
    if (cpNow) cpNow.textContent = label;
    back.disabled = step === 1;
    next.disabled = step === titles.length;
    panel.scrollTop = 0;
  }

  back.addEventListener('click', function () { show(step - 1); });
  next.addEventListener('click', function () { show(step + 1); });
  show(1);
})();

// Keep Back and Next centred under the page, whatever size the page is drawn at.
(function () {
  var box = document.getElementById('visualizationContainer');
  var nav = document.querySelector('.page-nav');
  if (!box || !nav || !window.ResizeObserver) return;
  function fit() {
    var svg = box.querySelector('svg');
    nav.style.width = svg ? svg.getBoundingClientRect().width + 'px' : '';
  }
  new ResizeObserver(fit).observe(box);
  new MutationObserver(fit).observe(box, { childList: true, subtree: true, attributes: true });
  fit();
})();
