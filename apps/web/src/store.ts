import type { BoxState, Rating } from '@memoriser/core';
import { rate as rateBox } from '@memoriser/core';
import type { TextDoc } from '@memoriser/content/parse';

export interface Settings {
  chunkSize: number;
  cloze: number;
  firstChar: boolean;
  keepPunct: boolean;
  ignorePunct: boolean;
  rate: number;
  voiceURI: string;
  fontSize: number;
  autoNext: boolean;
}

export interface ErrorEntry {
  tid: string;
  i: number;
  s: string;
  d: string;
}

export interface State {
  customs: TextDoc[];
  boxes: Record<string, Record<number, BoxState>>;
  errors: ErrorEntry[];
  days: Record<string, number>;
  settings: Settings;
  last: { tid: string; chunk: number; stage: string } | null;
}

export const KEY = 'memoriser-v3';
const DAY = 86400000;

export function defaultSettings(): Settings {
  return {
    chunkSize: 2,
    cloze: 40,
    firstChar: true,
    keepPunct: true,
    ignorePunct: true,
    rate: 0.85,
    voiceURI: '',
    fontSize: 19,
    autoNext: true,
  };
}

export function todayStr(d?: number): string {
  const t = d ? new Date(d) : new Date();
  return (
    t.getFullYear() +
    '-' +
    String(t.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(t.getDate()).padStart(2, '0')
  );
}

function fresh(): State {
  return {
    customs: [],
    boxes: {},
    errors: [],
    days: {},
    settings: defaultSettings(),
    last: null,
  };
}

export const store = {
  s: fresh(),

  load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<State>;
        this.s = {
          ...fresh(),
          ...d,
          settings: { ...defaultSettings(), ...(d.settings || {}) },
        };
        return;
      }
    } catch {
      /* fresh start */
    }
    // Carry over v2 boxes so existing users keep their schedule.
    try {
      const v2 = JSON.parse(localStorage.getItem('memoriser-v2') || '{}') as {
        boxes?: Record<string, Record<string, BoxState>>;
      };
      if (v2.boxes) this.s.boxes = v2.boxes as State['boxes'];
    } catch {
      /* ignore */
    }
  },

  persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      /* storage full */
    }
  },

  boxKey(tid: string): string {
    return tid + ':' + this.s.settings.chunkSize;
  },

  getBox(tid: string, i: number): BoxState | undefined {
    return (this.s.boxes[this.boxKey(tid)] || {})[i];
  },

  setBox(tid: string, i: number, b: BoxState): void {
    const k = this.boxKey(tid);
    this.s.boxes[k] = this.s.boxes[k] || {};
    this.s.boxes[k][i] = b;
    this.persist();
  },

  rate(tid: string, i: number, r: Rating, silent = false): void {
    this.setBox(tid, i, rateBox(this.getBox(tid, i), r, todayStr()));
    this.touchDay();
    this.persist();
    if (!silent) {
      const { toast } = uiBridge;
      toast(
        r === 2
          ? '記低，下次再溫'
          : r === 1
            ? '聽日再溫呢段'
            : '唔緊要，即刻再背過'
      );
    }
  },

  touchDay(): void {
    const t = todayStr();
    this.s.days[t] = (this.s.days[t] || 0) + 1;
  },

  streak(): number {
    let n = 0;
    let d = Date.now();
    if (!this.s.days[todayStr()]) d -= DAY;
    while (this.s.days[todayStr(d)]) {
      n++;
      d -= DAY;
    }
    return n;
  },

  logErrors(tid: string, i: number, list: string[]): void {
    if (!list.length) return;
    this.s.errors = this.s.errors
      .concat(list.slice(0, 60).map((s) => ({ tid, i, s, d: todayStr() })))
      .slice(-300);
    this.persist();
  },
};

// Set by main.ts to avoid a store -> UI import cycle.
export const uiBridge: { toast: (msg: string) => void } = {
  toast: () => {},
};
