/**
 * scripts/test-design-check.ts · 設計規範棘輪（scripts/design-check.mjs）的測試
 *
 * 不引入測試框架，純 tsx 執行：npm run test:design。CI 跑完這個接著跑 npm run design:check。
 * 不連資料庫、不連網。
 *
 * 證明四件事：
 *   1. tokens：design/tokens.json 收在 7 級、跟 styles/tokens.css 的值一字不差、tailwind.config.ts 全從它來
 *   2. 該擋的會被數到（text-[13px]、bg-[#fff]、style={{ fontSize }}、色票外的顏色……），註解裡寫的不算
 *   3. 棘輪：比基準多就不通過，變少要 --update，--update 只准往下調，改名認得出來
 *   4. hook：改了違規的檔會擋（exit 2、訊息交回給 Claude），改乾淨的檔、不在範圍的檔放行
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import config from '../tailwind.config';
import {
  arbitraryHits,
  baselineFrom,
  blankComments,
  checkFiles,
  colorLiterals,
  compare,
  contextFrom,
  countByRule,
  findRoot,
  flatColors,
  hookDecide,
  inScope,
  loadContext,
  newHits,
  scanAll,
  scanSource,
} from './design-check.mjs';

const ROOT = path.resolve(__dirname, '..');

/* ---------- 迷你斷言 ---------- */

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${name} — ${msg}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${msg}`);
  }
}

function eq(actual: unknown, expected: unknown, label = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}預期 ${e}，實際 ${a}`);
}

/* ---------- 共用：真的 tokens ---------- */

type Hit = { rule: string; line: number; match: string; text: string };
type Token = {
  var?: string;
  value: string;
  builtin?: boolean;
  tailwind?: boolean;
  level?: number;
  variantOf?: string;
  deprecated?: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontWeight?: string;
};

const ctx = loadContext(ROOT);
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/tokens.json'), 'utf8'));
const tokensCss = fs.readFileSync(path.join(ROOT, 'styles/tokens.css'), 'utf8');
const items = (group: Record<string, unknown>) =>
  Object.entries(group).filter(([k]) => !k.startsWith('$')) as [string, Token][];

/** 掃一段原始碼，回傳 { 規則: 數 } */
const count = (rel: string, src: string) => countByRule(scanSource(rel, src, ctx));
const matches = (rel: string, src: string, rule: string) =>
  (scanSource(rel, src, ctx) as Hit[]).filter((h) => h.rule === rule).map((h) => h.match);

/* ---------- tokens ---------- */

console.log('\ntokens（design/tokens.json ↔ styles/tokens.css ↔ tailwind.config.ts）');

check('字級 7 級：level 1–7 各一個；變體跟它那一級一樣大；停用的不算級', () => {
  const sizes = items(tokens.fontSize);
  const levels = sizes.filter(([, t]) => t.level).sort((a, b) => (a[1].level ?? 0) - (b[1].level ?? 0));
  eq(levels.map(([, t]) => t.level), [1, 2, 3, 4, 5, 6, 7], 'level ');
  eq(ctx.levels.length, 7, 'ctx.levels ');
  for (const [name, t] of sizes) {
    const kinds = [t.level !== undefined, t.variantOf !== undefined, t.deprecated !== undefined].filter(Boolean).length;
    if (kinds !== 1) throw new Error(`${name} 要剛好是 level、variantOf、deprecated 其中一種`);
    if (t.variantOf) {
      const parent = tokens.fontSize[t.variantOf] as Token | undefined;
      if (!parent?.level) throw new Error(`${name} 的 variantOf 指到不是一級的 ${t.variantOf}`);
      if (parent.value !== t.value) throw new Error(`${name}（${t.value}）跟 ${t.variantOf}（${parent.value}）不一樣大，不是變體`);
    }
  }
  const distinct = new Set(sizes.filter(([, t]) => !t.deprecated).map(([, t]) => t.value));
  eq(distinct.size, 7, '不停用的字級實際大小種數 ');
});

