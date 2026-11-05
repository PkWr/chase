import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStyled, parseRuns, plainText, stylesUsed, STYLE_NAMES } from '../src/styled-text.js';

test('headings, quote and citation marks set the style and are stripped', () => {
    const b = parseStyled('# One\n## Two\n### Three\n> Quoted\n-- Bringhurst, 2004\nPlain');
    assert.deepEqual(b.map((x) => x.style), ['h1', 'h2', 'h3', 'quote', 'citation', 'body']);
    assert.equal(plainText(b), 'One\nTwo\nThree\nQuoted\n— Bringhurst, 2004\nPlain');
});

test('only three levels; more # and marks without a space stay literal body text', () => {
    const b = parseStyled('#### Four\n#nospace\n>nospace\n--nospace\n—nospace\n#\n-- \n—');
    assert.ok(b.every((x) => x.style === 'body'));
    assert.equal(plainText(b), '#### Four\n#nospace\n>nospace\n--nospace\n—nospace\n#\n--\n—');
});

test('emphasis in *asterisks* becomes an italic run, in any style', () => {
    assert.deepEqual(parseRuns('a *b* c'), [{ text: 'a ', em: false }, { text: 'b', em: true }, { text: ' c', em: false }]);
    const b = parseStyled('## The *Elements* of Style');
    assert.equal(b[0].style, 'h2');
    assert.deepEqual(b[0].runs.map((r) => r.em), [false, true, false]);
});

test('asterisks that are not emphasis stay literal', () => {
    for (const s of ['2 * 3 * 4', '**bold**', 'a * b', 'one *unclosed', 'star\\*d']) {
        assert.ok(parseRuns(s).every((r) => !r.em), s);
    }
    assert.equal(parseRuns('star\\*d')[0].text, 'star*d');
    assert.equal(parseRuns('**bold**').map((r) => r.text).join(''), '**bold**');
});

test('blank lines and Windows line endings are ignored', () => {
    const b = parseStyled('# A\r\n\r\n\r\nB\n   \nC');
    assert.deepEqual(b.map((x) => x.style), ['h1', 'body', 'body']);
});

test('stylesUsed lists only what the text uses', () => {
    const u = stylesUsed(parseStyled('## A\nPlain *x*'));
    assert.deepEqual(u, { body: true, h1: false, h2: true, h3: false, quote: false, citation: false, emphasis: true });
    assert.equal(STYLE_NAMES.quote, 'Block Quote');
});

test('empty input gives no blocks', () => {
    assert.deepEqual(parseStyled(''), []);
    assert.deepEqual(parseStyled(undefined), []);
});

test('a Citation is set with a real em dash whether -- or a typed em dash was the mark', () => {
    for (const line of ['-- Bringhurst, 2004', '— Bringhurst, 2004']) {
        const [b] = parseStyled(line);
        assert.equal(b.style, 'citation');
        assert.equal(plainText([b]), '— Bringhurst, 2004');
    }
});

test('a backslash at the end of a line is a soft return inside one paragraph', () => {
    const b = parseStyled('Line one\\\nLine two\\\nLine three\nNext paragraph');
    assert.equal(b.length, 2);
    assert.equal(b[0].style, 'body');
    assert.equal(plainText([b[0]]), 'Line one Line two Line three');
    assert.equal(b[0].runs.filter((r) => r.br).length, 2);
});

test('soft returns work in headings and quotes, and emphasis stays within a line', () => {
    const h = parseStyled('## Long heading\\\nsecond line');
    assert.equal(h.length, 1);
    assert.equal(h[0].style, 'h2');
    assert.equal(plainText(h), 'Long heading second line');
    const q = parseStyled('> a *b*\\\nc *d*');
    assert.deepEqual(q[0].runs.filter((r) => r.em).map((r) => r.text), ['b', 'd']);
    // a mark on the continuation line is plain text
    assert.equal(plainText(parseStyled('a\\\n# not a heading')), 'a # not a heading');
});

test('two backslashes keep one; a stray soft return with nothing after it is dropped', () => {
    assert.equal(plainText(parseStyled('path\\\\\nnext')), 'path\\\nnext');
    assert.equal(parseStyled('path\\\\\nnext').length, 2);
    assert.equal(plainText(parseStyled('end\\')), 'end');
    assert.equal(plainText(parseStyled('a\\\n\nb')), 'a\nb');
});
