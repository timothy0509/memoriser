import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../src/scoring.ts';
import { clozeMask } from '../src/cloze.ts';

test('perfect recall scores 100', () => {
  const r = compare('學不可以已。', '學不可以已');
  assert.equal(r.score, 100);
  assert.deepEqual(r.errors, []);
});

test('wrong and missing characters are reported', () => {
  const r = compare('青取之於藍', '青取之於黑');
  assert.ok(r.score < 100);
  assert.ok(r.errors.some((e) => e.includes('應「藍」誤「黑」')));
  const miss = compare('甲乙', '甲');
  assert.ok(miss.errors.some((e) => e.includes('漏「乙」')));
});

test('cloze mask is deterministic and honours hints', () => {
  const a = clozeMask('學不可以已。', 0, {
    ratio: 40,
    firstCharHint: true,
    keepPunct: true,
  });
  const b = clozeMask('學不可以已。', 0, {
    ratio: 40,
    firstCharHint: true,
    keepPunct: true,
  });
  assert.deepEqual(a, b);
  assert.equal(a[0], false);
  assert.equal(a[a.length - 1], false);
});
