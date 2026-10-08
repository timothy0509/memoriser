import {
  chunksOf,
  clozeMask,
  compare,
  isDue,
  isMastered,
} from '@memoriser/core';
import type { TextDoc } from '@memoriser/content/parse';
import { store, todayStr } from './store.ts';
import type { State } from './store.ts';
import { allTexts, getText } from './texts.ts';
import { speak } from './tts.ts';

export const $ = <T extends Element = HTMLElement>(
  sel: string,
  el?: ParentNode
): T | null => (el || document).querySelector(sel) as T | null;
export const $$ = (sel: string, el?: ParentNode): HTMLElement[] =>
  [...(el || document).querySelectorAll(sel)] as HTMLElement[];
export const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function go(hash: string): void {
  location.hash = hash;
}

// Set by main.ts so rating buttons can refresh the current view.
export const viewBridge: { rerender: () => void } = {
  rerender: () => {},
};

export function studyURL(tid: string, chunk: number, stage: string): string {
  return '#/t/' + tid + '?chunk=' + chunk + '&stage=' + stage;
}

export function toast(msg: string): void {
  $('.toast')?.remove();
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}

function bodyChunks(t: TextDoc): string[] {
  return chunksOf(t.body, store.s.settings.chunkSize);
}

function mastery(t: TextDoc): { done: number; total: number; pct: number } {
  const cs = bodyChunks(t);
  if (!cs.length) return { done: 0, total: 0, pct: 0 };
  let done = 0;
  for (let i = 0; i < cs.length; i++)
    if (isMastered(store.getBox(t.id, i))) done++;
  return { done, total: cs.length, pct: Math.round((done / cs.length) * 100) };
}

interface DueItem {
  tid: string;
  i: number;
}

function dueChunks(): DueItem[] {
  const t = todayStr();
  const out: DueItem[] = [];
  for (const text of allTexts()) {
    bodyChunks(text).forEach((_, i) => {
      if (isDue(store.getBox(text.id, i), t)) out.push({ tid: text.id, i });
    });
  }
  return out;
}

/* ---------- home ---------- */

