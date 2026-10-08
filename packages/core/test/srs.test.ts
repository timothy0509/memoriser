import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rate, isDue, isMastered, shiftDay } from '../src/srs.ts';

const TODAY = '2026-10-08';

test('solid steps up the ladder 1/3/7/14/30', () => {
  assert.deepEqual(rate(undefined, 2, TODAY), { b: 1, d: '2026-10-09' });
  assert.deepEqual(rate({ b: 1, d: TODAY }, 2, TODAY), {
    b: 2,
    d: '2026-10-11',
  });
  assert.deepEqual(rate({ b: 2, d: TODAY }, 2, TODAY), {
    b: 3,
    d: '2026-10-15',
  });
  assert.deepEqual(rate({ b: 4, d: TODAY }, 2, TODAY), {
    b: 5,
    d: '2026-11-07',
  });
  assert.deepEqual(rate({ b: 5, d: TODAY }, 2, TODAY), {
    b: 5,
    d: '2026-11-07',
  });
});

test('shaky repeats tomorrow, fumbled resets to today', () => {
  assert.deepEqual(rate({ b: 3, d: TODAY }, 1, TODAY), {
    b: 3,
    d: '2026-10-09',
  });
  assert.deepEqual(rate({ b: 3, d: TODAY }, 0, TODAY), { b: 0, d: TODAY });
});

test('due and mastered flags', () => {
  assert.equal(isDue(undefined, TODAY), true);
  assert.equal(isDue({ b: 1, d: '2026-10-09' }, TODAY), false);
  assert.equal(isDue({ b: 1, d: TODAY }, TODAY), true);
  assert.equal(isMastered({ b: 2, d: TODAY }), false);
  assert.equal(isMastered({ b: 3, d: TODAY }), true);
});

test('shifts across month boundary', () => {
  assert.equal(shiftDay('2026-01-31', 1), '2026-02-01');
});
