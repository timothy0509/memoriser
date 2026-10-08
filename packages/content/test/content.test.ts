// Guards the HKDSE set texts (EDB《積學涵泳》高中), one markdown file per piece.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTexts } from '../src/node.ts';

const TEXTS = loadTexts();
const byId = Object.fromEntries(TEXTS.map((t) => [t.id, t.body]));

const EXPECTED_IDS = [
  'chushibiao',
  'denglou',
  'lianpo',
  'liuguo',
  'lunjunzi',
  'lunren',
  'lunxiao',
  'niannujiao',
  'qingyuan',
  'quanxue',
  'shanju',
  'shengshengman',
  'shishuo',
  'xiaoyaoyou',
  'xishan',
  'yuedu',
  'yueyanglou',
  'yuwu',
];

test('eighteen entries, one per piece', () => {
  assert.deepEqual(TEXTS.map((t) => t.id).sort(), EXPECTED_IDS);
  for (const t of TEXTS) {
    assert.ok(t.title && t.group && t.body.length > 30, t.id);
  }
  const groups = {};
  for (const t of TEXTS) groups[t.group] = (groups[t.group] || 0) + 1;
  assert.deepEqual(groups, { 散文: 9, 詩: 3, 詞: 3, 論語: 3 });
});

test('no simplified-only characters', () => {
  const simp =
    '杀让认这进远过龙龟刘门问间闻开阳陈时书传伦伟为个发对观汉难礼响万与专区卫冲凤凭凉凑减梦亲节兴经统细终结给网胜肃腾荣虽衔见视觉计语读谁调谈请诸贵费资赏跃辅辆迟适选遗释钟陆随隐雏顺预领题颜饮验鲲鹏';
  for (const t of TEXTS) {
    const bad = [...new Set([...t.body].filter((c) => simp.includes(c)))];
    assert.deepEqual(bad, [], t.id);
  }
});

test('lunyu split into three, EDB sixteen', () => {
  assert.ok(byId.lunren.includes('（四）') && !byId.lunren.includes('（五）'));
  assert.ok(
    byId.lunxiao.includes('（五）') &&
      byId.lunxiao.includes('（八）') &&
      !byId.lunxiao.includes('（九）')
  );
  assert.ok(
    byId.lunjunzi.includes('（九）') && byId.lunjunzi.includes('（十六）')
  );
  assert.ok(byId.lunren.includes('克己復禮為仁'));
  assert.ok(byId.lunxiao.includes('孟懿子問孝'));
  assert.ok(byId.lunjunzi.includes('君子恥其言而過其行'));
  const all = byId.lunren + byId.lunxiao + byId.lunjunzi;
  for (const s of ['巧言令色', '三省吾身', '和而不同', '朝聞道', '當仁不讓']) {
    assert.ok(!all.includes(s), `non-EDB passage present: ${s}`);
  }
});

test('quanxue matches the EDB excerpt', () => {
  const b = byId.quanxue;
  assert.ok(b.includes('學不可以已'));
  assert.ok(b.includes('螾無爪牙之利'));
  assert.ok(b.includes('非蛇蟺之穴'));
  assert.ok(b.trimEnd().endsWith('用心躁也。'));
  for (const s of ['故不登高山', '無冥冥之志', '君子貴其全也']) {
    assert.ok(!b.includes(s), `outside EDB excerpt: ${s}`);
  }
});

test('xiaoyaoyou is the EDB excerpt (gourd and tree)', () => {
  const b = byId.xiaoyaoyou;
  assert.ok(b.includes('魏王貽我大瓠之種'));
  assert.ok(b.includes('子獨不見狸狌乎'));
  assert.ok(b.includes('今夫斄牛'));
  assert.ok(b.includes('不辟高下'));
  assert.ok(b.includes('逍遙乎寢卧其下'));
  assert.ok(b.trimEnd().endsWith('安所困苦哉？」'));
  assert.ok(!b.includes('北冥有魚'));
});