export function viewHome(app: HTMLElement): void {
  const texts = allTexts();
  let done = 0;
  let total = 0;
  const groups: Record<string, { done: number; total: number }> = {};
  for (const t of texts) {
    const m = mastery(t);
    done += m.done;
    total += m.total;
    groups[t.group] = groups[t.group] || { done: 0, total: 0 };
    groups[t.group].done += m.done;
    groups[t.group].total += m.total;
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  const due = dueChunks();
  const last = store.s.last && getText(store.s.last.tid);
  app.innerHTML =
    '<div class="card hero rise">' +
    '<div class="ring" style="--p:' +
    pct +
    '"><span><b>' +
    pct +
    '%</b><br><small>已背穩</small></span></div>' +
    '<div><h1>今日背咗未？</h1>' +
    '<p class="sub">' +
    done +
    ' / ' +
    total +
    ' 段背穩．課文轉錄自教育局《積學涵泳》。</p>' +
    '<div class="stat-row"><div class="stat"><b>' +
    store.streak() +
    '</b><small>連續溫習日數</small></div>' +
    '<div class="stat"><b>' +
    due.length +
    '</b><small>今日待溫段數</small></div>' +
    '<div class="stat"><b>' +
    store.s.errors.length +
    '</b><small>錯字本條目</small></div></div>' +
    '<div class="btn-row">' +
    (due.length
      ? '<button class="btn primary" id="goReview">開始今日複習（' +
        due.length +
        '段）</button>'
      : '<button class="btn primary" id="goLib">去篇章揀嘢背</button>') +
    (last
      ? '<button class="btn" id="goResume">繼續：' +
        esc(last.title) +
        '</button>'
      : '') +
    '</div></div></div>' +
    '<div class="grid two" style="margin-top:16px">' +
    '<div class="card rise" style="animation-delay:.08s"><h2>各類進度</h2>' +
    Object.entries(groups)
      .map(([g, m]) => {
        const p = m.total ? Math.round((m.done / m.total) * 100) : 0;
        return (
          '<div class="group-row"><span class="vlabel">' +
          esc(g) +
          '</span>' +
          '<div class="meter"><i style="width:' +
          p +
          '%"></i></div>' +
          '<span class="pct">' +
          p +
          '%</span></div>'
        );
      })
      .join('') +
    '</div>' +
    '<div class="card rise" style="animation-delay:.14s"><h2>點樣背最有效</h2>' +
    '<p class="sub" style="margin:0">先認讀兩遍，然後逐段遮罩自測，背到九成先默寫。標為「識晒」的段會自動排期再溫，唔使自己記。</p>' +
    '<div class="btn-row"><button class="btn small" id="goErrors">睇錯字本</button></div></div>' +
    '</div>';
  $('#goReview') && ($('#goReview')!.onclick = () => go('#/review'));
  $('#goLib') && ($('#goLib')!.onclick = () => go('#/lib'));
  if (last && $('#goResume')) {
    $('#goResume')!.onclick = () =>
      go(
        '#/t/' +
          store.s.last!.tid +
          '?chunk=' +
          (store.s.last!.chunk || 0) +
          '&stage=' +
          (store.s.last!.stage || 'read')
      );
  }
  $('#goErrors') && ($('#goErrors')!.onclick = () => go('#/errors'));
}

/* ---------- library ---------- */

function dotClass(tid: string, i: number): string {
  const bx = store.getBox(tid, i);
  if (!bx) return '';
  const lvl = bx.b <= 1 ? 's1' : bx.b === 2 ? 's2' : bx.b === 3 ? 's3' : 's4';
  return lvl + (bx.d <= todayStr() ? ' today' : '');
}

function dotsHTML(t: TextDoc, cur: number): string {
  return bodyChunks(t)
    .map(
      (_, i) =>
        '<span class="dot ' +
        dotClass(t.id, i) +
        (i === cur ? ' cur' : '') +
        '" data-i="' +
        i +
        '" title="第' +
        (i + 1) +
        '段"></span>'
    )
    .join('');
}

export function viewLib(app: HTMLElement): void {
  const groups: Record<string, TextDoc[]> = {};
  for (const t of allTexts()) {
    (groups[t.group] = groups[t.group] || []).push(t);
  }
  let html =
    '<h1 class="rise">篇章</h1><p class="sub rise">十八章，每章獨立計進度。圓點愈深色代表背得愈穩，紅圈係今日要溫。</p>';
  let d = 0;
  for (const [g, list] of Object.entries(groups)) {
    html +=
      '<div class="lib-group rise" style="animation-delay:' +
      (d += 60) +
      'ms"><h2>' +
      esc(g) +
      '</h2><span class="count">' +
      list.length +
      '章</span></div><div class="lib-grid">';
    for (const t of list) {
      const m = mastery(t);
      html +=
        '<a class="card clickable text-card rise" style="animation-delay:' +
        (d += 30) +
        'ms" href="#/t/' +
        t.id +
        '">' +
        '<div class="t">' +
        esc(t.title) +
        '</div><div class="a">' +
        esc(t.author || '') +
        (t.note ? '．' + esc(t.note) : '') +
        '</div>' +
        '<div class="a">' +
        m.done +
        '/' +
        m.total +
        '段．' +
        m.pct +
        '%</div><div class="meter"><i style="width:' +
        m.pct +
        '%"></i></div>' +
        '<div class="dots">' +
        dotsHTML(t, -1) +
        '</div></a>';
    }
    html += '</div>';
  }
  html +=
    '<hr class="rule"><div class="card rise"><h2>貼上自訂文本</h2>' +
    '<p class="kbd-hint">老師派的版本唔同，或者想背課外篇，貼入嚟一齊計進度。</p>' +
    '<p><input class="textlike" id="nt" placeholder="標題，例如 師說（班本）"></p>' +
    '<p><textarea class="custom" id="nb" placeholder="貼上全文……"></textarea></p>' +
    '<p><button class="btn primary" id="addT">加入背誦</button></p></div>';
  app.innerHTML = html;
  $('#addT')!.onclick = () => {
    const title =
      ($('[id="nt"]') as HTMLInputElement).value.trim() || '自訂文本';
    const body = ($('[id="nb"]') as HTMLTextAreaElement).value.trim();
    if (!body) {
      toast('請先貼上文本內容');
      return;
    }
    const id = 'custom-' + Date.now();
    store.s.customs.push({
      id,
      title,
      group: '自訂',
      author: '',
      note: '自行貼上',
      body: body + '\n',
    });
    store.persist();
    go('#/t/' + id);
  };
}

/* ---------- study ---------- */

export interface StudyRoute {
  tid: string;
  chunk: number;
  stage: string;
}

let examTimer: ReturnType<typeof setInterval> | null = null;

export function stopStudy(): void {
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
}

export function viewStudy(app: HTMLElement, r: StudyRoute): void {
  const t = getText(r.tid);
  if (!t) {
    app.innerHTML =
      '<div class="card"><p>搵唔到呢篇。</p><p><a href="#/lib">返篇章</a></p></div>';
    return;
  }
  const cs = bodyChunks(t);
  const chunk = Math.min(r.chunk, cs.length - 1);
  store.s.last = { tid: t.id, chunk, stage: r.stage };
  store.persist();
  const m = mastery(t);
  const stages: [string, string][] = [
    ['read', '認讀'],
    ['cloze', '遮罩'],
    ['recall', '默寫'],
    ['exam', '考試'],
  ];
  app.innerHTML =
    '<div class="study-head rise"><div><h1>' +
    esc(t.title) +
    '</h1>' +
    '<p class="sub">' +
    esc(t.group || '') +
    (t.author ? '．' + esc(t.author) : '') +
    (t.note ? '．' + esc(t.note) : '') +
    '．' +
    m.done +
    '/' +
    m.total +
    '段背穩</p></div>' +
    '<div class="btn-row" style="margin:0"><button class="btn small" id="speakAll">朗讀全文</button><button class="btn small" id="editT">編輯文本</button></div></div>' +
    '<div class="card rise" id="editBox" style="display:none;margin-bottom:14px"><textarea class="custom" id="editBody"></textarea>' +
    '<div class="btn-row"><button class="btn primary small" id="saveEdit">儲存</button><button class="btn small" id="cancelEdit">取消</button></div></div>' +
    '<div class="pager rise"><button class="btn small" id="prevC"' +
    (chunk <= 0 ? ' disabled' : '') +
    '>← 上一段</button>' +
    '<div class="dots">' +
    dotsHTML(t, chunk) +
    '</div><span class="pos">第' +
    (chunk + 1) +
    '/' +
    cs.length +
    '段</span>' +
    '<button class="btn small" id="nextC"' +
    (chunk >= cs.length - 1 ? ' disabled' : '') +
    '>下一段 →</button></div>' +
    '<div class="tabs rise">' +
    stages
      .map(
        ([k, lb]) =>
          '<button data-s="' +
          k +
          '" class="' +
          (r.stage === k ? 'active' : '') +
          '">' +
          lb +
          '</button>'
      )
      .join('') +
    '</div><div class="card rise" id="stage"></div>';
  $('#speakAll')!.onclick = () => speak(t.body);
  $$('.pager .dot').forEach((dt) => {
    dt.onclick = () =>
      go(studyURL(t.id, +(dt as HTMLElement).dataset.i!, r.stage));
  });
  $('#prevC')!.onclick = () =>
    chunk > 0 && go(studyURL(t.id, chunk - 1, r.stage));
  $('#nextC')!.onclick = () =>
    chunk < cs.length - 1 && go(studyURL(t.id, chunk + 1, r.stage));
  $$('.tabs button').forEach((b) => {
    b.onclick = () => go(studyURL(t.id, chunk, (b as HTMLElement).dataset.s!));
  });
  const eb = $('#editBox') as HTMLElement;
  $('#editT')!.onclick = () => {
    eb.style.display = eb.style.display === 'none' ? 'block' : 'none';
    ($('#editBody') as HTMLTextAreaElement).value = t.body.trimEnd();
  };
  $('#cancelEdit')!.onclick = () => {
    eb.style.display = 'none';
  };
  $('#saveEdit')!.onclick = () => {
    const body = ($('#editBody') as HTMLTextAreaElement).value.trim();
    if (!body) {
      toast('文本唔可以留空');
      return;
    }
    t.body = body + '\n';
    store.persist();
    toast('已儲存');
    renderStudy(t, chunk, r.stage);
  };
  renderStudy(t, chunk, r.stage);
}

function renderStudy(t: TextDoc, chunk: number, stage: string): void {
  const host = $('#stage') as HTMLElement;
  const cs = bodyChunks(t);
  if (stage === 'cloze') stageCloze(host, t, cs, chunk, null);
  else if (stage === 'recall') stageRecall(host, t, cs, chunk, null);
  else if (stage === 'exam') stageExam(host, t);
  else stageRead(host, t, cs);
}

function boxTag(tid: string, i: number): string {
  const bx = store.getBox(tid, i);
  if (!bx) return '<span class="box-tag">未背過</span>';
  const label =
    bx.b >= 4
      ? '滾瓜爛熟'
      : bx.b === 3
        ? '背穩'
        : bx.b === 2
          ? '大致識'
          : bx.b === 1
            ? '讀過'
            : '要重背';
  const due = bx.d <= todayStr() ? ' due' : '';
  return (
    '<span class="box-tag' +
    due +
    '">' +
    label +
    (bx.d > todayStr() ? '．' + bx.d.slice(5) + '再溫' : '．今日要溫') +
    '</span>'
  );
}

function rateRowHTML(): string {
  return (
    '<div class="rate-row"><span class="kbd-hint" style="align-self:center">誠實評分：</span>' +
    '<button class="btn small" data-r="0">唔識</button>' +
    '<button class="btn small" data-r="1">半識</button>' +
    '<button class="btn good small" data-r="2">識晒</button></div>'
  );
}

function refreshPagerDots(t: TextDoc, chunk: number): void {
  const p = $('.pager .dots');
  if (p) p.innerHTML = dotsHTML(t, chunk);
}

function stageRead(host: HTMLElement, t: TextDoc, cs: string[]): void {
  host.innerHTML =
    '<h2>認讀全文</h2><p class="kbd-hint">逐段慢讀，可以㩒喇叭聽發音。讀完一段就標熟悉，之後先去遮罩。</p>' +
    '<div class="btn-row"><button class="btn small" id="allSeen">全部標熟悉</button></div><div id="chunks"></div>';
  const box = $('#chunks', host) as HTMLElement;
  cs.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'chunk-block';
    d.innerHTML =
      '<div class="chunk-meta"><span>第' +
      (i + 1) +
      '段</span><span>' +
      boxTag(t.id, i) +
      '</span></div>' +
      '<div class="reader">' +
      esc(c) +
      '</div>' +
      '<div class="btn-row"><button class="btn small sp">朗讀此段</button><button class="btn small seen">標熟悉</button></div>';
    $('.sp', d)!.onclick = () => speak(c);
    $('.seen', d)!.onclick = () => {
      const bx = store.getBox(t.id, i);
      const b = Math.max(bx ? bx.b : 0, 1);
      store.setBox(t.id, i, { b, d: todayStr() });
      store.touchDay();
      store.persist();
      const cs2 = bodyChunks(t);
      stageRead(host, t, cs2);
      refreshPagerDots(t, parseRoute().chunk);
    };
    box.appendChild(d);
  });
  $('#allSeen', host)!.onclick = () => {
    cs.forEach((_, i) => {
      const bx = store.getBox(t.id, i);
      store.setBox(t.id, i, { b: Math.max(bx ? bx.b : 0, 1), d: todayStr() });
    });
    store.touchDay();
    store.persist();
    stageRead(host, t, cs);
    refreshPagerDots(t, parseRoute().chunk);
  };
}

