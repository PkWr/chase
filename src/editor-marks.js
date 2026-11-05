// Editing helpers for the marks: apply a line style, toggle italics, and turn imported styles into marks.
// Pure functions, no DOM. Selections are character offsets in the text box value.

export const MARKS = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', citation: '-- ' };
const LINE_MARK = /^(#{1,3}|>|--|—)[ \t]+/;
const MARK_STYLE = { '#': 'h1', '##': 'h2', '###': 'h3', '>': 'quote', '--': 'citation', '—': 'citation' };

/** The style a line has from its mark; lines without a mark are body. */
export function lineStyle(line) {
    const m = LINE_MARK.exec(line.trimStart());
    return m ? MARK_STYLE[m[1]] : 'body';
}

/**
 * Sets the style of the lines the selection touches. Choosing the style the lines already have
 * removes the mark (back to body). Blank lines are left alone.
 * Returns { text, start, end }.
 */
export function applyLineMark(text, start, end, style) {
    let last = end;
    if (last > start && text[last - 1] === '\n')
        last--;
    const ls = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
    let le = text.indexOf('\n', last);
    if (le === -1)
        le = text.length;
    const lines = text.slice(ls, le).split('\n');
    const filled = lines.filter((l) => l.trim());
    if (filled.length === 0)
        return { text, start, end };
    const target = filled.every((l) => lineStyle(l) === style) ? 'body' : style;
    const out = lines.map((l) => {
        if (!l.trim())
            return l;
        const bare = l.trimStart().replace(LINE_MARK, '');
        return (target === 'body' ? '' : MARKS[target]) + bare;
    });
    const joined = out.join('\n');
    const next = text.slice(0, ls) + joined + text.slice(le);
    if (start === end && lines.length === 1) {
        const caret = Math.max(ls, start + (out[0].length - lines[0].length));
        return { text: next, start: caret, end: caret };
    }
    return { text: next, start: ls, end: ls + joined.length };
}

// Is text[s..e) wrapped in single asterisks, either just outside it or as its own first and last character?
function wrapped(text, s, e) {
    if (text[s - 1] === '*' && text[e] === '*' && text[s - 2] !== '*' && text[e + 1] !== '*')
        return 'outside';
    if (e - s >= 3 && text[s] === '*' && text[e - 1] === '*' && text[s + 1] !== '*' && text[e - 2] !== '*')
        return 'inside';
    return '';
}

/**
 * Toggles italics (*text*). With no selection it works on the word at the caret. A selection over
 * several lines is wrapped line by line, because emphasis stays within one paragraph.
 */
export function toggleItalic(text, start, end) {
    const spans = [];
    if (start === end) {
        let s = start;
        let e = end;
        while (s > 0 && !/[\s*]/.test(text[s - 1]))
            s--;
        while (e < text.length && !/[\s*]/.test(text[e]))
            e++;
        if (s === e) {
            // The caret may sit inside an already marked word: look outward past one asterisk
            if (text[s - 1] === '*' && text[e] === '*') {
                let a = s - 1;
                let b = e + 1;
                while (a > 0 && !/\s/.test(text[a - 1]))
                    a--;
                while (b < text.length && !/\s/.test(text[b]))
                    b++;
                spans.push([a, b]);
            }
            else
                return { text, start, end };
        }
        else
            spans.push([s, e]);
    }
    else {
        let pos = start;
        for (const piece of text.slice(start, end).split('\n')) {
            let s = pos;
            let e = pos + piece.length;
            pos = e + 1;
            while (s < e && /\s/.test(text[s]))
                s++;
            while (e > s && /\s/.test(text[e - 1]))
                e--;
            if (e > s)
                spans.push([s, e]);
        }
    }
    if (spans.length === 0)
        return { text, start, end };
    const unwrap = spans.every(([s, e]) => wrapped(text, s, e));
    let out = '';
    let cursor = 0;
    let ns = 0;
    let ne = 0;
    spans.forEach(([s, e], idx) => {
        const kind = unwrap ? wrapped(text, s, e) : '';
        const a = kind === 'outside' ? s - 1 : s;
        const b = kind === 'outside' ? e + 1 : e;
        out += text.slice(cursor, a);
        if (idx === 0)
            ns = out.length;
        out += unwrap ? text.slice(a + 1, b - 1) : '*' + text.slice(s, e) + '*';
        ne = out.length;
        cursor = b;
    });
    out += text.slice(cursor);
    return { text: out, start: ns, end: ne };
}

/** Soft return: a backslash and a line break at the caret (or in place of the selection). */
export function insertSoftReturn(text, start, end) {
    const next = text.slice(0, start) + '\\\n' + text.slice(end);
    return { text: next, start: start + 2, end: start + 2 };
}

/** Escapes asterisks so imported text is not read as emphasis. */
export const escapeAsterisks = (s) => String(s).replace(/\*/g, '\\*');

/**
 * Segments [{ text, em }] of one paragraph to a line with *emphasis* marks. Neighbouring segments with
 * the same emphasis are joined, and spaces at the edges stay outside the asterisks.
 */
export function emphasisMarks(segments) {
    const merged = [];
    for (const s of segments) {
        if (!s.text)
            continue;
        const last = merged[merged.length - 1];
        if (last && last.em === !!s.em)
            last.text += s.text;
        else
            merged.push({ text: s.text, em: !!s.em });
    }
    return merged.map((s) => {
        const t = escapeAsterisks(s.text);
        if (!s.em)
            return t;
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
        return m[2] ? m[1] + '*' + m[2] + '*' + m[3] : t;
    }).join('');
}

/** The mark for a Word or OpenDocument paragraph style name; levels beyond three stay body text. */
export function styleNameMark(name) {
    const n = String(name || '').toLowerCase().trim();
    const h = /^heading ?([1-9])$/.exec(n);
    if (h)
        return Number(h[1]) <= 3 ? MARKS['h' + h[1]] : '';
    if (n === 'title')
        return MARKS.h1;
    if (/^(quote|intense quote|block text|block quotation|quotations)$/.test(n))
        return MARKS.quote;
    return '';
}

/** The mark for an html element name. */
export function htmlTagMark(tag) {
    const t = String(tag).toLowerCase();
    if (t === 'h1' || t === 'h2' || t === 'h3')
        return MARKS[t];
    return t === 'blockquote' ? MARKS.quote : '';
}
