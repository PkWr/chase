// Styled text: turns the text box content into styled blocks. Pure functions, no DOM.
// Preview and IDML export both read these blocks, so the marks mean the same everywhere.
//
// Marks, one paragraph per line:
//   "# " Heading 1    "## " Heading 2    "### " Heading 3    (up to three levels, all optional)
//   "> " Block Quote  "-- " Citation (the source line under a quote; set with a real em dash, and a typed "— " works too)
//   *text* Emphasis (italic) inside any paragraph; a backslash before * keeps it literal
//   a backslash at the very end of a line is a soft return: the next line joins the same paragraph after a
//   line break (written \\ at the end for a plain backslash)
// Anything else is Body Text. The marks are removed from the blocks; a Citation starts with an em dash.

export const STYLE_NAMES = {
    body: 'Body Text',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    quote: 'Block Quote',
    citation: 'Citation',
    emphasis: 'Emphasis',
};

const HEADING = /^(#{1,3})[ \t]+(\S.*)$/;
const QUOTE = /^>[ \t]+(\S.*)$/;
const CITATION = /^(?:--|—)[ \t]+(\S.*)$/;
// *text*: not next to another *, no space just inside the asterisks, so "2 * 3 * 4" and **x** stay literal.
const EM = /(?<!\*)\*(?!\*)(\S(?:[^*]*?\S)?)(?<!\*)\*(?!\*)/g;
const ESC = '';

/** Splits a line into runs of { text, em }. Escaped asterisks come out as plain *. */
export function parseRuns(line) {
    const src = String(line).replace(/\\\*/g, ESC);
    const runs = [];
    let last = 0;
    let m;
    EM.lastIndex = 0;
    while ((m = EM.exec(src))) {
        if (m.index > last)
            runs.push({ text: src.slice(last, m.index), em: false });
        runs.push({ text: m[1], em: true });
        last = EM.lastIndex;
    }
    if (last < src.length)
        runs.push({ text: src.slice(last), em: false });
    return runs.map((r) => ({ text: r.text.split(ESC).join('*'), em: r.em })).filter((r) => r.text !== '');
}

/** The character used for a soft return in set text. InDesign takes it as a forced line break. */
export const SOFT_RETURN = '\u2028';

/** Splits the trailing backslashes of a line: an odd run is a soft return, pairs stand for one backslash. */
function softEnd(line) {
    const m = /(\\+)$/.exec(line);
    if (!m)
        return { text: line, soft: false };
    const n = m[1].length;
    return { text: line.slice(0, line.length - n) + '\\'.repeat(Math.floor(n / 2)), soft: n % 2 === 1 };
}

/** Text box content to blocks: [{ style, runs: [{ text, em, br? }] }]. Empty lines are ignored. */
export function parseStyled(text) {
    const blocks = [];
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        let { text: first, soft } = softEnd(lines[i].trim());
        if (!first && !soft)
            continue;
        let style = 'body';
        let m;
        let head = first;
        if ((m = HEADING.exec(head))) {
            style = 'h' + m[1].length;
            head = m[2];
        } else if ((m = QUOTE.exec(head))) {
            style = 'quote';
            head = m[1];
        } else if ((m = CITATION.exec(head))) {
            style = 'citation';
            head = '— ' + m[1]; // set with a real em dash, whichever mark was typed
        }
        const pieces = [head.trim()];
        // A soft return joins the next line to this paragraph; marks on it are plain text
        while (soft && i + 1 < lines.length && lines[i + 1].trim()) {
            i++;
            const next = softEnd(lines[i].trim());
            pieces.push(next.text);
            soft = next.soft;
        }
        if (pieces.every((x) => !x))
            continue;
        const runs = [];
        pieces.forEach((piece, k) => {
            if (k > 0)
                runs.push({ text: SOFT_RETURN, em: false, br: true });
            runs.push(...parseRuns(piece));
        });
        blocks.push({ style, runs });
    }
    return blocks;
}

/** The text of a block with every mark removed. */
export const blockText = (block) => block.runs.map((r) => r.text).join('');

/** All block text, marks removed, one paragraph per line. */
export const plainText = (blocks) => blocks.map(blockText).join('\n');

/** Which styles the text uses, so panels and exports can show only those. */
export function stylesUsed(blocks) {
    const used = { body: false, h1: false, h2: false, h3: false, quote: false, citation: false, emphasis: false };
    for (const b of blocks) {
        used[b.style] = true;
        if (b.runs.some((r) => r.em))
            used.emphasis = true;
    }
    return used;
}