check('tokens.json 每個有 var 的值都跟 styles/tokens.css 一字不差；tokens.css 的每個變數都在 tokens.json', () => {
  const css = new Map(
    [...blankComments(tokensCss, { css: true }).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]),
  );
  const seen = new Set<string>();
  const bad: string[] = [];
  const walk = (node: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$') || !v || typeof v !== 'object') continue;
      const t = v as Token;
      if (typeof t.var === 'string') {
        seen.add(t.var);
        if (!css.has(t.var)) bad.push(`${t.var} 不在 tokens.css`);
        else if (css.get(t.var) !== t.value) bad.push(`${t.var}：tokens.json「${t.value}」≠ tokens.css「${css.get(t.var)}」`);
      } else if (!('value' in t)) walk(t as unknown as Record<string, unknown>);
    }
  };
  walk(tokens);
  for (const v of css.keys()) if (!seen.has(v)) bad.push(`tokens.css 的 ${v} 沒寫進 tokens.json`);
  eq(bad, [], '');
});

check('tailwind.config 的字級、色名、寬度、間距、字距、圓角、斷點、字型都從 tokens.json 來，沒有另外加', () => {
  const ext = (config as { theme: { extend: Record<string, Record<string, unknown>> } }).theme.extend;
  const fs_ = items(tokens.fontSize);
  eq(Object.keys(ext.fontSize).sort(), fs_.map(([k]) => k).sort(), 'fontSize 鍵 ');
  for (const [k, t] of fs_) {
    const [size, opts] = ext.fontSize[k] as [string, Record<string, string>];
    eq(size, `var(${t.var})`, `fontSize.${k} `);
    eq(opts, { lineHeight: t.lineHeight, ...(t.letterSpacing && { letterSpacing: t.letterSpacing }), ...(t.fontWeight && { fontWeight: t.fontWeight }) }, `fontSize.${k} 的設定 `);
  }
  const colors = Object.fromEntries(
    (flatColors(tokens) as [string, Token][]).filter(([, t]) => !t.builtin && t.tailwind !== false).map(([k, t]) => [k, `var(${t.var})`]),
  );
  eq(ext.colors, colors, 'colors ');
  const pick = (g: Record<string, unknown>) =>
    Object.fromEntries(items(g).filter(([, t]) => !t.builtin).map(([k, t]) => [k, t.var ? `var(${t.var})` : t.value]));
  for (const key of ['maxWidth', 'spacing', 'letterSpacing', 'borderRadius', 'fontFamily']) eq(ext[key], pick(tokens[key]), `${key} `);
  eq(ext.screens, pick(tokens.breakpoints), 'screens ');
  eq(ext.borderColor, { DEFAULT: 'var(--line)' }, 'borderColor ');
});

check('色票＝tokens.json 的顏色（含白色）；寫法不同（大小寫、縮寫、空白）視為同一色', () => {
  const p = contextFrom(tokens).palette;
  for (const c of ['#243FB5', '#243fb5', '#fff', '#FFFFFF', 'rgba(23, 24, 28, 0.14)', 'rgba(23,24,28,.14)', '#5c5b54']) {
    const key = colorLiterals(`x ${c} x`)[0]?.key;
    if (!p.has(key)) throw new Error(`${c} 應在色票內（key ${key}）`);
  }
  for (const c of ['#123456', '#000', '#222']) if (p.has(colorLiterals(c)[0].key)) throw new Error(`${c} 不在色票`);
});

/* ---------- 去掉註解 ---------- */

console.log('\n去掉註解再掃');

check('行註解、區塊註解、JSX 註解裡的違規不算；行號不變', () => {
  const src = ['// 不要寫 text-[13px]', '/* text-[14px]', '   text-[15px] */', '<div>{/* text-[16px] */}<p className="text-[17px]" /></div>'].join('\n');
  const hits = (scanSource('app/x.tsx', src, ctx) as Hit[]).filter((h) => h.rule === 'font-size');
  eq(hits.map((h) => [h.line, h.match]), [[4, 'text-[17px]']]);
  eq(blankComments(src).split('\n').length, 4, '行數 ');
});

check('網址的 // 不是註解；字串裡的 // 不是註解', () => {
  eq(matches('app/x.tsx', '<a href="https://x.tw/a" className="text-[13px]">https://y.tw</a>', 'font-size'), ['text-[13px]']);
  eq(matches('app/x.tsx', "const u = 'a//b'; const c = 'text-[13px]';", 'font-size'), ['text-[13px]']);
});

