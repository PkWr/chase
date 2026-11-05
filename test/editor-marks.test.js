import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLineMark, toggleItalic, emphasisMarks, styleNameMark, htmlTagMark, lineStyle } from '../src/editor-marks.js';
import { parseStyled, plainText } from '../src/styled-text.js';

test('applyLineMark sets, changes and removes a line style', () => {
    let r = applyLineMark('Title\nBody', 2, 2, 'h1');
    assert.equal(r.text, '# Title\nBody');
    assert.equal(r.start, 4); // the caret moves with the text
    r = applyLineMark(r.text, 4, 4, 'h2');
    assert.equal(r.text, '## Title\nBody');
    r = applyLineMark(r.text, 5, 5, 'h2');
    assert.equal(r.text, 'Title\nBody'); // same style again removes it
});

test('applyLineMark covers every line in a selection and skips blank lines', () => {
    const r = applyLineMark('a\n\nb\nc', 0, 6, 'quote');
    assert.equal(r.text, '> a\n\n> b\n> c');
    const back = applyLineMark(r.text, r.start, r.end, 'quote');
    assert.equal(back.text, 'a\n\nb\nc');
});

test('applyLineMark: a selection ending at the start of the next line leaves that line alone', () => {
    const r = applyLineMark('one\ntwo', 0, 4, 'citation');
    assert.equal(r.text, '-- one\ntwo');
    assert.equal(lineStyle('— x'), 'citation');
    assert.equal(applyLineMark('— x', 0, 0, 'h3').text, '### x');
});

test('toggleItalic wraps a selection, a word at the caret, and unwraps', () => {
    let r = toggleItalic('say hello there', 4, 9);
    assert.equal(r.text, 'say *hello* there');
    assert.equal(toggleItalic(r.text, r.start, r.end).text, 'say hello there');
    r = toggleItalic('say hello there', 6, 6);
    assert.equal(r.text, 'say *hello* there');
    assert.equal(toggleItalic('say *hello* there', 7, 7).text, 'say hello there');
    assert.equal(toggleItalic('   ', 1, 1).text, '   ');
});

test('toggleItalic keeps spaces outside the asterisks and works line by line', () => {
    assert.equal(toggleItalic('a b c', 1, 4).text, 'a *b* c'); // the selection included the spaces
    const r = toggleItalic('one two\nthree four', 4, 13);
    assert.equal(r.text, 'one *two*\n*three* four');
    assert.equal(parseStyled(r.text).map((b) => b.runs.filter((x) => x.em).length).join(), '1,1');
});

test('emphasisMarks joins runs, moves edge spaces out, escapes asterisks', () => {
    assert.equal(emphasisMarks([{ text: 'a ', em: false }, { text: 'b', em: true }, { text: ' c', em: true }, { text: ' d', em: false }]), 'a *b c* d');
    assert.equal(emphasisMarks([{ text: 'x ', em: true }, { text: 'y', em: false }]), '*x* y');
    assert.equal(emphasisMarks([{ text: '2*3', em: false }]), '2\\*3');
    assert.equal(plainText(parseStyled(emphasisMarks([{ text: '2*3', em: false }]))), '2*3');
});

test('style names map to marks', () => {
    assert.equal(styleNameMark('Heading 1'), '# ');
    assert.equal(styleNameMark('heading 3'), '### ');
    assert.equal(styleNameMark('Heading 4'), '');
    assert.equal(styleNameMark('Title'), '# ');
    assert.equal(styleNameMark('Intense Quote'), '> ');
    assert.equal(styleNameMark('Normal'), '');
    assert.equal(htmlTagMark('H2'), '## ');
    assert.equal(htmlTagMark('blockquote'), '> ');
    assert.equal(htmlTagMark('p'), '');
});
