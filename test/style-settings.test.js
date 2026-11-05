import test from 'node:test';
import assert from 'node:assert/strict';
import { blockMetrics, linesFor, STYLE_DEFAULTS } from '../src/style-settings.js';

const base = { sizePx: 12, lineHeightPx: 14, spaceAfterPx: 14 };

test('headings are sized by ratio and set in whole lines of the body leading', () => {
    const h1 = blockMetrics('h1', {}, base);
    assert.ok(Math.abs(h1.sizePx - 19.2) < 1e-9);
    assert.equal(h1.lineHeightPx, 28);
    assert.equal(blockMetrics('h2', {}, base).lineHeightPx, 28); // 15.6 px needs two 14 px lines
    assert.equal(blockMetrics('h3', {}, base).lineHeightPx, 14); // 13.8 px fits one
    for (const h of ['h1', 'h2', 'h3']) {
        const m = blockMetrics(h, {}, base);
        assert.equal(m.lineHeightPx % base.lineHeightPx, 0);
        assert.equal(m.marginTopPx % base.lineHeightPx, 0);
        assert.equal(m.bold, true);
        assert.equal(m.keepWithNext, true);
    }
});

test('a changed ratio changes the size and the line count', () => {
    const m = blockMetrics('h3', { h3: 2 }, base);
    assert.equal(m.sizePx, 24);
    assert.equal(m.lineHeightPx, 28);
});

test('body is untouched; quote indents; citation is smaller and indented', () => {
    const b = blockMetrics('body', {}, base);
    assert.deepEqual([b.sizePx, b.lineHeightPx, b.marginBottomPx, b.indentPx, b.bold], [12, 14, 14, 0, false]);
    assert.equal(blockMetrics('quote', {}, base).indentPx, STYLE_DEFAULTS.quoteIndent * 12);
    const c = blockMetrics('citation', {}, base);
    assert.ok(Math.abs(c.sizePx - 12 * STYLE_DEFAULTS.citationSize) < 1e-9);
    assert.equal(c.indentPx, 24);
});

test('linesFor never returns less than one line', () => {
    assert.equal(linesFor(5, 14), 1);
    assert.equal(linesFor(14, 14), 1);
    assert.equal(linesFor(14.1, 14), 2);
});