interface QueueCtx {
  pos: number;
  total: number;
  next: () => void;
}

function stageCloze(
  host: HTMLElement,
  t: TextDoc,
  cs: string[],
  i: number,
  queue: QueueCtx | null
): void {
  const c = cs[i];
  const revealed = new Set<string>();
  const q = queue
    ? '<p class="kbd-hint">今日複習第 ' +
      (queue.pos + 1) +
      '/' +
      queue.total +
      ' 段．' +
      esc(t.title) +
      '</p>'
    : '';
  host.innerHTML =
    q +
    '<h2>遮罩自測．第' +
    (i + 1) +
    '段</h2>' +
    '<div class="controls"><label>遮罩 <input type="range" id="hl" min="10" max="85" value="' +
    store.s.settings.cloze +
    '"> <span id="hlv">' +
    store.s.settings.cloze +
    '%</span></label>' +
    '<label><input type="checkbox" id="fc"' +
    (store.s.settings.firstChar ? ' checked' : '') +
    '> 首字提示</label>' +
    '<label><input type="checkbox" id="kp"' +
    (store.s.settings.keepPunct ? ' checked' : '') +
    '> 保留標點</label>' +
    '<button class="btn small" id="rehide">重新遮罩</button>' +
    '<button class="btn small" id="spC">朗讀此段</button></div>' +
    '<div class="reader" id="cz"></div><p class="kbd-hint" id="rvCount"></p>' +
    rateRowHTML();
  const paint = (): void => {
    const mask = clozeMask(c, i, {
      ratio: store.s.settings.cloze,
      firstCharHint: store.s.settings.firstChar,
      keepPunct: store.s.settings.keepPunct,
    });
    const chars = [...c];
    let html = '';
    chars.forEach((ch, j) => {
      if (mask[j] && !revealed.has(i + ':' + j)) {
        html +=
          '<span class="blank" data-key="' +
          i +
          ':' +
          j +
          '" title="㩒一下揭開">？</span>';
      } else if (
        j === 0 ||
        (store.s.settings.firstChar &&
          /[。！？；…」』]/.test(chars[j - 1] || ''))
      ) {
        html += '<span class="hint">' + esc(ch) + '</span>';
      } else {
        html += esc(ch);
      }
    });
    ($('#cz', host) as HTMLElement).innerHTML = html;
    const blanks = $$('#cz .blank', host);
    ($('#rvCount', host) as HTMLElement).textContent =
      '仲有 ' + blanks.length + ' 格未揭．背唔到先㩒，唔好偷睇。';
    blanks.forEach((b) => {
      b.onclick = () => {
        revealed.add((b as HTMLElement).dataset.key!);
        const [, j] = (b as HTMLElement).dataset.key!.split(':').map(Number);
        b.classList.add('open');
        b.textContent = chars[j];
        ($('#rvCount', host) as HTMLElement).textContent =
          '仲有 ' + $$('#cz .blank', host).length + ' 格未揭。';
      };
    });
  };
  paint();
  ($('#hl', host) as HTMLInputElement).oninput = (e) => {
    store.s.settings.cloze = +(e.target as HTMLInputElement).value;
    ($('#hlv', host) as HTMLElement).textContent =
      (e.target as HTMLInputElement).value + '%';
    store.persist();
    paint();
  };
  ($('#fc', host) as HTMLInputElement).onchange = (e) => {
    store.s.settings.firstChar = (e.target as HTMLInputElement).checked;
    store.persist();
    paint();
  };
  ($('#kp', host) as HTMLInputElement).onchange = (e) => {
    store.s.settings.keepPunct = (e.target as HTMLInputElement).checked;
    store.persist();
    paint();
  };
  $('#rehide', host)!.onclick = () => {
    revealed.clear();
    paint();
  };
  $('#spC', host)!.onclick = () => speak(c);
  $$('[data-r]', host).forEach((b) => {
    b.onclick = () => {
      store.rate(t.id, i, +(b as HTMLElement).dataset.r! as 0 | 1 | 2);
      if (queue) {
        queue.next();
        return;
      }
      if (store.s.settings.autoNext && i < cs.length - 1)
        go(studyURL(t.id, i + 1, 'cloze'));
      else viewBridge.rerender();
    };
  });
}

