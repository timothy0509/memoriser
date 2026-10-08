import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sentencesOf, chunksOf } from '../src/chunks.ts';

test('splits on sentence punctuation', () => {
  assert.deepEqual(sentencesOf('君子曰：學。子曰：仁。'), [
    '君子曰：學。',
    '子曰：仁。',
  ]);
});

test('keeps short annotation lines whole', () => {
  assert.deepEqual(sentencesOf('（一）子曰：「仁。」'), [
    '（一）子曰：「仁。」',
  ]);
});

test('chunks group sentences by size', () => {
  assert.deepEqual(chunksOf('甲。天。乙。地。', 2), ['甲。天。', '乙。地。']);
  assert.equal(chunksOf('甲。天。', 99).length, 1);
});
