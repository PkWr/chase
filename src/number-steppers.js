// Number fields get large − and + buttons in place of the browser's tiny up and down arrows,
// which are too small for fingers. The input keeps its id, step, min and max, and still
// sends input and change events, so nothing else needs to know about the buttons.
(function () {
  function decimals(n) {
    var s = String(n);
    var i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }
  function nudge(input, dir) {
    var step = parseFloat(input.step);
    if (!isFinite(step) || step <= 0) step = 1;
    var cur = parseFloat(input.value);
    if (!isFinite(cur)) cur = parseFloat(input.min) || 0;
    var places = Math.max(decimals(step), decimals(cur));
    var v = cur + dir * step;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    if (isFinite(min)) v = Math.max(min, v);
    if (isFinite(max)) v = Math.min(max, v);
    input.value = v.toFixed(Math.min(places, 6)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function button(label, text, dir, input) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'num-btn';
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', function () { nudge(input, dir); });
    return b;
  }
  document.querySelectorAll('.container input[type=number]').forEach(function (input) {
    if (input.closest('.visually-hidden-control')) return; // driven by the column picker
    var wrap = document.createElement('span');
    wrap.className = 'num-step';
    input.parentNode.insertBefore(wrap, input);
    var name = (input.id && document.querySelector('label[for="' + input.id + '"]') || {}).textContent || 'value';
    wrap.appendChild(button('Decrease ' + name.trim(), '−', -1, input));
    wrap.appendChild(input);
    wrap.appendChild(button('Increase ' + name.trim(), '+', 1, input));
  });
})();
