// Leitner scheduling. Dates are yyyy-mm-dd strings so any platform can
// compare them with plain string comparison. No clock access in here.
export const INTERVALS = [0, 1, 3, 7, 14, 30];

export interface BoxState {
  /** 0 new/fumbled .. 5 overlearnt */
  b: number;
  /** next review date */
  d: string;
}

/** 0 fumbled, 1 shaky, 2 solid */
export type Rating = 0 | 1 | 2;

export function shiftDay(today: string, n: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * 86400000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

export function rate(
  cur: BoxState | undefined,
  r: Rating,
  today: string
): BoxState {
  const b0 = cur ? cur.b : 0;
  if (r === 0) return { b: 0, d: today };
  if (r === 1) return { b: Math.max(b0, 1), d: shiftDay(today, 1) };
  const b = Math.min(5, b0 + 1);
  return { b, d: shiftDay(today, INTERVALS[b]) };
}

export function isDue(box: BoxState | undefined, today: string): boolean {
  return !box || box.d <= today;
}

export function isMastered(box: BoxState | undefined): boolean {
  return !!box && box.b >= 3;
}
