// The text editor: style buttons and shortcuts that write the marks, and the expanded editor that opens
// in the page area. The text box is one element; expanding moves it (with its buttons and the how-to
// guide) into the page area, so everything that listens to it keeps working.
import { applyLineMark, toggleItalic } from './editor-marks.js';

const area = document.getElementById('sampleText');
const editor = document.getElementById('textEditor');
const stage = document.getElementById('editorStage');
const stageBody = document.getElementById('editorStageBody');
const expandBtn = document.getElementById('expandEditor');
const doneBtn = document.getElementById('collapseEditor');
const help = document.getElementById('markupHelp');

/** Puts a new value into the box with a small edit, so the browser's undo keeps working. */
function setText(r) {
    const old = area.value;
    area.focus();
    if (r.text !== old) {
        let i = 0;
        const max = Math.min(old.length, r.text.length);
        while (i < max && old[i] === r.text[i])
            i++;
        let a = old.length;
        let b = r.text.length;
        while (a > i && b > i && old[a - 1] === r.text[b - 1]) {
            a--;
            b--;
        }
        area.setSelectionRange(i, a);
        let ok = false;
        try {
            ok = b === i ? document.execCommand('delete') : document.execCommand('insertText', false, r.text.slice(i, b));
        } catch (e) { ok = false; }
        if (!ok || area.value !== r.text) {
            area.value = r.text;
            area.dispatchEvent(new Event('input', { bubbles: true }));
        }
        area.dataset.edited = '1';
    }
    area.setSelectionRange(r.start, r.end);
}

function run(kind) {
    const s = area.selectionStart;
    const e = area.selectionEnd;
    setText(kind === 'italic' ? toggleItalic(area.value, s, e) : applyLineMark(area.value, s, e, kind));
}

if (area && editor) {
    editor.querySelector('.mark-tools')?.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-mark]');
        if (b)
            run(b.dataset.mark);
    });
    area.addEventListener('keydown', (ev) => {
        if (!(ev.metaKey || ev.ctrlKey))
            return;
        const m = /^Digit([123])$/.exec(ev.code);
        if (ev.altKey && m) {
            ev.preventDefault();
            run('h' + m[1]);
        } else if (!ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'i') {
            ev.preventDefault();
            run('italic');
        }
    });
}

let slot = null;
function expand() {
    if (!stage || !stage.hidden || document.body.classList.contains('popped'))
        return;
    slot = document.createComment('text editor');
    editor.parentNode.insertBefore(slot, editor);
    stageBody.appendChild(editor);
    stage.hidden = false;
    if (help)
        help.open = true;
    expandBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('editor-open');
    area.focus();
}
function collapse() {
    if (!stage || stage.hidden || !slot)
        return;
    slot.parentNode.insertBefore(editor, slot);
    slot.remove();
    slot = null;
    stage.hidden = true;
    if (help)
        help.open = false;
    expandBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('editor-open');
}
expandBtn?.addEventListener('click', () => (stage.hidden ? expand() : collapse()));
doneBtn?.addEventListener('click', collapse);
document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && stage && !stage.hidden)
        collapse();
});
// Leaving the Text step closes the expanded editor
new MutationObserver(() => {
    if (document.body.getAttribute('data-step') !== '2')
        collapse();
}).observe(document.body, { attributes: true, attributeFilter: ['data-step'] });
