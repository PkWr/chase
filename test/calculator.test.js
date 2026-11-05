import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGutterWidth, calculateLayout, calculateColumnSpanWidth } from '../src/calculator.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const base = {
  pageWidth: 210, pageHeight: 297,
  leftMargin: 20, rightMargin: 20, topMargin: 20, bottomMargin: 20,
  typeSize: 10, numCols: 2, gutterWidth: 5,
};

test('gutter is 1em in mm', () => {
  near(calculateGutterWidth(10), 3.528);
});

test('two columns: width and optimal measure', () => {
  const r = calculateLayout(base);
  near(r.columnWidth, (170 - 5) / 2);
  assert.equal(r.textBoxWidth, 170);
  assert.equal(r.gutterWidth, 5);
  near(r.optimalColumnWidth, 33 * 10 * 0.3528);
});

test('single column has no gutter loss', () => {
  const r = calculateLayout({ ...base, numCols: 1 });
  assert.equal(r.columnWidth, 170);
});

test('span of 2 of 3 columns', () => {
  const inputs = { ...base, numCols: 3, columnSpanStart: 1, columnSpanEnd: 2 };
  const col = (170 - 10) / 3;
  near(calculateLayout(inputs).textBoxWidth, col * 2 + 5);
  near(calculateColumnSpanWidth(inputs), col * 2 + 5);
});

test('span covering one column equals column width', () => {
  const inputs = { ...base, numCols: 3, columnSpanStart: 2, columnSpanEnd: 2 };
  near(calculateColumnSpanWidth(inputs), (170 - 10) / 3);
});

test('no span returns full text box', () => {
  assert.equal(calculateColumnSpanWidth(base), 170);
});