function stageRecall(
  host: HTMLElement,
  t: TextDoc,
  cs: string[],
  i: number,
  queue: QueueCtx | null
): void {
  const c = cs[i];
  const q = queue
    ? '<p class="kbd-hint">今日複習第 ' +
      (queue.pos + 1) +
      '/' +
      queue.total +
      ' 段．' +
      esc(t.title) +
      '</p>'
    : '';
  host.innerHTML =
    q +
    '<h2>默寫．第' +
    (i + 1) +
    '段</h2><p class="kbd-hint">提示：' +
    esc(c.slice(0, 10)) +
    '……（唔使連標點，默完㩒批改）</p>' +
    '<textarea class="recall" id="ta" rows="4" placeholder="喺度默寫……"></textarea>' +
    '<div class="btn-row"><button class="btn primary" id="chk">批改</button><button class="btn small" id="peek">睇原文</button></div>' +
    '<div class="result" id="rs"></div><div id="rr"></div>';
  $('#chk', host)!.onclick = () => {
    const r = compare(
      c,
      ($('#ta', host) as HTMLTextAreaElement).value,
      store.s.settings.ignorePunct
    );
    ($('#rs', host) as HTMLElement).innerHTML =
      '<div class="score-line"><b>' +
      r.score +
      '</b><span>分．' +
      r.hits +
      '/' +
      r.total +
      '字</span></div>' +
      r.marks
        .map((mk) =>
          mk.cls === 'err'
            ? '<span class="err" title="應作「' +
              esc(mk.want || '') +
              '」">' +
              esc(mk.t || '？') +
              '</span>'
            : '<span class="' + mk.cls + '">' + esc(mk.t || '') + '</span>'
        )
        .join('');
    store.logErrors(t.id, i, r.errors);
    store.rate(t.id, i, r.score >= 90 ? 2 : r.score >= 60 ? 1 : 0, true);
    store.touchDay();
    store.persist();
    ($('#rr', host) as HTMLElement).innerHTML =
      '<p class="kbd-hint">已按分數更新排期（90+ 識晒，60+ 聽日再溫，否則即刻重背）。唔同意可以手動改：</p>' +
      rateRowHTML();
    $$('[data-r]', host).forEach((b) => {
      b.onclick = () => {
        store.rate(t.id, i, +(b as HTMLElement).dataset.r! as 0 | 1 | 2);
        if (queue) {
          queue.next();
          return;
        }
        if (store.s.settings.autoNext && r.score >= 90 && i < cs.length - 1)
          go(studyURL(t.id, i + 1, 'recall'));
        else viewBridge.rerender();
      };
    });
    refreshPagerDots(t, i);
  };
  $('#peek', host)!.onclick = () => {
    ($('#rs', host) as HTMLElement).innerHTML =
      '<div class="reader">' + esc(c) + '</div>';
  };
}