check("樣板字串裡的 ${} 巢狀、落單的撇號（Don't）不會把後面的行吃掉", () => {
  const src = ['const c = `text-[13px] ${ok ? "text-[14px]" : `text-[15px]`} // 不是註解`;', "<p>Don't</p>", '<p className="text-[16px]" />'].join('\n');
  eq(matches('app/x.tsx', src, 'font-size'), ['text-[13px]', 'text-[14px]', 'text-[15px]', 'text-[16px]']);
});

check('CSS 只有區塊註解', () => {
  eq(count('styles/x.css', '/* font-size: 13px */\n.a { font-size: 13px; }'), { 'font-size': 1 });
});

/* ---------- 規則 ---------- */

console.log('\n每條規則該擋的、不該擋的');

check('字級：text-[13px]、rd:text-[48px]、text-[min(…)]、text-sm、[font-size:…] 算；7 級與變體、text-[inherit] 不算', () => {
  const src =
    '<p className="text-[13px] rd:text-[48px] text-[min(56vw,760px)] text-sm hover:text-lg [font-size:15px] text-caption text-body text-h2 text-lede text-note text-[inherit] max-w-sm" />';
  eq(matches('app/x.tsx', src, 'font-size').sort(), ['[font-size:15px]', 'text-[13px]', 'text-[48px]', 'text-[min(56vw,760px)]', 'text-lg', 'text-sm']);
});

check('ts 裡的 CSS 字串 font-size: 13px 算；列印視窗、信件不算', () => {
  const src = 'const css = `body { font-size:12.5pt; } h1 { font-size: small }`;';
  eq(matches('app/x.tsx', src, 'font-size'), ['font-size:12.5pt']);
  eq(matches('components/PrintButton.tsx', src, 'font-size'), []);
});

check('text-[#fff] 是顏色不是字級', () => {
  const c = count('app/x.tsx', '<p className="text-[#FFD89B]" />');
  eq([c['font-size'] ?? 0, c['color-arbitrary']], [0, 1]);
});

check('停用的 token（text-eyebrow、text-law-title、text-hero-sys）另外數；text-chip、text-cat-en 合規', () => {
  eq(matches('app/x.tsx', '<h1 className="text-law-title text-hero-sys" /><b className="text-eyebrow text-chip text-cat-en" />', 'deprecated-token'), [
    'text-law-title',
    'text-hero-sys',
    'text-eyebrow',
  ]);
});

check('字重：font-light、font-extrabold、font-[450]、CSS font-weight:300 算；font-medium、font-black、font-serif 不算', () => {
  eq(matches('app/x.tsx', '<p className="font-light font-extrabold font-[450] font-medium font-black font-serif font-ui" />', 'font-weight'), [
    'font-[450]',
    'font-light',
    'font-extrabold',
  ]);
  eq(matches('styles/x.css', '.a { font-weight: 300; } .b { font-weight: 500; }', 'font-weight'), ['font-weight: 300']);
});

check('leading-[…]、tracking-[…]、[line-height:…] 各自算；leading-none、tracking-kicker 不算', () => {
  const c = count('app/x.tsx', '<p className="leading-[1.4] tracking-[0.12em] [line-height:2] leading-none tracking-kicker" />');
  eq([c.leading, c.tracking], [2, 1]);
});

check('寬度：w-[…]／min-w-[…]／max-w-[…] 算；max-w-reader、w-64 不算', () => {
  eq(matches('app/x.tsx', '<p className="w-[86vw] min-w-[6ch] max-w-[1120px] max-w-reader w-64" />', 'width'), ['w-[86vw]', 'min-w-[6ch]', 'max-w-[1120px]']);
});

check('頁面容器：mx-auto 配 max-w-4xl 算，配 max-w-wrap／wrap-reader／reader／full 不算；沒有 mx-auto 的 max-w-2xl 不算', () => {
  eq(matches('app/x.tsx', '<div className="mx-auto max-w-4xl px-4" />', 'container-width'), ['max-w-4xl']);
  for (const w of ['wrap', 'wrap-reader', 'reader', 'full']) eq(matches('app/x.tsx', `<div className="mx-auto max-w-${w}" />`, 'container-width'), [], `${w} `);
  eq(matches('app/x.tsx', '<p className="max-w-2xl" />', 'container-width'), []);
});

