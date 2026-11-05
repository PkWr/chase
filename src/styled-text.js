// Styled text: turns the text box content into styled blocks. Pure functions, no DOM.
// Preview and IDML export both read these blocks, so the marks mean the same everywhere.
//
// Marks, one paragraph per line:
//   "# " Heading 1    "## " Heading 2    "### " Heading 3    (up to three levels, all optional)
//   "> " Block Quote  "— " Citation (a real em dash and a space; the source line under a quote)
//   *text* Emphasis (italic) inside any paragraph; a backslash before * keeps it literal
// Anything else is Body Text. The marks are removed from the blocks, except the Citation's em dash,
// which is part of the set text.

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
const CITATION = /^—[ \t]+(\S.*)$/;
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

/** Text box content to blocks: [{ style, runs: [{ text, em }] }]. Empty lines are ignored. */
export function parseStyled(text) {
    const blocks = [];
    for (const raw of String(text || '').split(/\r?\n+/)) {
        const line = raw.trim();
        if (!line)
            continue;
        let style = 'body';
        let body = line;
        let m;
        if ((m = HEADING.exec(line))) {
            style = 'h' + m[1].length;
            body = m[2];
        } else if ((m = QUOTE.exec(line))) {
            style = 'quote';
            body = m[1];
        } else if ((m = CITATION.exec(line))) {
            style = 'citation';
            body = '— ' + m[1]; // the em dash is set text, not a mark to strip
        }
        blocks.push({ style, runs: parseRuns(body.trim()) });
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
