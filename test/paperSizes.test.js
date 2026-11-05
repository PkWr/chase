import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAPER_SIZES, getPaperSize, getDefaultPaperSize } from '../src/paperSizes.js';

test('default is A4 210x297', () => {
  const a4 = getDefaultPaperSize();
  assert.deepEqual([a4.name, a4.width, a4.height], ['A4', 210, 297]);
});

test('lookup by name, and miss', () => {
  assert.equal(getPaperSize('US Letter').width, 216);
  assert.equal(getPaperSize('nope'), undefined);
});

test('names are unique and dimensions positive', () => {
  const names = PAPER_SIZES.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
  for (const s of PAPER_SIZES) assert.ok(s.width > 0 && s.height > 0 && s.category);
});

test('A series halves: each width is the previous height / 2 (to rounding)', () => {
  const a = PAPER_SIZES.filter((s) => s.category === 'A Series');
  for (let i = 1; i < a.length; i++) {
    assert.ok(Math.abs(a[i].height - a[i - 1].width) <= 1, a[i].name);
  }
});