check('顏色：bg-[#…]、border-l-[rgba(…)]、[color:#…] 算；Tailwind 預設色 text-gray-500、bg-black 另外算；text-white、bg-transparent、token 色名不算', () => {
  const src =
    '<p className="bg-[#243fb5] border-l-[rgba(0,0,0,.1)] [color:#123456] text-gray-500 hover:bg-black/50 text-white bg-transparent text-ink bg-paper2 border-line text-accent" />';
  eq(matches('app/x.tsx', src, 'color-arbitrary').sort(), ['[color:#123456]', 'bg-[#243fb5]', 'border-l-[rgba(0,0,0,.1)]']);
  eq(matches('app/x.tsx', src, 'color-default'), ['text-gray-500', 'bg-black']);
});

check('色票外的顏色：#123456 算、色票內的 #243FB5 與 #fff 不算；任意值裡 _ 後面的 rgba() 也看得到', () => {
  eq(matches('app/x.tsx', 'fill="#123456" stroke="#243FB5" color="#fff"', 'off-palette'), ['#123456']);
  eq(matches('app/x.tsx', '<b className="shadow-[0_8px_24px_rgba(26,69,155,0.08)]" />', 'off-palette'), ['rgba(26,69,155,0.08)']);
});

check('顏色字面值不誤抓：錨點 #faq、#add-form、HTML 實體 &#123;、帶變數的 rgba(var(--x))', () => {
  eq(matches('app/x.tsx', '<a href="#faq" /><a href="#add-form" /><i>&#123;</i><b className="bg-[rgba(var(--x),0.5)]" />', 'off-palette'), []);
});

check('開會通知信件（真本保真）的顏色不數；列印視窗的顏色照數', () => {
  const src = 'const a = \'<font color="#e06666">\'; const b = \'<span style="background-color:rgb(234,153,153)">\';';
  eq(count('lib/meetings/notice.ts', src)['off-palette'] ?? 0, 0);
  eq(count('components/PrintButton.tsx', src)['off-palette'], 2);
});

check('style 物件：fontSize、fontWeight、lineHeight、字面顏色算；動態 width、color 放 class 字串不算；列印視窗、信件不檢查', () => {
  const src =
    "<p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, color: '#22301f' }} />\n<i style={{ width: `${pct}%` }} />\nconst tone = { color: 'text-accent' };";
  eq(count('app/x.tsx', src)['inline-style'], 4);
  eq(count('components/PrintButton.tsx', src)['inline-style'] ?? 0, 0);
  eq(count('lib/meetings/notice.ts', src)['inline-style'] ?? 0, 0);
});

check('間距與位置：p-[19px]、-mt-[3px]、gap-x-[22px]、rd:top-[52px]、right-[-3%]、-indent-[1.6em]、[margin:4px] 算；py-section、p-4 不算', () => {
  const src =
    '<p className="p-[19px] -mt-[3px] gap-x-[22px] rd:top-[52px] right-[-3%] -indent-[1.6em] [margin:4px] py-section px-wrap p-4 gap-2" />';
  eq(matches('app/x.tsx', src, 'spacing').sort(), ['-indent-[1.6em]', '-mt-[3px]', '[margin:4px]', 'gap-x-[22px]', 'p-[19px]', 'right-[-3%]', 'top-[52px]']);
});

check('圓角：rounded、rounded-lg、rounded-t-xl、rounded-[6px]、CSS border-radius: 8px 算；rounded-sm、rounded-full、rounded-none、rounded-t-sm 不算', () => {
  const src = '<p className="rounded rounded-lg rounded-t-xl rounded-[6px] rounded-sm rounded-full rounded-none rounded-t-sm" />';
  eq(matches('app/x.tsx', src, 'radius').sort(), ['rounded', 'rounded-[6px]', 'rounded-lg', 'rounded-t-xl']);
  eq(matches('styles/x.css', '.a { border-radius: 8px; } .b { border-radius: var(--radius-sm); }', 'radius'), ['border-radius: 8px']);
});

check('陰影、漸層：shadow、shadow-lg、drop-shadow-md、shadow-[…]、bg-gradient-to-r、linear-gradient(、boxShadow 算；shadow-none 不算；列印視窗的 box-shadow 不算', () => {
  const src = '<p className="shadow shadow-lg drop-shadow-md shadow-[0_1px_2px_#000] bg-gradient-to-r shadow-none" style={{ boxShadow: x }} />';
  eq(count('app/x.tsx', src).effect, 6);
  eq(matches('styles/x.css', '.a { box-shadow: 0 1px 2px red; background: linear-gradient(red, blue); } .b { box-shadow: none; }', 'effect').length, 2);
  eq(matches('components/PrintButton.tsx', 'const c = `.doc { box-shadow:0 1px 12px rgba(0,0,0,.12); }`;', 'effect'), []);
});

