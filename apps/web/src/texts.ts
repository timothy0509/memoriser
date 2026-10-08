import { parseTextFile } from '@memoriser/content/parse';
import type { TextDoc } from '@memoriser/content/parse';
import { store } from './store.ts';

// Pedagogical order, not alphabetical: 論仁/論孝/論君子 must stay in sequence.
const ORDER = [
  'liuguo',
  'chushibiao',
  'quanxue',
  'shanju',
  'yuedu',
  'denglou',
  'xishan',
  'yueyanglou',
  'shishuo',
  'lianpo',
  'niannujiao',
  'shengshengman',
  'qingyuan',
  'lunren',
  'lunxiao',
  'lunjunzi',
  'xiaoyaoyou',
  'yuwu',
];

const raw = import.meta.glob('../../../packages/content/texts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const builtins: TextDoc[] = Object.values(raw)
  .map((s) => parseTextFile(s))
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

export function allTexts(): TextDoc[] {
  return [...builtins, ...store.s.customs];
}

export function getText(id: string): TextDoc | undefined {
  return allTexts().find((t) => t.id === id);
}
