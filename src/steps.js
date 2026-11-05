// Steps for the calculator panel, as on Form: one group of controls at a time, Back and Next,
// and the specification download last. Sections carry data-step="1".."4" in index.html;
// the preview updates live throughout, so no calculation depends on the current step.
(function () {
  var titles = ['Intro', 'Text', 'Page', 'Margins', 'Columns', 'Typography', 'Styles', 'Report', 'Download'];
  var step = 1;
  var previous = 0;
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
    var ribbon = document.getElementById('cpSteps');
    var cur = pills[step - 1];
    if (ribbon && cur) ribbon.scrollTo({ left: cur.offsetLeft - (ribbon.clientWidth - cur.offsetWidth) / 2, behavior: previous ? 'smooth' : 'auto' });
    next.textContent = step < titles.length ? 'Next / ' + titles[step] : 'Next';
    back.hidden = step === 1;
    next.hidden = step === titles.length;
    // The intro shows the essay over several pages; other steps show a single page.
    if (previous !== step && (previous === 1 || step === 1)) window.dispatchEvent(new Event('resize'));
    previous = step;
    // Each layer switches on when its step is reached (and stays on until turned off).
    var layerFor = { 2: 'showText', 4: 'showMargins', 5: 'showColumns' }[step];
    var box = layerFor && document.getElementById(layerFor);
    if (box && !box.checked) {
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
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
