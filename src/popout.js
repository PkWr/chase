// Pop the page preview out into its own window so the controls can use the whole window,
// and bring it back in. The preview block (.preview-wrapper) is moved, not copied, so the
// drawing, Back and Next and the scale reading keep working exactly as before.
// Elements of the preview may live in the pop-out window, where document.getElementById of this
// window cannot see them. previewEl finds them in either place.
var popoutWindow = null;
window.previewEl = function (id) {
  var el = document.getElementById(id);
  if (!el && popoutWindow && !popoutWindow.closed) el = popoutWindow.document.getElementById(id);
  return el;
};
(function () {
  var wrapper = document.querySelector('.preview-wrapper');
  var out = document.getElementById('popOut');
  var inBtn = document.getElementById('popIn');
  var inPanel = document.getElementById('popInPanel');
  if (!wrapper || !out) return;
  var win = null;

  // The pop-out button sits in the bottom left corner of the page drawing.
  wrapper.appendChild(out);
  var box = wrapper.querySelector('.visualization-container');
  function placeOut() {
    var svg = box && box.querySelector('svg');
    if (!svg) return;
    var w = wrapper.getBoundingClientRect(), s = svg.getBoundingClientRect(), b = box.getBoundingClientRect();
    var bottom = Math.min(s.bottom, b.bottom);
    out.style.left = (s.left - w.left + wrapper.scrollLeft + 10) + 'px';
    out.style.top = (bottom - w.top + wrapper.scrollTop - out.offsetHeight - 10) + 'px';
  }
  if (box) {
    new MutationObserver(function () { requestAnimationFrame(placeOut); }).observe(box, { childList: true });
    window.addEventListener('resize', function () { requestAnimationFrame(placeOut); });
    if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(placeOut); }).observe(box);
    requestAnimationFrame(placeOut);
  }
  window.placePopOut = placeOut;

  function setState(popped) {
    document.body.classList.toggle('popped', popped);
    out.hidden = popped;
    inBtn.hidden = !popped;
    inPanel.hidden = !popped;
  }

  function bringIn() {
    var w = win;
    win = null;
    popoutWindow = null;
    if (!wrapper.isConnected || wrapper.ownerDocument !== document) {
      document.body.appendChild(wrapper);
    }
    setState(false);
    if (w && !w.closed) w.close();
    window.dispatchEvent(new Event('resize'));
  }

  function popOut() {
    win = window.open('', 'compositorPreview', 'popup=yes,width=900,height=1000');
    popoutWindow = win;
    if (!win) { out.title = 'The browser blocked the new window. Allow pop-ups for this site.'; return; }
    var d = win.document;
    d.title = 'Compositor page';
    d.body.className = 'popout-window';
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      var c = d.createElement('link');
      c.rel = 'stylesheet';
      c.href = l.href;
      d.head.appendChild(c);
    });
    d.body.appendChild(wrapper); // adopts the block into the new window
    setState(true);
    win.addEventListener('pagehide', function () { if (win) bringIn(); });
    // Refit the drawing whenever the pop-out window or its stylesheets change the stage size.
    var refit = function () { window.dispatchEvent(new Event('resize')); };
    win.addEventListener('resize', refit);
    Array.prototype.forEach.call(d.querySelectorAll('link[rel="stylesheet"]'), function (l) { l.addEventListener('load', refit); });
    if (win.ResizeObserver) new win.ResizeObserver(refit).observe(wrapper);
    setTimeout(refit, 300);
  }

  out.addEventListener('click', popOut);
  inBtn.addEventListener('click', bringIn);
  inPanel.addEventListener('click', bringIn);
  window.addEventListener('pagehide', function () { if (win && !win.closed) win.close(); });
})();
