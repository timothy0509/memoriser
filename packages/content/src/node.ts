// Node-only loader. Kept separate so the parser stays importable on mobile.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTextFile } from '../src/parse.ts';
import type { TextDoc } from '../src/parse.ts';

export function textsDir(): string {
  return join(new URL('.', import.meta.url).pathname, '..', 'texts');
}

export function loadTexts(dir = textsDir()): TextDoc[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseTextFile(readFileSync(join(dir, f), 'utf8')));
}
