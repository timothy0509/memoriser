// Cloze masking decisions. Returns one entry per character: true means hide.
// Deterministic so a chunk looks the same on every render until settings change.
const PUNCT =
  /[\s，。、；：！？「」『』（）《》〈〉…—－・·""''.,;:!?()\[\]─…]/g;

export interface ClozeOptions {
  ratio: number;
  firstCharHint: boolean;
  keepPunct: boolean;
}

function rand(i: number, j: number): number {
  return ((i * 9301 + j * 49297) % 233280) / 233280;
}

export function clozeMask(
  chunk: string,
  chunkIndex: number,
  opts: ClozeOptions
): boolean[] {
  const chars = [...chunk];
  return chars.map((ch, j) => {
    const p = ch.replace(PUNCT, '') === '';
    if (p && opts.keepPunct) return false;
    const first =
      j === 0 ||
      (opts.firstCharHint && /[。！？；…」』]/.test(chars[j - 1] || ''));
    if (first && opts.firstCharHint) return false;
    if (p) return false;
    return rand(chunkIndex, j) < opts.ratio / 100;
  });
}