check('其他任意值：h-[42px]、z-[2]、opacity-[.72]、border-l-[3px]、min-h-[60vh] 算；grid-cols-[…]、transition-[…]、group-has-[…]: 這類 variant 不算', () => {
  const src =
    '<p className="h-[42px] z-[2] opacity-[.72] border-l-[3px] min-h-[60vh] grid-cols-[82px_1fr_auto] rd:grid-cols-[236px_minmax(0,1fr)] transition-[transform,background-color] group-has-[#kind-election:checked]:block data-[on=true]:bg-accent" />';
  eq(matches('app/x.tsx', src, 'arbitrary'), ['h-[42px]', 'z-[2]', 'opacity-[.72]', 'border-l-[3px]', 'min-h-[60vh]']);
  eq(arbitraryHits('grid-cols-[1fr_2fr] transition-[opacity]'), []);
});

check('檢查範圍：app／components／lib 的 ts／tsx、styles 的 css；型別宣告檔、scripts、data、prototype 不算', () => {
  eq(
    ['app/a.tsx', 'components/a.tsx', 'lib/a.ts', 'styles/a.css', 'lib/a.d.ts', 'scripts/a.ts', 'data/seed.ts', 'prototype/a.html', 'app/a.json', 'tailwind.config.ts'].map(inScope),
    [true, true, true, true, false, false, false, false, false, false],
  );
});

/* ---------- 棘輪 ---------- */

console.log('\n棘輪');

check('比基準多 → worse；比基準少 → better；一樣 → 都沒有', () => {
  const base = { 'app/a.tsx': { 'font-size': 3 }, 'app/b.tsx': { leading: 2 } };
  const now = { 'app/a.tsx': { 'font-size': 4 }, 'app/b.tsx': { leading: 1 } };
  const r = compare(base, now, ['app/a.tsx', 'app/b.tsx'], () => true);
  eq(r.worse, [{ file: 'app/a.tsx', rule: 'font-size', was: 3, now: 4 }]);
  eq(r.better, [{ file: 'app/b.tsx', rule: 'leading', was: 2, now: 1 }]);
});

check('違規從一個檔搬到另一個檔也算變多（逐檔比，不是比總數）', () => {
  const base = { 'app/a.tsx': { 'font-size': 2 } };
  const now = { 'app/a.tsx': { 'font-size': 1 }, 'app/b.tsx': { 'font-size': 1 } };
  const r = compare(base, now, ['app/a.tsx', 'app/b.tsx'], () => true);
  eq(r.worse.map((w: { file: string }) => w.file), ['app/b.tsx']);
});

check('改名：舊檔不在了、新檔每條都不超過舊檔 → 當成同一個檔；超過就不算改名', () => {
  const base = { 'app/old.tsx': { 'font-size': 3, leading: 1 } };
  const exists = (f: string) => f !== 'app/old.tsx';
  const ok = compare(base, { 'app/new.tsx': { 'font-size': 3 } }, ['app/new.tsx'], exists);
  eq([ok.worse.length, ok.renamed], [0, { 'app/new.tsx': 'app/old.tsx' }]);
  const bad = compare(base, { 'app/new.tsx': { 'font-size': 4 } }, ['app/new.tsx'], exists);
  eq([bad.worse.length, bad.renamed], [1, {}]);
});

check('基準檔：0 的不記、檔名排序、totals 是加總', () => {
  const b = baselineFrom({ 'app/b.tsx': { leading: 2 }, 'app/a.tsx': { 'font-size': 1, leading: 0 } });
  eq(Object.keys(b.files), ['app/a.tsx', 'app/b.tsx']);
  eq(b.files['app/a.tsx'], { 'font-size': 1 });
  eq([b.totals['font-size'], b.totals.leading], [1, 2]);
});

check('只列出這次新加的：同規則、同字串、同一行內容的舊違規扣掉', () => {
  const old = scanSource('app/x.tsx', '<p className="text-[13px]" />\n<p className="text-[13px]" />', ctx);
  const now = scanSource('app/x.tsx', '<p className="text-[13px]" />\n<p className="text-[13px]" />\n<b className="text-[15px]" />', ctx);
  eq((newHits(now, old) as Hit[]).map((h) => h.match), ['text-[15px]']);
});

