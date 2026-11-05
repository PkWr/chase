import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, convertFromMM, convertToMM, formatValue } from '../src/units.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('mm is identity', () => {
  assert.equal(convertToMM(10, 'mm'), 10);
  assert.equal(convertFromMM(10, 'mm'), 10);
});

test('pt and pc convert with fixed factors', () => {
  near(convertToMM(12, 'pt'), 4.2336);
  near(convertToMM(1, 'pc'), 4.2336);
  near(convertFromMM(4.2336, 'pc'), 1);
});

test('em depends on type size (default 12pt)', () => {
  near(convertToMM(1, 'em', 10), 3.528);
  near(convertToMM(1, 'em'), 12 * 0.3528);
  near(convertFromMM(3.528, 'em', 10), 1);
});

test('round trip for every unit', () => {
  for (const unit of Object.keys(UNITS)) {
    near(convertFromMM(convertToMM(7.5, unit, 9), unit, 9), 7.5);
  }
});

test('formatValue', () => {
  assert.equal(formatValue(3.14159, 'mm'), '3.14 mm');
  assert.equal(formatValue(2, 'pc', 0), '2 pc');
});
