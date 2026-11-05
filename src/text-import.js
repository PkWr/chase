// Load text into the sample text box from a file: plain text and markdown, html, Word (docx),
// OpenDocument (odt) and rtf. Files are read in the browser and never uploaded. Word and OpenDocument
// files are zip archives, so JSZip is fetched the first time one is opened.
(function () {
  var area = document.getElementById('sampleText');
  var button = document.getElementById('loadFileButton');
  var input = document.getElementById('textFileInput');
  var status = document.getElementById('textFileStatus');
  if (!area || !button || !input) return;
  var MAX = 100000;
  var idle = status ? status.textContent : '';
  var jszipPromise = null;

  function say(msg) { if (status) status.textContent = msg; }

  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!jszipPromise) {
      jszipPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = function () { resolve(window.JSZip); };
        s.onerror = function () { jszipPromise = null; reject(new Error('The Word reader could not be loaded. Check the connection and try again.')); };
        document.head.appendChild(s);
      });
    }
    return jszipPromise;
  }

  function tidy(text) {
    return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  function fromHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    Array.prototype.forEach.call(doc.querySelectorAll('script,style,noscript,template,head'), function (n) { n.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll('br'), function (n) { n.replaceWith('\n'); });
    Array.prototype.forEach.call(doc.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,tr,blockquote,pre,section,article,header,footer'), function (n) {
      n.appendChild(doc.createTextNode('\n'));
    });
    return tidy(doc.body ? doc.body.textContent : '');
  }

  function xmlParagraphs(xml, paraTag, textTags) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    var out = [];
    Array.prototype.forEach.call(doc.getElementsByTagName('*'), function (el) {
      if (el.nodeName !== paraTag) return;
      var line = '';
      (function walk(n) {
        Array.prototype.forEach.call(n.childNodes, function (c) {
          if (c.nodeType === 3) { if (textTags.indexOf(n.nodeName) !== -1) line += c.nodeValue; return; }
          if (c.nodeName === 'w:tab' || c.nodeName === 'text:tab') line += '\t';
          else if (c.nodeName === 'w:br' || c.nodeName === 'text:line-break') line += '\n';
          else if (c.nodeName === 'text:s') line += ' ';
          walk(c);
        });
      })(el);
      out.push(line);
    });
    return out;
  }

  function fromDocx(buffer) {
    return loadJSZip().then(function (JSZip) { return JSZip.loadAsync(buffer); }).then(function (zip) {
      var f = zip.file('word/document.xml');
      if (!f) throw new Error('This does not look like a Word (.docx) file.');
      return f.async('string');
    }).then(function (xml) { return tidy(xmlParagraphs(xml, 'w:p', ['w:t']).join('\n')); });
  }

  function fromOdt(buffer) {
    return loadJSZip().then(function (JSZip) { return JSZip.loadAsync(buffer); }).then(function (zip) {
      var f = zip.file('content.xml');
      if (!f) throw new Error('This does not look like an OpenDocument text (.odt) file.');
      return f.async('string');
    }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var out = [];
      Array.prototype.forEach.call(doc.getElementsByTagName('*'), function (el) {
        if (el.nodeName !== 'text:p' && el.nodeName !== 'text:h') return;
        out.push(el.textContent);
      });
      return tidy(out.join('\n'));
    });
  }

  function fromRtf(rtf) {
    var t = rtf.replace(/\\par[d]?/g, '\n').replace(/\\'([0-9a-f]{2})/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/\\u(-?\d+)\??/g, function (m, n) { return String.fromCharCode(n < 0 ? Number(n) + 65536 : Number(n)); })
      .replace(/\{\\\*[^{}]*\}/g, '').replace(/\{\\(fonttbl|colortbl|stylesheet|info)[^]*?\}\}/g, '')
      .replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
    return tidy(t);
  }

  function read(file) {
    var name = file.name.toLowerCase();
    var ext = name.slice(name.lastIndexOf('.') + 1);
    if (ext === 'docx') return file.arrayBuffer().then(fromDocx);
    if (ext === 'odt') return file.arrayBuffer().then(fromOdt);
    if (ext === 'doc') return Promise.reject(new Error('Old Word (.doc) files cannot be read. Save it as .docx or .txt and try again.'));
    if (ext === 'pdf') return Promise.reject(new Error('PDF files cannot be read yet. Copy the text and paste it into the box.'));
    return file.text().then(function (text) {
      if (ext === 'html' || ext === 'htm') return fromHtml(text);
      if (ext === 'rtf') return fromRtf(text);
      return tidy(text);
    });
  }

  function load(file) {
    if (!file) return;
    say('Reading ' + file.name + '...');
    read(file).then(function (text) {
      if (!text) { say('No text was found in ' + file.name + '.'); return; }
      var cut = text.length > MAX;
      area.value = cut ? text.slice(0, MAX) : text;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      say('Loaded ' + file.name + ' (' + (cut ? 'first ' + MAX.toLocaleString('en-GB') : text.length.toLocaleString('en-GB')) + ' characters' + (cut ? ', the rest was left out to keep the preview quick' : '') + ').');
    }).catch(function (err) {
      say(err && err.message ? err.message : 'That file could not be read.');
    });
  }

  button.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () { load(input.files && input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    area.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) { e.preventDefault(); area.classList.add('drop-ready'); } });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    area.addEventListener(ev, function () { area.classList.remove('drop-ready'); });
  });
  area.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { e.preventDefault(); load(f); }
  });
  // Pasted text: runs of line breaks become one paragraph break, so no forced empty lines come in.
  area.addEventListener('paste', function (e) {
    var data = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!data) return;
    e.preventDefault();
    var clean = data.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n');
    area.setRangeText(clean, area.selectionStart, area.selectionEnd, 'end');
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Space after paragraph: remembered between visits and redraws the page when changed.
  var space = document.getElementById('paraSpace');
  if (space) {
    try { var saved = localStorage.getItem('compositorParaSpacePt'); if (saved !== null) space.value = saved; } catch (e) {}
    space.addEventListener('input', function () {
      try { localStorage.setItem('compositorParaSpacePt', space.value); } catch (e) {}
      window.dispatchEvent(new Event('resize'));
    });
    window.setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
  }
  var clear = document.getElementById('clearTextButton');
  var dflt = document.getElementById('loadDefaultTextButton');
  [clear, dflt].forEach(function (b) { if (b) b.addEventListener('click', function () { say(idle); }); });
})();