check('在本來就有違規的那一行加新的：只列新加的那個', () => {
  const old = scanSource('app/x.tsx', '<h1 className="text-[40px] rd:text-[48px]" />\n<p className="text-[15px]" />', ctx);
  const now = scanSource('app/x.tsx', '<h1 className="text-[13px] text-[40px] rd:text-[48px]" />\n<p className="text-[15px]" />', ctx);
  eq((newHits(now, old) as Hit[]).map((h) => [h.line, h.match]), [[1, 'text-[13px]']]);
});

check('現在的 repo 跟 design/baseline.json 一致（npm run design:check 會過）', () => {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/baseline.json'), 'utf8'));
  const { counts } = scanAll(ROOT, ctx);
  const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));
  const files = [...new Set([...Object.keys(counts), ...Object.keys(base.files).filter(exists)])];
  eq(compare(base.files, counts, files, exists).worse, [], '比基準多的 ');
});

/* ---------- 在暫存目錄做一個迷你 repo：hook 與指令列 ---------- */

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'design-check-test-')));
fs.mkdirSync(path.join(tmp, 'design'));
fs.mkdirSync(path.join(tmp, 'scripts'));
fs.mkdirSync(path.join(tmp, 'styles'));
fs.mkdirSync(path.join(tmp, 'app/page'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'design/tokens.json'), path.join(tmp, 'design/tokens.json'));
fs.copyFileSync(path.join(ROOT, 'scripts/design-check.mjs'), path.join(tmp, 'scripts/design-check.mjs'));
fs.writeFileSync(path.join(tmp, 'styles/tokens.css'), ':root { --accent: #243fb5; }\n');
const page = path.join(tmp, 'app/page/page.tsx');
const other = path.join(tmp, 'app/page/other.tsx');
fs.writeFileSync(page, '<p className="text-[13px] text-caption" />\n');
fs.writeFileSync(other, '<p className="text-accent" />\n');
const baselinePath = path.join(tmp, 'design/baseline.json');
fs.writeFileSync(baselinePath, JSON.stringify({ updated: 'test', files: { 'app/page/page.tsx': { 'font-size': 1 } } }));
const edit = (file: string) => ({ tool_name: 'Edit', tool_input: { file_path: file } });

/** 跑迷你 repo 裡的那份 design-check.mjs（跟真的 hook 一樣從 stdin 餵 JSON） */
const cli = (args: string[], stdin = '') =>
  spawnSync(process.execPath, [path.join(tmp, 'scripts/design-check.mjs'), ...args], { cwd: tmp, input: stdin, encoding: 'utf8' });

console.log('\nhook（PostToolUse）');

check('從改到的檔往上找到有 design/baseline.json 的那一層（worktree 用自己的基準）', () => {
  eq(findRoot(page), tmp);
});

check('跟基準一樣 → 放行', () => {
  eq(hookDecide(edit(page)), null);
});

check('多加一個 text-[13px] → 擋，訊息指出行號、字串與改法', () => {
  fs.writeFileSync(page, '<p className="text-[13px] text-caption" />\n<p className="text-[13px]" />\n');
  const msg = hookDecide(edit(page));
  if (!msg) throw new Error('應該擋');
  for (const want of ['app/page/page.tsx', '基準 1，現在 2', 'text-[13px]', 'text-caption', 'baseline.json']) {
    if (!msg.includes(want)) throw new Error(`訊息缺「${want}」：\n${msg}`);
  }
  eq(checkFiles(tmp, [page]).ok, false);
});

check('真的跑一次 hook 指令：exit 2，訊息寫在 stderr（Claude Code 會交回給 Claude）', () => {
  const r = cli(['--hook'], JSON.stringify(edit(page)));
  eq(r.status, 2, 'exit ');
  if (!r.stderr.includes('設計規範關卡') || !r.stderr.includes('text-[13px]')) throw new Error(r.stderr);
});

check('改回 token → 放行（比基準少也放行，基準的更新交給 --update）；hook 指令 exit 0、什麼都不印', () => {
  fs.writeFileSync(page, '<p className="text-caption" />\n');
  eq(hookDecide(edit(page)), null);
  const r = cli(['--hook'], JSON.stringify(edit(page)));
  eq([r.status, r.stdout, r.stderr], [0, '', '']);
});

