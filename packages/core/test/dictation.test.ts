import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dictationOf,
  isWriteChar,
  paragraphsOf,
  writableCount,
} from '../src/dictation.ts';

test('paragraphs split on original line breaks, blank lines dropped', () => {
  assert.deepEqual(paragraphsOf('甲乙丙。\n\n丁戊己。\n  \n庚辛。\n'), [
    '甲乙丙。',
    '丁戊己。',
    '庚辛。',
  ]);
});

test('does not use sentence chunking inside a paragraph', () => {
  const paras = paragraphsOf(
    '慶曆四年春，滕子京謫守巴陵郡。越明年，政通人和。\n予觀夫巴陵勝狀。\n'
  );
  assert.equal(paras.length, 2);
  assert.ok(paras[0].includes('越明年'));
});

test('han letters and digits are writable, punctuation pre-filled', () => {
  assert.equal(isWriteChar('學'), true);
  assert.equal(isWriteChar('一'), true);
  assert.equal(isWriteChar('A'), true);
  assert.equal(isWriteChar('3'), true);
  assert.equal(isWriteChar('〇'), true);
  for (const p of [
    '。',
    '，',
    '、',
    '；',
    '：',
    '？',
    '！',
    '「',
    '」',
    '『',
    '』',
    '（',
    '）',
    '《',
    '》',
    '…',
    '—',
    '·',
    '.',
    ',',
    '"',
    ':',
  ]) {
    assert.equal(isWriteChar(p), false, p + ' should be punctuation');
  }
});

test('each non-space character gets one cell', () => {
  const [para] = dictationOf('子曰：「仁。」\n');
  const kinds = para.cells.map((c) => (c.write ? '.' : c.ch)).join('');
  assert.equal(para.cells.length, 7);
  assert.equal(kinds, '..：「.。」');
  assert.equal(
    para.cells
      .filter((c) => c.write)
      .map((c) => c.ch)
      .join(''),
    '子曰仁'
  );
});

test('inner spaces produce no boxes', () => {
  const [para] = dictationOf('a b c\n');
  assert.equal(para.cells.length, 3);
  assert.ok(para.cells.every((c) => c.write));
});

test('writableCount sums empty boxes across paragraphs', () => {
  const paras = dictationOf('甲乙。\n丙丁戊，\n');
  assert.equal(writableCount(paras), 5);
});
