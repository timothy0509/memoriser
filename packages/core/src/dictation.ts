// Dictation paper model. Pure, no DOM: splits the original body into
// paragraphs (original line breaks, not study chunks) and maps every
// character to a grid cell. Letters and numbers get an empty writable box;
// everything else visible (CJK / ASCII punctuation, symbols) is pre-filled.
export interface DictationCell {
  ch: string;
  write: boolean;
}

export interface DictationPara {
  text: string;
  cells: DictationCell[];
}

// Ideographic number 〇 (U+3007) is neither L nor N, but must be writable.
const WRITABLE = /[\p{L}\p{N}〇]/u;

export function isWriteChar(ch: string): boolean {
  return WRITABLE.test(ch);
}

export function paragraphsOf(body: string): string[] {
  return body
    .split('\n')
    .map((ln) => ln.trim())
    .filter((ln) => ln.length > 0);
}

export function dictationOf(body: string): DictationPara[] {
  return paragraphsOf(body).map((text) => {
    const cells: DictationCell[] = [];
    for (const ch of text) {
      if (/\s/.test(ch)) continue;
      cells.push({ ch, write: isWriteChar(ch) });
    }
    return { text, cells };
  });
}

export function writableCount(paras: DictationPara[]): number {
  let n = 0;
  for (const p of paras) for (const c of p.cells) if (c.write) n++;
  return n;
}