function stageExam(host: HTMLElement, t: TextDoc): void {
  host.innerHTML =
    '<h2>考試．全文默寫</h2>' +
    '<div class="controls"><label>限時 <select class="textlike" id="tmin" style="width:auto"><option value="0">唔限</option><option value="5">5 分鐘</option><option value="10">10 分鐘</option><option value="20">20 分鐘</option></select></label>' +
    '<span class="timer" id="tmr"></span></div>' +
    '<textarea class="recall" id="full" rows="8" placeholder="喺度默寫全文……"></textarea>' +
    '<div class="btn-row"><button class="btn primary" id="chkF">交卷批改</button></div><div class="result" id="fres"></div>';
  $('#chkF', host)!.onclick = () => {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
      ($('#tmr', host) as HTMLElement).textContent = '';
    }
    const r = compare(
      t.body,
      ($('#full', host) as HTMLTextAreaElement).value,
      store.s.settings.ignorePunct
    );
    ($('#fres', host) as HTMLElement).innerHTML =
      '<div class="score-line"><b>' +
      r.score +
      '</b><span>分．' +
      r.hits +
      '/' +
      r.total +
      '字</span></div>' +
      r.marks
        .map((mk) =>
          mk.cls === 'err'
            ? '<span class="err" title="應作「' +
              esc(mk.want || '') +
              '」">' +
              esc(mk.t || '？') +
              '</span>'
            : '<span class="' + mk.cls + '">' + esc(mk.t || '') + '</span>'
        )
        .join('');
    store.logErrors(t.id, -1, r.errors);
    store.touchDay();
    store.persist();
    if (r.score >= 85) {
      bodyChunks(t).forEach((_, i) => {
        const bx = store.getBox(t.id, i);
        if (!bx || bx.b < 3) store.setBox(t.id, i, { b: 3, d: todayStr() });
      });
      toast('85+，全篇排期一星期後再溫');
    } else {
      toast('未達 85，返去逐段背');
    }
  };
  ($('#tmin', host) as HTMLSelectElement).onchange = (e) => {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    const mins = +((e.target as HTMLSelectElement).value || 0);
    if (!mins) {
      ($('#tmr', host) as HTMLElement).textContent = '';
      return;
    }
    let left = mins * 60;
    const tick = (): void => {
      const mm = String(Math.floor(left / 60)).padStart(2, '0');
      const ss = String(left % 60).padStart(2, '0');
      ($('#tmr', host) as HTMLElement).textContent = '剩餘 ' + mm + ':' + ss;
      if (left <= 0) {
        if (examTimer) clearInterval(examTimer);
        examTimer = null;
        toast('時間到，自動交卷');
        ($('#chkF', host) as HTMLButtonElement).click();
        return;
      }
      left--;
    };
    tick();
    examTimer = setInterval(tick, 1000);
  };
}

