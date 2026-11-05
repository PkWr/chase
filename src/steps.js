// Steps for the calculator panel, as on Form: one group of controls at a time, Back and Next,
// and the specification download last. Sections carry data-step="1".."4" in index.html;
// the preview updates live throughout, so no calculation depends on the current step.
(function () {
  var titles = ['Page', 'Margins', 'Columns', 'Type', 'Text', 'Specification and download'];
  var step = 1;
  var back = document.getElementById('stepBack');
  var next = document.getElementById('stepNext');
  var now = document.getElementById('stepNow');
  var pills = document.querySelectorAll('#cpSteps a');
  var panel = document.querySelector('.container');
  if (!back || !next || !now || !panel) return;

  function show(n) {
    step = Math.min(titles.length, Math.max(1, n));
    document.body.setAttribute('data-step', String(step));
    var label = 'Step ' + step + ' of ' + titles.length + ' · ' + titles[step - 1];
    now.textContent = label;
    pills.forEach(function (a) { a.setAttribute('aria-checked', String(Number(a.dataset.go) === step)); });
    back.hidden = step === 1;
    next.hidden = step === titles.length;
    panel.scrollTop = 0;
  }

  back.addEventListener('click', function () { show(step - 1); });
  next.addEventListener('click', function () { show(step + 1); });
  pills.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(Number(a.dataset.go)); });
  });
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
