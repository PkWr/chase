// Load text into the sample text box from a file: plain text and markdown, html, Word (docx),
// OpenDocument (odt) and rtf. Files are read in the browser and never uploaded. Word and OpenDocument
// files are zip archives, so JSZip is fetched the first time one is opened.
import { emphasisMarks, escapeAsterisks, styleNameMark, htmlTagMark } from './editor-marks.js';

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

  window.loadJSZip = loadJSZip; // shared with the IDML download

  function tidy(text) {
    return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  function fromHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var qsa = function (sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); };
    qsa('script,style,noscript,template,head').forEach(function (n) { n.remove(); });
    qsa('br').forEach(function (n) { n.replaceWith('\n'); });
    // Asterisks in the text are plain text: escape them before the emphasis marks are added
    if (doc.body) {
      var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) { n.nodeValue = escapeAsterisks(n.nodeValue); });
    }
    // Italics: outermost <em> and <i> become *words*, with edge spaces kept outside the asterisks
    qsa('em,i').forEach(function (n) {
      if (n.parentElement && n.parentElement.closest('em,i')) return;
      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(n.textContent);
      if (m[2]) n.textContent = m[1] + '*' + m[2] + '*' + m[3];
    });
    // Headings 1 to 3 and block quotes become marks; deeper headings stay body text
    ['h1', 'h2', 'h3'].forEach(function (tag) {
      qsa(tag).forEach(function (n) { n.insertBefore(doc.createTextNode(htmlTagMark(tag)), n.firstChild); });
    });
    qsa('blockquote').forEach(function (bq) {
      var ps = bq.querySelectorAll('p');
      var targets = ps.length ? Array.prototype.slice.call(ps) : [bq];
      targets.forEach(function (n) { n.insertBefore(doc.createTextNode(htmlTagMark('blockquote')), n.firstChild); });
    });
    qsa('p,div,h1,h2,h3,h4,h5,h6,li,tr,blockquote,pre,section,article,header,footer').forEach(function (n) {
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

  function docxLines(xml, stylesXml) {
    var parse = function (x) { return new DOMParser().parseFromString(x, 'application/xml'); };
    var names = {};
    var basedOn = {};
    if (stylesXml) {
      Array.prototype.forEach.call(parse(stylesXml).getElementsByTagName('w:style'), function (st) {
        var id = st.getAttribute('w:styleId');
        var nm = st.getElementsByTagName('w:name')[0];
        var bo = st.getElementsByTagName('w:basedOn')[0];
        if (id) { names[id] = nm ? nm.getAttribute('w:val') : id; if (bo) basedOn[id] = bo.getAttribute('w:val'); }
      });
    }
    // A paragraph style gives a mark directly or through the style it is based on (Heading 1, Quote, Title)
    function markFor(id) {
      for (var hops = 0; id && hops < 6; hops++) {
        var m = styleNameMark(names[id] || id);
        if (m) return m;
        id = basedOn[id];
      }
      return '';
    }
    var out = [];
    Array.prototype.forEach.call(parse(xml).getElementsByTagName('w:p'), function (p) {
      var ps = p.getElementsByTagName('w:pStyle')[0];
      var mark = markFor(ps ? ps.getAttribute('w:val') : '');
      var segs = [];
      Array.prototype.forEach.call(p.getElementsByTagName('w:r'), function (r) {
        var rpr = r.getElementsByTagName('w:rPr')[0];
        var em = false;
        if (rpr) {
          var i = rpr.getElementsByTagName('w:i')[0];
          if (i) { var v = (i.getAttribute('w:val') || '').toLowerCase(); em = v !== '0' && v !== 'false' && v !== 'off'; }
          var rs = rpr.getElementsByTagName('w:rStyle')[0];
          if (rs && /^emphasis$/i.test(names[rs.getAttribute('w:val')] || rs.getAttribute('w:val'))) em = true;
        }
        Array.prototype.forEach.call(r.childNodes, function (c) {
          var text = '';
          if (c.nodeName === 'w:t') text = c.textContent;
          else if (c.nodeName === 'w:tab') text = '\t';
          else if (c.nodeName === 'w:br') text = '\n';
          else return;
          text.split(/(\n)/).forEach(function (piece) { if (piece) segs.push({ text: piece, em: em && piece !== '\n' }); });
        });
      });
      var line = emphasisMarks(segs);
      out.push(mark && line.trim() ? mark + line.trimStart() : line);
    });
    return out;
  }

  function fromDocx(buffer) {
    return loadJSZip().then(function (JSZip) { return JSZip.loadAsync(buffer); }).then(function (zip) {
      var f = zip.file('word/document.xml');
      if (!f) throw new Error('This does not look like a Word (.docx) file.');
      var s = zip.file('word/styles.xml');
      return Promise.all([f.async('string'), s ? s.async('string') : Promise.resolve('')]);
    }).then(function (parts) { return tidy(docxLines(parts[0], parts[1]).join('\n')); });
  }

  function fromOdt(buffer) {
    return loadJSZip().then(function (JSZip) { return JSZip.loadAsync(buffer); }).then(function (zip) {
      var f = zip.file('content.xml');
      if (!f) throw new Error('This does not look like an OpenDocument text (.odt) file.');
      return f.async('string');
    }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var italic = {};
      Array.prototype.forEach.call(doc.getElementsByTagName('style:style'), function (st) {
        var tp = st.getElementsByTagName('style:text-properties')[0];
        if (tp && tp.getAttribute('fo:font-style') === 'italic') italic[st.getAttribute('style:name')] = true;
      });
      function collect(node, em, segs) {
        Array.prototype.forEach.call(node.childNodes, function (c) {
          if (c.nodeType === 3) { segs.push({ text: c.nodeValue, em: em }); return; }
          if (c.nodeName === 'text:tab') { segs.push({ text: '\t', em: false }); return; }
          if (c.nodeName === 'text:s') { segs.push({ text: ' ', em: false }); return; }
          if (c.nodeName === 'text:line-break') { segs.push({ text: '\n', em: false }); return; }
          collect(c, em || (c.nodeName === 'text:span' && !!italic[c.getAttribute('text:style-name')]), segs);
        });
      }
      var out = [];
      Array.prototype.forEach.call(doc.getElementsByTagName('*'), function (el) {
        if (el.nodeName !== 'text:p' && el.nodeName !== 'text:h') return;
        var mark = '';
        if (el.nodeName === 'text:h') mark = styleNameMark('Heading ' + (el.getAttribute('text:outline-level') || '1'));
        else mark = styleNameMark((el.getAttribute('text:style-name') || '').replace(/_20_/g, ' '));
        var segs = [];
        collect(el, !!italic[el.getAttribute('text:style-name')], segs);
        var line = emphasisMarks(segs);
        out.push(mark && line.trim() ? mark + line.trimStart() : line);
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

  function apply(name, text) {
    var cut = text.length > MAX;
    area.value = cut ? text.slice(0, MAX) : text;
    delete area.dataset.edited;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    say('Loaded ' + name + ' (' + (cut ? 'first ' + MAX.toLocaleString('en-GB') : text.length.toLocaleString('en-GB')) + ' characters' + (cut ? ', the rest was left out to keep the preview quick' : '') + ').');
  }

  // Text that has been typed or edited is not replaced without asking
  function askReplace(name, text) {
    if (!status) { apply(name, text); return; }
    status.textContent = 'Replace the text in the box with ' + name + '?';
    var yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'prompt-btn'; yes.textContent = 'Replace';
    var no = document.createElement('button');
    no.type = 'button'; no.className = 'prompt-btn'; no.textContent = 'Cancel';
    yes.addEventListener('click', function () { apply(name, text); });
    no.addEventListener('click', function () { say(idle); });
    status.appendChild(yes);
    status.appendChild(no);
  }

  function load(file) {
    if (!file) return;
    say('Reading ' + file.name + '...');
    read(file).then(function (text) {
      if (!text) { say('No text was found in ' + file.name + '.'); return; }
      if (area.value.trim() && area.dataset.edited) askReplace(file.name, text);
      else apply(file.name, text);
    }).catch(function (err) {
      say(err && err.message ? err.message : 'That file could not be read.');
    });
  }

  area.addEventListener('input', function (e) { if (e.isTrusted) area.dataset.edited = '1'; });

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
    area.dataset.edited = '1';
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