/* ---------- review queue ---------- */

export function viewReview(app: HTMLElement): void {
  const queue = dueChunks();
  if (!queue.length) {
    app.innerHTML =
      '<div class="card rise"><h2>今日複習</h2><p>全部溫晒，聽日再嚟。去篇章超前背新嘢都得。</p><div class="btn-row"><button class="btn primary" id="bLib">去篇章</button></div></div>';
    $('#bLib')!.onclick = () => go('#/lib');
    return;
  }
  let pos = 0;
  app.innerHTML =
    '<div class="queue-bar rise"><h1 style="margin:0">今日複習</h1><span class="kbd-hint" id="qpos"></span></div><div class="card rise" id="qstage" style="margin-top:12px"></div>';
  const step = (): void => {
    if (pos >= queue.length) {
      ($('#qstage') as HTMLElement).innerHTML =
        '<h2>溫完</h2><p>今日排期的段數清晒。連續溫習先記得穩。</p><div class="btn-row"><button class="btn primary" id="qHome">返主頁</button></div>';
      $('#qHome')!.onclick = () => go('#/');
      ($('#qpos') as HTMLElement).textContent =
        queue.length + '/' + queue.length;
      return;
    }
    const item = queue[pos];
    const t = getText(item.tid)!;
    ($('#qpos') as HTMLElement).textContent = pos + 1 + '/' + queue.length;
    stageCloze($('#qstage') as HTMLElement, t, bodyChunks(t), item.i, {
      pos,
      total: queue.length,
      next: () => {
        pos++;
        step();
      },
    });
  };
  step();
}

