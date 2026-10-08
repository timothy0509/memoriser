import { dictationOf, writableCount } from '@memoriser/core';
import { allTexts, getText } from './texts.ts';
import { $, esc, go } from './views.ts';

export type PaperMode = 'blank' | 'key';

export function paperURL(tid: string, mode: PaperMode = 'blank'): string {
  return '#/t/' + tid + (mode === 'key' ? '/key' : '/paper');
}

export function viewPaper(
  app: HTMLElement,
  tid: string,
  mode: PaperMode = 'blank'
): void {
  const texts = allTexts();
  const t = getText(tid) || texts[0];
  if (!t) {
    app.innerHTML =
      '<div class="card"><p>未有篇章。</p><p><a href="#/lib">返篇章</a></p></div>';
    return;
  }
  const paras = dictationOf(t.body);
  const total = writableCount(paras);

  let html =
    '<div class="paper-toolbar rise">' +
    '<div class="btn-row" style="margin:0">' +
    '<button class="btn small" id="paperBack">← 返去背誦</button>' +
    '<button class="btn small" id="paperBlank"' +
    (mode === 'blank' ? ' disabled' : '') +
    '>默書紙</button>' +
    '<button class="btn small" id="paperKey"' +
    (mode === 'key' ? ' disabled' : '') +
    '>答案</button>' +
    '<button class="btn primary small" id="paperPrint">列印 / 存為 PDF</button>' +
    '</div>' +
    '<div class="controls" style="margin:0"><label>篇章 <select class="textlike" id="paperPick" style="width:auto;max-width:260px">' +
    texts
      .map(
        (x) =>
          '<option value="' +
          esc(x.id) +
          '"' +
          (x.id === t.id ? ' selected' : '') +
          '>' +
          esc(x.title) +
          '</option>'
      )
      .join('') +
    '</select></label>' +
    '<span class="kbd-hint">' +
    paras.length +
    '段原文．共' +
    total +
    '格要默．標點已印好。</span></div></div>' +
    '<article class="paper rise">' +
    '<header class="paper-head">' +
    '<div class="paper-title">' +
    esc(t.title) +
    '</div>' +
    '<div class="paper-sub">' +
    esc([t.group, t.author, t.note].filter(Boolean).join('．')) +
    (mode === 'key' ? '．答案' : '．默書紙') +
    '</div>' +
    '<div class="paper-fields"><span>姓名：＿＿＿＿</span><span>班別：＿＿＿＿</span><span>日期：＿＿＿＿</span><span>分數：＿＿＿＿</span></div>' +
    '</header>';

  paras.forEach((p, i) => {
    const n = p.cells.filter((c) => c.write).length;
    html +=
      '<section class="paper-para"><div class="paper-para-head"><span>第' +
      (i + 1) +
      '段</span><span class="paper-count">' +
      n +
      '字</span></div><div class="paper-grid">';
    for (const c of p.cells) {
      html +=
        c.write && mode !== 'key'
          ? '<span class="cell"></span>'
          : c.write
            ? '<span class="cell answer">' + esc(c.ch) + '</span>'
            : '<span class="cell filled">' + esc(c.ch) + '</span>';
    }
    html += '</div></section>';
  });

  html += '</article>';
  app.innerHTML = html;

  ($('#paperBack') as HTMLButtonElement).onclick = () =>
    go('#/t/' + t.id + '?chunk=0&stage=read');
  ($('#paperPrint') as HTMLButtonElement).onclick = () => window.print();
  ($('#paperBlank') as HTMLButtonElement).onclick = () =>
    go(paperURL(t.id, 'blank'));
  ($('#paperKey') as HTMLButtonElement).onclick = () =>
    go(paperURL(t.id, 'key'));
  ($('#paperPick') as HTMLSelectElement).onchange = (e) =>
    go(paperURL((e.target as HTMLSelectElement).value, mode));
}
