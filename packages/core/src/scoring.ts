// Recall scoring. Compares character by character after normalisation.
const PUNCT =
  /[\s，。、；：！？「」『』（）《》〈〉…—－・·""''.,;:!?()\[\]─…]/g;

export function normalize(s: string, ignorePunct: boolean): string {
  return ignorePunct ? s.replace(PUNCT, '') : s.replace(/\s/g, '');
}

export interface Mark {
  t: string;
  cls: 'ok' | 'err' | 'miss';
  want?: string;
}

export interface Score {
  score: number;
  hits: number;
  total: number;
  marks: Mark[];
  errors: string[];
}

export function compare(
  expected: string,
  typed: string,
  ignorePunct = true
): Score {
  const e = normalize(expected, ignorePunct);
  const t = normalize(typed, ignorePunct);
  const n = Math.max(e.length, t.length);
  let hits = 0;
  const marks: Mark[] = [];
  const errors: string[] = [];
  for (let i = 0; i < n; i++) {
    const ec = e[i];
    const tc = t[i];
    if (ec === undefined) marks.push({ t: tc, cls: 'err' });
    else if (tc === undefined) {
      marks.push({ t: ec, cls: 'miss' });
      errors.push('漏「' + ec + '」');
    } else if (ec === tc) {
      hits++;
      marks.push({ t: tc, cls: 'ok' });
    } else {
      marks.push({ t: tc, cls: 'err', want: ec });
      errors.push('應「' + ec + '」誤「' + tc + '」');
    }
  }
  return {
    score: e.length ? Math.round((hits / e.length) * 100) : 0,
    marks,
    errors,
    hits,
    total: e.length,
  };
}