/* ---------- errors ---------- */

export function viewErrors(app: HTMLElement): void {
  const byText: Record<string, { tid: string; i: number; s: string }[]> = {};
  for (const e of store.s.errors) {
    (byText[e.tid] = byText[e.tid] || []).push(e);
  }
  const tids = Object.keys(byText);
  if (!tids.length) {
    app.innerHTML =
      '<div class="card rise"><h2>錯字本</h2><p>暫時係白紙。去默寫，錯的字會自動記低。</p></div>';
    return;
  }
  let html =
    '<h1 class="rise">錯字本</h1><p class="sub rise">㩒段數可以直接跳去重默。</p>';
  for (const tid of tids) {
    const t = getText(tid);
    const freq: Record<string, { s: string; i: number; n: number }> = {};
    for (const e of byText[tid]) {
      const k = e.s + '|' + e.i;
      freq[k] = freq[k] || { s: e.s, i: e.i, n: 0 };
      freq[k].n++;
    }
    const top = Object.values(freq)
      .sort((a, b) => b.n - a.n)
      .slice(0, 30);
    html +=
      '<div class="card rise" style="margin-bottom:14px"><h2>' +
      esc(t ? t.title : tid) +
      '</h2>' +
      '<table class="err-table"><tr><th>錯處</th><th>次數</th><th></th></tr>' +
      top
        .map(
          (e) =>
            '<tr><td>' +
            esc(e.s) +
            '</td><td>× ' +
            e.n +
            '</td><td>' +
            (t && e.i >= 0
              ? '<a href="' +
                studyURL(tid, e.i, 'recall') +
                '">去第' +
                (e.i + 1) +
                '段重默</a>'
              : '全文默寫') +
            '</td></tr>'
        )
        .join('') +
      '</table></div>';
  }
  html +=
    '<div class="btn-row"><button class="btn small" id="clrErr">清空錯字本</button></div>';
  app.innerHTML = html;
  $('#clrErr')!.onclick = () => {
    store.s.errors = [];
    store.persist();
    viewErrors(app);
  };
}

/* ---------- settings ---------- */