test('lianpo follows EDB print', () => {
  const b = byId.lianpo;
  for (const s of [
    '怒髮上衝冠',
    '臣頭今與璧俱碎於柱矣',
    '臣所以去親戚而事君者',
    '舍相如廣成傳',
    '為刎頸之交',
    '趙彊而燕弱',
    '秦之羣臣',
    '逆彊秦之驩',
    '以先國家之急而後私讎也',
    '特以詐佯為予趙城',
    '與羣臣孰計議之',
    '請奏盆缻秦王',
  ]) {
    assert.ok(b.includes(s), `missing: ${s}`);
  }
  for (const s of ['曾告大王', '詐詳', '熟計議', '奉盆缻']) {
    assert.ok(!b.includes(s), `non-EDB reading present: ${s}`);
  }
  assert.ok(!/[強群歡仇]/.test(b), 'unconverted common-form chars');
});

test('chushibiao follows EDB print', () => {
  const b = byId.chushibiao;
  assert.ok(b.startsWith('先帝創業未半，而中道崩殂'));
  assert.ok(!b.includes('臣亮言'));
  assert.ok(b.includes('侍衞之臣'));
  assert.ok(b.includes('宮中、府中，俱為一體'));
  assert.ok(b.includes('平明之治'));
  assert.ok(b.includes('貞良死節之臣'));
  assert.ok(!b.includes('貞亮'));
  assert.ok(b.includes('親之、信之'));
  assert.ok(b.includes('桓、靈也！'));
  assert.ok(b.includes('臨表涕零，不知所言'));
});

test('poems and ci follow EDB print', () => {
  assert.ok(byId.shanju.includes('王孫自可留'));
  assert.ok(byId.yuedu.includes('對影成三人'));
  assert.ok(byId.yuedu.includes('相期邈雲漢'));
  assert.ok(byId.denglou.includes('日暮聊為梁甫吟'));
  assert.ok(byId.niannujiao.includes('一時多少豪傑！'));
  assert.ok(byId.niannujiao.includes('人間如夢，一尊還酹江月'));
  assert.ok(byId.shengshengman.includes('乍煖還寒時候'));
  assert.ok(byId.shengshengman.includes('怎敵他，晚來風急！'));
  assert.ok(byId.shengshengman.includes('守着窗兒'));
  assert.ok(byId.shengshengman.includes('怎一箇愁字了得！'));
  assert.ok(
    byId.qingyuan.includes('眾裏尋他千百度；驀然迴首，那人卻在、燈火闌珊處')
  );
});

test('the four remaining EDB texts', () => {
  assert.ok(byId.liuguo.includes('弊在賂秦'));
  assert.ok(byId.liuguo.includes('幷力西嚮'));
  assert.ok(byId.liuguo.includes('茍以天下之大'));
  assert.ok(byId.liuguo.trimEnd().endsWith('是又在六國下矣！'));
  assert.ok(byId.shishuo.includes('古之學者必有師'));
  assert.ok(byId.shishuo.includes('則羣聚而笑之'));
  assert.ok(byId.shishuo.includes('作《師說》以貽之'));
  assert.ok(byId.xishan.includes('自余為僇人'));
  assert.ok(byId.xishan.includes('心凝形釋，與萬化冥合'));
  assert.ok(byId.xishan.includes('是歲元和四年也'));
  assert.ok(byId.yuwu.includes('舍生而取義者也'));
  assert.ok(byId.yuwu.includes('嘑爾而與之'));
  assert.ok(byId.yuwu.includes('此之謂失其本心'));
  const y = byId.yueyanglou;
  assert.ok(y.includes('刻唐賢、今人詩賦於其上'));
  assert.ok(y.includes('日星隱曜'));
  assert.ok(y.includes('寵辱皆忘'));
  assert.ok(y.includes('或異二者之為。何哉？'));
  assert.ok(y.includes('時六年九月十五日'));
});

test('frontmatter matches filename and body is clean', () => {
  for (const t of TEXTS) {
    assert.match(t.id, /^[a-z]+$/);
    assert.ok(!t.body.includes('---'), t.id);
  }
});