check('不在範圍的檔、找不到基準的 repo、讀不懂的輸入 → 放行', () => {
  const md = path.join(tmp, 'README.md');
  fs.writeFileSync(md, 'text-[13px]');
  eq(hookDecide(edit(md)), null);
  const outside = path.join(os.tmpdir(), 'design-check-no-repo.tsx');
  fs.writeFileSync(outside, '<p className="text-[13px]" />');
  eq(hookDecide(edit(outside)), null);
  eq(hookDecide({ tool_name: 'Edit', tool_input: {} }), null);
  eq(hookDecide(null), null);
  fs.rmSync(outside);
  const r = cli(['--hook'], '這不是 JSON');
  eq(r.status, 0, '壞掉的輸入 exit ');
  if (!r.stdout.includes('systemMessage')) throw new Error(`應該用 systemMessage 告訴人：${r.stdout}`);
});

check('新檔（基準裡沒有）寫了違規 → 擋', () => {
  const fresh = path.join(tmp, 'app/page/new.tsx');
  fs.writeFileSync(fresh, '<div style={{ fontSize: 13 }} className="bg-[#123456]" />');
  const msg = hookDecide({ tool_name: 'Write', tool_input: { file_path: fresh } });
  if (!msg || !msg.includes('style 物件') || !msg.includes('寫死顏色')) throw new Error(String(msg));
  fs.rmSync(fresh);
});

check('改 tokens.json 停用一個字級 → 全掃，用到它的別的檔被擋', () => {
  fs.writeFileSync(other, '<p className="text-accent text-h4" />\n');
  const tokPath = path.join(tmp, 'design/tokens.json');
  const t = JSON.parse(fs.readFileSync(tokPath, 'utf8'));
  delete t.fontSize.h4.level;
  t.fontSize.h4.deprecated = '測試';
  fs.writeFileSync(tokPath, JSON.stringify(t));
  const msg = hookDecide(edit(tokPath));
  if (!msg || !msg.includes('app/page/other.tsx') || !msg.includes('text-h4')) throw new Error(String(msg));
  fs.copyFileSync(path.join(ROOT, 'design/tokens.json'), tokPath);
  fs.writeFileSync(other, '<p className="text-accent" />\n');
  eq(hookDecide(edit(tokPath)), null);
});

console.log('\n指令列（npm run design:check）');

check('變多 → exit 1；這時 --update 也拒絕，基準不動', () => {
  fs.writeFileSync(page, '<p className="text-[13px] text-[14px]" />\n');
  const before = fs.readFileSync(baselinePath, 'utf8');
  eq(cli([]).status, 1, '檢查 exit ');
  eq(cli(['--update']).status, 1, '--update exit ');
  eq(fs.readFileSync(baselinePath, 'utf8'), before, '基準 ');
});

check('變少但沒 --update → exit 1 並要你跑 --update；跑了之後基準往下釘、再檢查 exit 0', () => {
  fs.writeFileSync(page, '<p className="text-caption" />\n');
  const r = cli([]);
  eq(r.status, 1, '檢查 exit ');
  if (!r.stderr.includes('--update')) throw new Error(r.stderr);
  eq(cli(['--update']).status, 0, '--update exit ');
  eq(JSON.parse(fs.readFileSync(baselinePath, 'utf8')).files, {}, '新基準 ');
  eq(cli([]).status, 0, '再檢查 exit ');
});

check('--changed 只查指定的檔；--init 在已有基準時拒絕', () => {
  fs.writeFileSync(other, '<p className="text-[13px]" />\n');
  eq(cli(['--changed', page]).status, 0, '乾淨的檔 ');
  eq(cli(['--changed', other]).status, 1, '違規的檔 ');
  eq(cli(['--init']).status, 1, '--init ');
});

fs.rmSync(tmp, { recursive: true, force: true });

/* ---------- 結果 ---------- */

console.log(`\n${'─'.repeat(56)}`);
if (failures.length === 0) {
  console.log(`\x1b[32m全部通過\x1b[0m · ${passed} 項\n`);
  process.exit(0);
} else {
  console.log(`\x1b[31m${failures.length} 項失敗\x1b[0m · ${passed} 項通過\n`);
  failures.forEach((f) => console.log(`  · ${f}`));
  console.log('');
  process.exit(1);
}