export function viewSettings(app: HTMLElement): void {
  const s = store.s.settings;
  app.innerHTML =
    '<h1 class="rise">設定</h1><div class="card rise">' +
    '<h3>分段</h3>' +
    '<div class="controls"><label>每段句數 <select class="textlike" id="stChunk" style="width:auto"><option value="1">1 句</option><option value="2">2 句</option><option value="3">3 句</option><option value="99">成篇一段</option></select></label>' +
    '<span class="kbd-hint">轉分段會令舊排期對唔返，要由頭排過</span></div><hr class="rule">' +
    '<h3>遮罩</h3>' +
    '<div class="controls"><label>預設遮罩 <input type="range" id="stCloze" min="10" max="85" value="' +
    s.cloze +
    '"> <span id="stClozeV">' +
    s.cloze +
    '%</span></label>' +
    '<label><input type="checkbox" id="stFirst"' +
    (s.firstChar ? ' checked' : '') +
    '> 首字提示</label>' +
    '<label><input type="checkbox" id="stKeep"' +
    (s.keepPunct ? ' checked' : '') +
    '> 保留標點</label>' +
    '<label><input type="checkbox" id="stNext"' +
    (s.autoNext ? ' checked' : '') +
    '>評分後自動下一段</label></div><hr class="rule">' +
    '<h3>默寫</h3>' +
    '<div class="controls"><label><input type="checkbox" id="stIg"' +
    (s.ignorePunct ? ' checked' : '') +
    '>忽略標點計分</label></div><hr class="rule">' +
    '<h3>朗讀同字體</h3>' +
    '<div class="controls"><label>聲 <select class="textlike" id="stVoice" style="width:auto;max-width:280px"></select></label>' +
    '<label>語速 <input type="range" id="stRate" min="50" max="120" value="' +
    Math.round(s.rate * 100) +
    '"></label>' +
    '<label>字體 <input type="range" id="stFs" min="16" max="26" value="' +
    s.fontSize +
    '"></label></div><hr class="rule">' +
    '<h3>備份</h3>' +
    '<div class="btn-row"><button class="btn small" id="expBtn">匯出進度</button><label class="btn small" style="cursor:pointer">匯入進度<input type="file" id="impFile" accept="application/json" style="display:none"></label><button class="btn small" id="wipeBtn">清除全部進度</button></div>' +
    '</div>';
  ($('#stChunk') as HTMLSelectElement).value = String(s.chunkSize);
  ($('#stChunk') as HTMLSelectElement).onchange = (e) => {
    s.chunkSize = +((e.target as HTMLSelectElement).value || 2);
    store.persist();
    toast('分段已轉，排期由頭計');
  };
  ($('#stCloze') as HTMLInputElement).oninput = (e) => {
    s.cloze = +((e.target as HTMLInputElement).value || 40);
    ($('#stClozeV') as HTMLElement).textContent =
      (e.target as HTMLInputElement).value + '%';
    store.persist();
  };
  ($('#stFirst') as HTMLInputElement).onchange = (e) => {
    s.firstChar = (e.target as HTMLInputElement).checked;
    store.persist();
  };
  ($('#stKeep') as HTMLInputElement).onchange = (e) => {
    s.keepPunct = (e.target as HTMLInputElement).checked;
    store.persist();
  };
  ($('#stNext') as HTMLInputElement).onchange = (e) => {
    s.autoNext = (e.target as HTMLInputElement).checked;
    store.persist();
  };
  ($('#stIg') as HTMLInputElement).onchange = (e) => {
    s.ignorePunct = (e.target as HTMLInputElement).checked;
    store.persist();
  };
  ($('#stRate') as HTMLInputElement).oninput = (e) => {
    s.rate = +((e.target as HTMLInputElement).value || 85) / 100;
    store.persist();
  };
  ($('#stFs') as HTMLInputElement).oninput = (e) => {
    s.fontSize = +((e.target as HTMLInputElement).value || 19);
    document.documentElement.style.setProperty('--fs', s.fontSize + 'px');
    store.persist();
  };
  renderVoices();
  $('#expBtn')!.onclick = () => {
    const blob = new Blob([JSON.stringify(store.s)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backshubang-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  ($('#impFile') as HTMLInputElement).onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result)) as Partial<State>;
        if (!d.settings || !d.boxes) throw new Error('bad backup');
        store.s = { ...store.s, ...d };
        store.persist();
        toast('匯入成功');
      } catch {
        toast('檔案唔啱格式');
      }
    };
    r.readAsText(f);
  };
  $('#wipeBtn')!.onclick = () => {
    if (!confirm('真係清晒？補唔返。')) return;
    store.s.boxes = {};
    store.s.errors = [];
    store.s.days = {};
    store.persist();
    viewSettings(app);
  };
}

function renderVoices(): void {
  const sel = $('#stVoice') as HTMLSelectElement | null;
  if (!sel) return;
  let vs: SpeechSynthesisVoice[] = [];
  try {
    vs = speechSynthesis
      .getVoices()
      .filter((v) => v.lang && v.lang.toLowerCase().startsWith('zh'));
  } catch {
    vs = [];
  }
  sel.innerHTML = vs.length
    ? vs
        .map(
          (v) =>
            '<option value="' +
            esc(v.voiceURI) +
            '">' +
            esc(v.name) +
            '．' +
            esc(v.lang) +
            '</option>'
        )
        .join('')
    : '<option value="">用系統預設（搵唔到中文聲）</option>';
  sel.value = store.s.settings.voiceURI;
  sel.onchange = () => {
    store.s.settings.voiceURI = sel.value;
    store.persist();
    speak('背書幫，今日背咗未');
  };
}

// The router lives in main.ts; study views need the current route for dot refresh.
export function parseRoute(): { chunk: number } {
  const h = location.hash || '#/';
  const m = h.match(/^#\/t\/([^?]+)(?:\?(.*))?$/);
  const q = Object.fromEntries(new URLSearchParams(m?.[2] || ''));
  return { chunk: Math.max(0, +q.chunk || 0) };
}
