#!/usr/bin/env node
/**
 * scripts/design-check.mjs · 設計規範的棘輪檢查（規則見 DESIGN.md，tokens 在 design/tokens.json）
 *
 * 為什麼要有：DESIGN-SYSTEM.md 從 2026-07 就寫了「不硬編色碼字級」，但只寫在文件、沒有程式在擋。
 * 2026-10-07 盤點：24 個字級 token 有 19 種大小，另外寫死 text-[11px] 這類字級 24 處、
 * p-[19px] 這類間距 27 處。這支把規範寫成程式：
 *
 *   - 掃 app／components／lib 的 .ts／.tsx 與 styles 的 .css（去掉註解再掃），數每條規則在每個檔案的違規數
 *   - 跟 design/baseline.json 比：**任何一個檔案的任何一條規則比基準多就不通過**
 *   - 現有的違規記在基準裡，只准變少。修掉之後跑 --update 把基準往下釘
 *
 *   npm run design:check                         全部檢查（CI 跑這個）
 *   npm run design:check -- --list               列出所有違規位置（加 --rule font-size 只看一條）
 *   npm run design:check -- --update             只有變少時才把基準寫回（有任何一處變多就拒絕）
 *   node scripts/design-check.mjs --changed <檔...>   只查這幾個檔，不掃全部（快）
 *   node scripts/design-check.mjs --hook         .claude/settings.json 的 PostToolUse 用：從 stdin 讀改了哪個檔，
 *                                                 照 --changed 檢查那一個檔（改的是 tokens 就全掃）
 *   node scripts/design-check.mjs --init         還沒有基準時建第一份（已經有就拒絕）
 *
 * 結束碼：0 通過；1 不通過（--hook 時是 2：Claude Code 會把 stderr 交回給 Claude 去修）。
 *
 * ── 規則怎麼數 ──
 *
 * 規則是逐行的正規表示式，不是 AST：快、不用裝套件，代價是一個 className 拆成好幾行寫時，
 * 「mx-auto 跟 max-w-* 在同一行」這種組合規則會漏數。棘輪只要「同一支程式、同一種數法」前後一致，
 * 漏數不會讓違規變多時沒被擋到，除非新寫法剛好就是那種拆行寫法。知道，沒有做。
 *
 * Tailwind 任意值（xxx-[…]）先依前綴與值分給各條規則（字級、顏色、寬度、間距、圓角、陰影），
 * 剩下的歸到 arbitrary。grid-cols-[…]、transition-[…] 這類版面結構不算：tokens 管不到，也不該管。
 *
 * ── 不檢查的地方 ──
 *
 * 不在畫面上的 HTML（列印視窗、開會通知信件）不吃 Tailwind，只能寫 CSS 字串，所以不數字級、陰影、style 物件；
 * 顏色照數。開會通知信件的顏色是「真本保真」（lib/meetings/notice.ts 檔頭、CLAUDE.md 第 1 條），連顏色也不數。
 *
 * ── 只准變少，那要加新值怎麼辦 ──
 *
 * 先改 design/tokens.json 與 styles/tokens.css，讓它變成合規的值，不要調高 design/baseline.json 讓數字過關。
 * 真的要調高，在 PR 說明寫理由、等昀楷確認，見 DESIGN.md「要加新值時」。
 *
 * ── 搬檔、改名 ──
 *
 * 基準是逐檔記的，檔名一換，新檔名的基準是 0。比對時如果「基準裡的舊檔已經不在了」而且
 * 「新檔每條規則都不超過舊檔」，就當成同一個檔（改名順手修掉幾處也算）。拆成兩個檔的認不出來，
 * 那種情況手動把 baseline.json 的鍵改過去，PR 說明寫一句。
 *
 * 範本：參詳金牌（tshamsiong）的 scripts/design-check.mjs，2026-10-07 照這個 repo 的結構改寫。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_FILE = 'design/tokens.json';
const BASELINE_FILE = 'design/baseline.json';
const SCAN_DIRS = ['app', 'components', 'lib', 'styles'];
const SKIP_DIRS = new Set(['node_modules', '.next']);

/* ───────────────────────── 路徑 ───────────────────────── */

/** repo 內的相對路徑，一律用 / */
export const toRel = (root, abs) => path.relative(root, abs).split(path.sep).join('/');

/** 要檢查的檔：app／components／lib 的 .ts／.tsx，styles 的 .css（型別宣告檔不算） */
export function inScope(rel) {
  if (rel.endsWith('.d.ts')) return false;
  if (/^(app|components|lib)\/.+\.(tsx|ts)$/.test(rel)) return true;
  return /^styles\/.+\.css$/.test(rel);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* ───────────────────────── 去掉註解 ───────────────────────── */

/**
 * 把註解換成空白（換行留著，行號不變）。註解裡寫「不要用 text-[13px]」不該被算成違規。
 *
 * 只認得字串、樣板字串（含 ${} 巢狀）、行註解、區塊註解（JSX 的 {/* *\/} 也是區塊註解）。
 * - 一般字串不跨行：JSX 文字裡落單的 '（Don't）最多只影響到那一行的行尾
 * - `//` 前一個字是 : 時不算註解（網址 https://）
 * - CSS 沒有行註解，也沒有樣板字串
 */
export function blankComments(src, { css = false } = {}) {
  const out = src.split('');
  const n = src.length;
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  const stack = [{ mode: 'code', depth: 0 }];
  let i = 0;
  while (i < n) {
    const top = stack[stack.length - 1];
    const c = src[i];
    const d = src[i + 1];
    if (top.mode === 'code') {
      if (c === '/' && d === '*') {
        const end = src.indexOf('*/', i + 2);
        const stop = end < 0 ? n : end + 2;
        blank(i, stop);
        i = stop;
        continue;
      }
      if (!css && c === '/' && d === '/' && src[i - 1] !== ':') {
        let end = src.indexOf('\n', i);
        if (end < 0) end = n;
        blank(i, end);
        i = end;
        continue;
      }
      if (c === "'" || c === '"') stack.push({ mode: c });
      else if (!css && c === '`') stack.push({ mode: 'tpl' });
      else if (c === '{') top.depth++;
      else if (c === '}') {
        if (top.depth === 0 && stack.length > 1) stack.pop(); // ${ … } 結束，回到樣板字串
        else top.depth--;
      }
      i++;
      continue;
    }
    if (top.mode === "'" || top.mode === '"') {
      if (c === '\\') i += 2;
      else {
        if (c === top.mode || c === '\n') stack.pop();
        i++;
      }
      continue;
    }
    // 樣板字串
    if (c === '\\') i += 2;
    else if (c === '`') {
      stack.pop();
      i++;
    } else if (c === '$' && d === '{') {
      stack.push({ mode: 'code', depth: 0 });
      i += 2;
    } else i++;
  }
  return out.join('');
}

/* ───────────────────────── 顏色字面值 ───────────────────────── */

// 前面可以是 _：Tailwind 任意值用 _ 代替空白（shadow-[inset_0_1px_0_rgba(…)]）
const HEX_RE = /(?<![A-Za-z0-9&#/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FN_RE = /(?<![A-Za-z0-9-])(rgba?|hsla?)\(([^()]*)\)/g;

const round = (x) => Math.round(x * 1000) / 1000;

/** #abc、#aabbcc、#aabbccdd → rgba(r,g,b,a) */
function hexToKey(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length <= 4) h = [...h].map((ch) => ch + ch).join('');
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
  const a = h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255) : 1;
  return `rgba(${r},${g},${b},${a})`;
}

/** rgb()／rgba() 的字面值 → rgba(r,g,b,a)；hsl 照原樣去空白。裡面有變數（var()、${}）的不是字面值，回傳 null */
function fnToKey(kind, args) {
  const parts = args.trim().split(/[\s,/]+/).filter(Boolean);
  if (!parts.length || parts.some((p) => !/^-?\d*\.?\d+%?$/.test(p))) return null;
  if (kind.startsWith('hsl')) return `hsl(${parts.join(',')})`;
  const num = (p, scale) => (p.endsWith('%') ? (parseFloat(p) / 100) * scale : parseFloat(p));
  const [r, g, b] = parts.slice(0, 3).map((p) => Math.round(num(p, 255)));
  const a = parts[3] === undefined ? 1 : round(num(parts[3], 1));
  return `rgba(${r},${g},${b},${a})`;
}

/** 一段文字裡的顏色字面值：[{ raw, key }]，key 是正規化後拿來跟色票比的字串 */
export function colorLiterals(text) {
  const out = [];
  for (const m of text.matchAll(HEX_RE)) out.push({ raw: m[0], key: hexToKey(m[0]) });
  for (const m of text.matchAll(FN_RE)) {
    const key = fnToKey(m[1], m[2]);
    if (key) out.push({ raw: m[0], key });
  }
  return out;
}

/* ───────────────────────── tokens → 檢查用的設定 ───────────────────────── */

const entries = (obj) => Object.entries(obj ?? {}).filter(([k]) => !k.startsWith('$'));

/** tokens.json 的 colors 攤平成 [[色名, { var, value, … }]]（分組只是說明，色名不帶組名） */
export function flatColors(tokens) {
  return entries(tokens.colors).flatMap(([, group]) => entries(group));
}

/**
 * tokens.json → 檢查要用的東西。
 * 色票＝tokens.json 每個顏色的 value（styles/tokens.css 的變數值要跟它一樣，test:design 會比對）。
 */
export function contextFrom(tokens) {
  const palette = new Set();
  for (const [, t] of flatColors(tokens)) for (const c of colorLiterals(t.value)) palette.add(c.key);
  const fontSizes = entries(tokens.fontSize);
  return {
    palette,
    levels: fontSizes.filter(([, t]) => t.level).map(([k]) => k),
    fontTokens: fontSizes.filter(([, t]) => !t.deprecated).map(([k]) => k),
    deprecatedTokens: new Map(fontSizes.filter(([, t]) => t.deprecated).map(([k, t]) => [k, t.deprecated])),
    widthTokens: entries(tokens.maxWidth).map(([k]) => k),
    radiusTokens: entries(tokens.borderRadius).map(([k]) => k),
  };
}

export function loadTokens(root) {
  return JSON.parse(fs.readFileSync(path.join(root, TOKENS_FILE), 'utf8'));
}

export function loadContext(root) {
  return contextFrom(loadTokens(root));
}

/* ───────────────────────── Tailwind 任意值的分類 ───────────────────────── */

const LENGTH_RE = /^(?:length:)?(?:-?\d*\.?\d+(?:px|rem|em|%|vw|vh|dvh|svh|lvh|ch|pt|ex)|(?:clamp|calc|min|max)\(.*\))$/;
const COLOR_VALUE_RE = /^(?:color:)?(?:#|rgba?\(|hsla?\(|color-mix\()/;
const COLOR_PREFIX = /^(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent)$/;
const SPACING_PREFIX = /^(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-[mp][xytrblse]?|indent)$/;
// 版面結構與動畫：tokens 管不到，也不該管
const STRUCTURE_PREFIX = /^(?:grid-cols|grid-rows|col|row|col-span|row-span|col-start|col-end|row-start|row-end|auto-cols|auto-rows|columns|aspect|transition|duration|delay|ease|animate|content|will-change|cursor|object|origin|list)$/;

/** xxx-[值] → 歸哪條規則（null＝不數） */
export function classifyArbitrary(prefix, value) {
  const p = prefix.replace(/^-/, '');
  if (p === 'shadow' || p === 'drop-shadow' || /gradient\(/.test(value)) return 'effect';
  if (COLOR_PREFIX.test(p) && COLOR_VALUE_RE.test(value)) return 'color-arbitrary';
  if (p === 'text') return LENGTH_RE.test(value) ? 'font-size' : null;
  if (p === 'leading') return 'leading';
  if (p === 'tracking') return 'tracking';
  if (p === 'font') return 'font-weight';
  if (/^(?:min-|max-)?w$/.test(p)) return 'width';
  if (/^rounded(?:-[a-z]{1,2})?$/.test(p)) return 'radius';
  if (SPACING_PREFIX.test(p)) return 'spacing';
  if (STRUCTURE_PREFIX.test(p)) return null;
  return 'arbitrary';
}

/** [屬性:值]（Tailwind 的任意屬性）→ 歸哪條規則；不認得的屬性不數 */
const PROP_RULE = {
  'font-size': 'font-size',
  'line-height': 'leading',
  'letter-spacing': 'tracking',
  'font-weight': 'font-weight',
  'font-family': 'font-weight',
  color: 'color-arbitrary',
  background: 'color-arbitrary',
  'background-color': 'color-arbitrary',
  'border-color': 'color-arbitrary',
  'outline-color': 'color-arbitrary',
  fill: 'color-arbitrary',
  stroke: 'color-arbitrary',
  'box-shadow': 'effect',
  'text-shadow': 'effect',
  'background-image': 'effect',
  'border-radius': 'radius',
  width: 'width',
  'min-width': 'width',
  'max-width': 'width',
};
for (const p of ['margin', 'padding']) {
  PROP_RULE[p] = 'spacing';
  for (const s of ['top', 'right', 'bottom', 'left', 'inline', 'block']) PROP_RULE[`${p}-${s}`] = 'spacing';
}
for (const p of ['gap', 'row-gap', 'column-gap', 'top', 'right', 'bottom', 'left', 'inset']) PROP_RULE[p] = 'spacing';

// 前面不能是字母、-、[（不是另一個 class 的一部分）；後面不能接 :（那是 variant，例如 group-has-[…]:）
const ARB_VALUE_RE = /(?<![\w\-[])(-?[a-z][a-z0-9-]*)-\[([^\]\s]+)\](?![\w:-])/g;
const ARB_PROP_RE = /(?<![\w\-[])\[([a-z][a-z-]*):([^\]\s]+)\](?![\w:-])/g;

/** 一行裡所有的 Tailwind 任意值：[{ rule, match }] */
export function arbitraryHits(line) {
  const out = [];
  for (const m of line.matchAll(ARB_VALUE_RE)) {
    const rule = classifyArbitrary(m[1], m[2]);
    if (rule) out.push({ rule, match: m[0] });
  }
  for (const m of line.matchAll(ARB_PROP_RE)) {
    const rule = PROP_RULE[m[1]];
    if (rule) out.push({ rule, match: m[0] });
  }
  return out;
}

/* ───────────────────────── 規則 ───────────────────────── */

/** 不在畫面上的 HTML：不吃 Tailwind，只能寫 CSS 字串。不數 CSS 字串與 style 物件，顏色照數 */
const NON_DOM = [
  /^components\/PrintButton\.tsx$/, // 列印視窗：另開一份文件印開會通知
  /^lib\/meetings\/notice\.ts$/, // 開會通知信件的 HTML
];
/** 顏色是照外部真本做的，不是設計 token：連顏色都不數 */
const FIDELITY = [
  /^lib\/meetings\/notice\.ts$/, // 真本保真：Gmail 調色盤的值（檔頭說明、CLAUDE.md 第 1 條）
];
const isNonDom = (rel) => NON_DOM.some((re) => re.test(rel));
const isFidelity = (rel) => FIDELITY.some((re) => re.test(rel));

const all = (line, re) => [...line.matchAll(re)].map((m) => m[0]);
const arb = (line, key) => arbitraryHits(line).filter((h) => h.rule === key).map((h) => h.match);
/** CSS 檔，或 ts／tsx 裡的 CSS 字串（列印、信件以外） */
const cssText = (opts) => opts.css || !opts.nonDom;

const PALETTE_DEFAULT =
  'black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTIL =
  'bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow';

export const RULES = [
  {
    key: 'font-size',
    title: '字級不在 tokens',
    hint: (ctx) =>
      `字級只用 7 級 ${ctx.levels.map((k) => `text-${k}`).join('／')}（與同級變體）。不寫 text-[NNpx]、text-sm 這類 Tailwind 預設（DESIGN.md 規則 1）`,
    find(line, ctx, opts) {
      const out = [];
      if (cssText(opts)) out.push(...all(line, /(?<![\w[-])font-size\s*:\s*[^;"'`}]*\d[^;"'`}]*/g));
      if (opts.css) return out;
      out.push(...arb(line, 'font-size'));
      out.push(...all(line, /(?<![\w-])text-(?:xs|sm|base|lg|[2-9]?xl)(?![\w-])/g));
      return out;
    },
  },
  {
    key: 'deprecated-token',
    title: '用到已停用的字級 token',
    hint: (ctx) =>
      [...ctx.deprecatedTokens].map(([k, note]) => `text-${k}：${note}`).join('；') || '見 design/tokens.json 的 deprecated',
    find(line, ctx, { css }) {
      if (css || !ctx.deprecatedTokens.size) return [];
      const names = [...ctx.deprecatedTokens.keys()].map((k) => k.replace(/-/g, '\\-')).join('|');
      return all(line, new RegExp(`(?<![\\w-])text-(?:${names})(?![\\w-])`, 'g'));
    },
  },
  {
    key: 'font-weight',
    title: '字重或字型不在 tokens（font-light、font-[…]）',
    hint: () => '字重只用 font-normal／medium／semibold／bold／black，小字不用細體；字型只用 font-serif／sans／ui／mono',
    find(line, ctx, opts) {
      const out = [];
      if (cssText(opts)) out.push(...all(line, /(?<![\w[-])font-weight\s*:\s*(?:[1-3]00|800|lighter)(?!\d)/g));
      if (opts.css) return out;
      out.push(...arb(line, 'font-weight'));
      out.push(...all(line, /(?<![\w-])font-(?:thin|extralight|light|extrabold)(?![\w-])/g));
      return out;
    },
  },
  {
    key: 'leading',
    title: '寫死行高 leading-[…]',
    hint: () => '行高跟著字級 token 走，不另外寫。真的要調，改 design/tokens.json 那一級的 lineHeight',
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'leading')),
  },
  {
    key: 'tracking',
    title: '寫死字距 tracking-[…]',
    hint: () => '字距用 tokens 的 tracking-snug／tag／label／eyebrow／kicker／chap，或跟著字級 token 走',
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'tracking')),
  },
  {
    key: 'color-arbitrary',
    title: '寫死顏色 bg-[#…]／text-[#…]',
    hint: () => '顏色只用 tokens 的色名（text-ink、text-meta、bg-paper2、border-line、bg-accent…）（DESIGN.md 規則 2）',
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'color-arbitrary')),
  },
  {
    key: 'color-default',
    title: 'Tailwind 預設色（gray-500、black…）',
    hint: () => '不用 Tailwind 內建色盤，改用 tokens 的色名。白色可以用 text-white（實色底上的字）',
    find(line, ctx, { css }) {
      if (css) return [];
      return all(line, new RegExp(`(?<![\\w-])(?:${COLOR_UTIL})-(?:${PALETTE_DEFAULT})(?:-\\d{2,3})?(?![\\w-])`, 'g'));
    },
  },
  {
    key: 'off-palette',
    title: '色票外的顏色字面值',
    hint: () => '色值只放在 design/tokens.json 與 styles/tokens.css。要新顏色先兩邊都加，見 DESIGN.md「要加新值時」',
    scope: (rel) => !isFidelity(rel),
    find: (line, ctx) => colorLiterals(line).filter((c) => !ctx.palette.has(c.key)).map((c) => c.raw),
  },
  {
    key: 'inline-style',
    title: 'style 物件寫字級、字重、行高、顏色',
    hint: () => '用 class（text-caption、text-meta、bg-paper2），不寫 style={{ fontSize }}／{{ color }}。動態寬度這類算出來的值可以',
    scope: (rel) => !isNonDom(rel),
    find(line, ctx, { css }) {
      if (css) return [];
      return [
        ...all(line, /(?<![\w$])(?:fontSize|lineHeight|letterSpacing|fontWeight|fontFamily)\s*:/g),
        ...all(line, /\.style\.(?:fontSize|lineHeight|letterSpacing|fontWeight|fontFamily|color|backgroundColor)\s*=/g),
        ...all(line, /(?<![\w$])(?:color|background|backgroundColor|borderColor)\s*:\s*['"`](?:#|rgba?\(|hsla?\(|var\()/g),
      ];
    },
  },
  {
    key: 'width',
    title: '寫死寬度 w-[…]／max-w-[…]',
    hint: (ctx) =>
      `內容寬度只有 ${ctx.widthTokens.map((k) => `max-w-${k}`).join('、')}；元件內的寬度用 Tailwind 的級距（w-64、max-w-sm、min-w-[…] 改 min-w-0／min-w-fit）`,
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'width')),
  },
  {
    key: 'container-width',
    title: '頁面容器寬度不在 tokens（mx-auto 配 max-w-*）',
    hint: (ctx) => `頁面容器一律 mx-auto ${ctx.widthTokens.map((k) => `max-w-${k}`).join('／')}（DESIGN.md 規則 3）`,
    find(line, ctx, { css }) {
      if (css || !/(?<![\w-])mx-auto(?![\w-])/.test(line)) return [];
      const ok = new Set([...ctx.widthTokens, 'full', 'none', 'fit', 'min', 'max']);
      return [...line.matchAll(/(?<![\w-])max-w-([\w.]+)(?![\w-])/g)].filter((m) => !ok.has(m[1])).map((m) => m[0]);
    },
  },
  {
    key: 'spacing',
    title: '寫死間距、位置 p-[…]／gap-[…]／top-[…]',
    hint: () =>
      '間距用 Tailwind 內建級距（4px 一格：gap-2、p-4、mt-6）或 tokens 的 section／wrap／card（py-section、px-wrap、p-card）',
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'spacing')),
  },
  {
    key: 'radius',
    title: '圓角不在 tokens',
    hint: (ctx) => `圓角只用 ${ctx.radiusTokens.map((k) => `rounded-${k}`).join('、')}（以直角為主）`,
    find(line, ctx, opts) {
      const out = [];
      if (cssText(opts)) out.push(...all(line, /(?<![\w[-])border-radius\s*:\s*(?!\s|var\()[^;"'`}]*\d[^;"'`}]*/g));
      if (opts.css) return out;
      out.push(...arb(line, 'radius'));
      const ok = new Set(ctx.radiusTokens);
      for (const m of line.matchAll(/(?<![\w-])rounded(?:-(?:tl|tr|br|bl|ss|se|es|ee|t|r|b|l|s|e))?(?:-(sm|md|lg|xl|2xl|3xl|full|none))?(?![\w-])/g)) {
        if (!m[1] || !ok.has(m[1])) out.push(m[0]);
      }
      return out;
    },
  },
  {
    key: 'effect',
    title: '陰影、漸層',
    hint: () => '不用陰影、漸層、發光（DESIGN-SYSTEM §7）。層次靠線（border-line）與底色（bg-paper2）',
    find(line, ctx, opts) {
      const out = [];
      if (cssText(opts)) {
        out.push(...all(line, /(?<![\w[-])(?:box-shadow|text-shadow)\s*:\s*(?!\s|none\b)[^;"'`}]+/g));
        out.push(...all(line, /(?<![\w-])(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/g));
      }
      if (opts.css) return out;
      if (!opts.nonDom) out.push(...all(line, /(?<![\w$])(?:boxShadow|textShadow)\s*:/g));
      out.push(...arb(line, 'effect'));
      out.push(...all(line, /(?<![\w-])(?:drop-)?shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?![\w-])/g));
      out.push(...all(line, /(?<![\w-])bg-gradient-to-[trbl]{1,2}(?![\w-])/g));
      return out;
    },
  },
  {
    key: 'arbitrary',
    title: '其他 Tailwind 任意值（h-[…]、z-[…]、opacity-[…]、border-l-[…]）',
    hint: () => '用 Tailwind 的級距（h-10、z-10、opacity-70、border-l-2）。真的需要固定值，加進 design/tokens.json 再用（DESIGN.md「要加新值時」）',
    find: (line, ctx, { css }) => (css ? [] : arb(line, 'arbitrary')),
  },
];

export const RULE_KEYS = RULES.map((r) => r.key);

/* ───────────────────────── 掃描 ───────────────────────── */

/** 一個檔案的所有違規：[{ rule, line, match, text }] */
export function scanSource(rel, source, ctx) {
  const css = rel.endsWith('.css');
  const opts = { css, nonDom: isNonDom(rel) };
  const code = blankComments(source, { css }).split('\n');
  const raw = source.split('\n');
  const hits = [];
  for (const rule of RULES) {
    if (rule.scope && !rule.scope(rel)) continue;
    code.forEach((line, i) => {
      for (const match of rule.find(line, ctx, opts)) {
        hits.push({ rule: rule.key, line: i + 1, match, text: raw[i].trim().slice(0, 140) });
      }
    });
  }
  return hits;
}

export function countByRule(hits) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const h of hits) out[h.rule] = (out[h.rule] || 0) + 1;
  return out;
}

/** 掃整個 repo：{ counts: { 檔: { 規則: 數 } }, hits: { 檔: [...] } }，0 的不記 */
export function scanAll(root, ctx) {
  const counts = {};
  const hits = {};
  for (const dir of SCAN_DIRS) {
    for (const abs of walk(path.join(root, dir))) {
      const rel = toRel(root, abs);
      if (!inScope(rel)) continue;
      const h = scanSource(rel, fs.readFileSync(abs, 'utf8'), ctx);
      if (!h.length) continue;
      counts[rel] = countByRule(h);
      hits[rel] = h;
    }
  }
  return { counts, hits };
}

/* ───────────────────────── 跟基準比 ───────────────────────── */

/**
 * base、now 都是 { 檔: { 規則: 數 } }。files 是這次有檢查的檔（全掃時是 now 的鍵加上基準裡還在的檔）。
 * exists(rel) 判斷檔案還在不在，用來認「改名」。
 * 回傳 worse（比基準多）、better（比基準少）、renamed（新檔 → 舊檔）。
 */
export function compare(base, now, files, exists) {
  const renamed = {};
  const gone = Object.keys(base).filter((f) => !exists(f));
  const used = new Set();
  for (const f of files) {
    if (base[f] || !now[f]) continue;
    const from = gone.find((g) => !used.has(g) && RULE_KEYS.every((k) => (now[f][k] || 0) <= (base[g][k] || 0)));
    if (from) {
      renamed[f] = from;
      used.add(from);
    }
  }
  const worse = [];
  const better = [];
  for (const f of files) {
    const b = base[f] || base[renamed[f]] || {};
    const n = now[f] || {};
    for (const k of RULE_KEYS) {
      const was = b[k] || 0;
      const is = n[k] || 0;
      if (is > was) worse.push({ file: f, rule: k, was, now: is });
      else if (is < was) better.push({ file: f, rule: k, was, now: is });
    }
  }
  return { worse, better, renamed };
}

export function readBaseline(root) {
  const p = path.join(root, BASELINE_FILE);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function baselineFrom(counts) {
  /** @type {Record<string, Record<string, number>>} */
  const files = {};
  const totals = Object.fromEntries(RULE_KEYS.map((k) => [k, 0]));
  for (const f of Object.keys(counts).sort()) {
    const row = {};
    for (const k of RULE_KEYS) {
      if (!counts[f][k]) continue;
      row[k] = counts[f][k];
      totals[k] += counts[f][k];
    }
    if (Object.keys(row).length) files[f] = row;
  }
  const stamp = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10); // 臺灣日期
  return {
    $說明:
      '設計規範棘輪的基準（scripts/design-check.mjs）。每個檔案×每條規則的現有違規數，只准變少：修掉之後跑 npm run design:check -- --update。不要手動調高來讓檢查過關，見 DESIGN.md「要加新值時」。',
    updated: stamp,
    totals,
    files,
  };
}

/* ───────────────────────── 這次新加的是哪幾行 ───────────────────────── */

/** HEAD 版本的檔案內容（讀不到就是新檔，回傳空字串） */
function headVersion(root, rel) {
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * now 裡面、old 沒有的違規。分兩輪扣：
 *   1. 同規則、同字串、同一行內容 → 沒動到的行
 *   2. 剩下的再只比規則＋字串 → 動到的那一行裡本來就有的（例：在已經有 text-[40px] 的那行加 text-[13px]，只列 text-[13px]）
 */
export function newHits(nowHits, oldHits) {
  const take = (pool, k) => {
    const left = pool.get(k) || 0;
    if (!left) return false;
    pool.set(k, left - 1);
    return true;
  };
  const exact = (h) => `${h.rule}\u0000${h.match}\u0000${h.text}`;
  const loose = (h) => `${h.rule}\u0000${h.match}`;
  const pool1 = new Map();
  for (const h of oldHits) pool1.set(exact(h), (pool1.get(exact(h)) || 0) + 1);
  const restNow = nowHits.filter((h) => !take(pool1, exact(h)));
  const restOld = oldHits.filter((h) => {
    const k = exact(h);
    const left = pool1.get(k) || 0;
    if (left > 0) {
      pool1.set(k, left - 1);
      return true; // 這一筆沒被第一輪用掉
    }
    return false;
  });
  const pool2 = new Map();
  for (const h of restOld) pool2.set(loose(h), (pool2.get(loose(h)) || 0) + 1);
  return restNow.filter((h) => !take(pool2, loose(h)));
}

/* ───────────────────────── 輸出 ───────────────────────── */

const ruleOf = (key) => RULES.find((r) => r.key === key);

/** 變多的檔：每條規則列出這次新加的那幾行（找不到就列這個檔該規則的全部，最多 12 行） */
export function describeWorse(worse, hitsByFile, ctx, { root, renamed = {}, preferNew = true } = {}) {
  const lines = [];
  const byFile = new Map();
  for (const w of worse) byFile.set(w.file, [...(byFile.get(w.file) || []), w]);
  for (const [file, rows] of byFile) {
    lines.push(`✗ ${file}${renamed[file] ? `（當成 ${renamed[file]} 改名）` : ''}`);
    let fresh = null;
    if (preferNew && root) {
      const oldSrc = headVersion(root, file);
      fresh = newHits(hitsByFile[file] || [], oldSrc ? scanSource(file, oldSrc, ctx) : []);
    }
    for (const w of rows) {
      const rule = ruleOf(w.rule);
      lines.push(`    ${rule.title}：基準 ${w.was}，現在 ${w.now}`);
      const own = (hitsByFile[file] || []).filter((h) => h.rule === w.rule);
      const added = fresh ? fresh.filter((h) => h.rule === w.rule) : [];
      const show = added.length ? added : own;
      for (const h of show.slice(0, 12)) lines.push(`      :${h.line}  ${h.match}    ${h.text}`);
      if (show.length > 12) lines.push(`      …還有 ${show.length - 12} 處（--list --rule ${w.rule}）`);
      if (!added.length && own.length) lines.push('      （認不出是哪幾處新加的，上面是這個檔這條規則的全部）');
      lines.push(`    → ${rule.hint(ctx)}`);
    }
  }
  return lines;
}

const FIX_FOOTER = [
  '',
  '改法：照上面每條的 → 換成 token。真的需要新值，先改 design/tokens.json 與 styles/tokens.css（DESIGN.md「要加新值時」）。',
  '不要調高 design/baseline.json 讓它過關。',
];

/* ───────────────────────── 指令 ───────────────────────── */

function parseArgs(argv) {
  const flags = new Set();
  const files = [];
  let rule = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rule') rule = argv[++i];
    else if (a.startsWith('--')) flags.add(a);
    else files.push(a);
  }
  return { flags, files, rule };
}

function printSummary(base, counts) {
  const sum = (obj, k) => Object.values(obj).reduce((s, row) => s + (row[k] || 0), 0);
  console.log(`設計規範棘輪（基準 ${base.updated}）  現在 / 基準\n`);
  for (const r of RULES) {
    const is = sum(counts, r.key);
    const was = sum(base.files, r.key);
    const mark = is > was ? '✗' : is < was ? '↓' : ' ';
    console.log(`  ${mark} ${String(is).padStart(5)} / ${String(was).padEnd(5)} ${r.title}`);
  }
}

/** 全掃一次跟基準比（全部檢查、hook 改到 tokens 時共用） */
function compareAll(root, ctx, base) {
  const { counts, hits } = scanAll(root, ctx);
  const exists = (rel) => fs.existsSync(path.join(root, rel));
  const files = new Set([...Object.keys(counts), ...Object.keys(base.files).filter(exists)]);
  const result = compare(base.files, counts, [...files].sort(), exists);
  const gone = Object.keys(base.files).filter((f) => !exists(f) && !Object.values(result.renamed).includes(f));
  return { counts, hits, gone, ...result };
}

/** 全部檢查（含 --update、--list、--init） */
function runAll(root, { flags, rule }) {
  const ctx = loadContext(root);
  const base = readBaseline(root);

  if (flags.has('--init')) {
    if (base) {
      console.error(`${BASELINE_FILE} 已經有了。基準只准往下調：用 --update。`);
      return 1;
    }
    const { counts } = scanAll(root, ctx);
    fs.mkdirSync(path.join(root, 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, BASELINE_FILE), JSON.stringify(baselineFrom(counts), null, 2) + '\n');
    console.log(`已建立 ${BASELINE_FILE}`);
    return 0;
  }
  if (!base) {
    console.error(`找不到 ${BASELINE_FILE}。第一次建立：node scripts/design-check.mjs --init`);
    return 1;
  }

  const { counts, hits, worse, better, renamed, gone } = compareAll(root, ctx, base);

  printSummary(base, counts);

  if (flags.has('--list')) {
    if (rule && !RULE_KEYS.includes(rule)) {
      console.error(`\n沒有這條規則：${rule}。可用：${RULE_KEYS.join('、')}`);
      return 1;
    }
    for (const r of RULES) {
      if (rule && r.key !== rule) continue;
      const rows = Object.entries(hits).flatMap(([f, hs]) => hs.filter((h) => h.rule === r.key).map((h) => ({ f, ...h })));
      if (!rows.length) continue;
      console.log(`\n── ${r.title}（${r.key}，${rows.length}）──`);
      for (const h of rows) console.log(`  ${h.f}:${h.line}  ${h.match}`);
    }
  }

  console.log('');
  if (worse.length) {
    for (const l of describeWorse(worse, hits, ctx, { root, renamed, preferNew: false })) console.log(l);
    for (const l of FIX_FOOTER) console.log(l);
    console.error('\n不通過：有檔案比基準多了違規。');
    return 1;
  }

  const stale = better.length > 0 || gone.length > 0 || Object.keys(renamed).length > 0;
  if (flags.has('--update')) {
    if (!stale) {
      console.log('基準沒有變化。');
      return 0;
    }
    fs.writeFileSync(path.join(root, BASELINE_FILE), JSON.stringify(baselineFrom(counts), null, 2) + '\n');
    console.log(`已更新 ${BASELINE_FILE}：`);
    for (const b of better) console.log(`  ↓ ${b.file}  ${ruleOf(b.rule).title}  ${b.was} → ${b.now}`);
    for (const [to, from] of Object.entries(renamed)) console.log(`  → ${from} 改名為 ${to}`);
    for (const f of gone) console.log(`  − ${f}（檔案已不在）`);
    return 0;
  }
  if (stale) {
    console.log('違規比基準少了（或有檔案改名、刪除）：');
    for (const b of better.slice(0, 20)) console.log(`  ↓ ${b.file}  ${ruleOf(b.rule).title}  ${b.was} → ${b.now}`);
    if (better.length > 20) console.log(`  …共 ${better.length} 項`);
    for (const [to, from] of Object.entries(renamed)) console.log(`  → ${from} 改名為 ${to}`);
    for (const f of gone) console.log(`  − ${f}（檔案已不在）`);
    console.error('\n不通過：基準要跟著往下釘，不然省下來的額度之後會被別的改動用掉。跑 npm run design:check -- --update，連同 design/baseline.json 一起提交。');
    return 1;
  }
  console.log('通過。');
  return 0;
}

/**
 * 只查指定的檔。回傳 { ok, lines }，不印、不結束程式（--changed 與 --hook 共用）。
 * 不在檢查範圍、已經刪掉的檔跳過；全部跳過就是通過。
 * 改到的是 design/tokens.json 或 styles/tokens.css 時全掃：拿掉一個顏色、停用一個字級，影響的是別的檔。
 */
export function checkFiles(root, absFiles) {
  const base = readBaseline(root);
  if (!base) return { ok: true, lines: [] }; // 這個 repo 還沒有基準：不擋
  const ctx = loadContext(root);
  const rels = absFiles.map((abs) => toRel(root, abs));
  if (rels.some((rel) => rel === TOKENS_FILE || rel === 'styles/tokens.css')) {
    const { worse, hits, renamed } = compareAll(root, ctx, base);
    if (!worse.length) return { ok: true, lines: [] };
    return {
      ok: false,
      lines: ['改了 tokens，全掃一次：', ...describeWorse(worse, hits, ctx, { root, renamed, preferNew: false }), ...FIX_FOOTER],
    };
  }
  const counts = {};
  const hits = {};
  const files = [];
  for (const [i, abs] of absFiles.entries()) {
    const rel = rels[i];
    if (!inScope(rel) || !fs.existsSync(abs)) continue;
    files.push(rel);
    const h = scanSource(rel, fs.readFileSync(abs, 'utf8'), ctx);
    if (h.length) {
      counts[rel] = countByRule(h);
      hits[rel] = h;
    }
  }
  if (!files.length) return { ok: true, lines: [] };
  const exists = (rel) => fs.existsSync(path.join(root, rel));
  const { worse, renamed } = compare(base.files, counts, files, exists);
  if (!worse.length) return { ok: true, lines: [] };
  return { ok: false, lines: [...describeWorse(worse, hits, ctx, { root, renamed }), ...FIX_FOOTER] };
}

/** 從改到的檔往上找 repo 根目錄（有 design/baseline.json 的那一層）。在 worktree 裡改檔時用的是 worktree 自己的基準 */
export function findRoot(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (fs.existsSync(path.join(dir, BASELINE_FILE)) && fs.existsSync(path.join(dir, TOKENS_FILE))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/**
 * PostToolUse hook 的判斷：payload 是 Claude Code 從 stdin 給的 JSON。
 * 回傳要交回給 Claude 的訊息；沒事回傳 null。
 */
export function hookDecide(payload) {
  const file = payload?.tool_input?.file_path ?? payload?.tool_response?.filePath;
  if (typeof file !== 'string' || !/\.(tsx|ts|css|json)$/.test(file)) return null;
  const root = findRoot(file);
  if (!root) return null;
  const { ok, lines } = checkFiles(root, [path.resolve(file)]);
  if (ok) return null;
  return ['設計規範關卡（scripts/design-check.mjs）：這次的改動讓違規比基準多了。規則見 DESIGN.md。', '', ...lines].join('\n');
}

async function main() {
  const { flags, files, rule } = parseArgs(process.argv.slice(2));

  if (flags.has('--hook')) {
    // hook 自己出錯（輸入讀不懂、程式有 bug）一律放行：每次改檔都會跑，壞掉時擋住會讓整個 session 做不了事。
    // 只用 systemMessage 告訴人，不交給 Claude
    try {
      let raw = '';
      for await (const chunk of process.stdin) raw += chunk;
      const msg = hookDecide(JSON.parse(raw || '{}'));
      if (!msg) return 0;
      process.stderr.write(msg + '\n');
      return 2;
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      process.stdout.write(JSON.stringify({ systemMessage: `設計規範檢查沒跑成（不擋）：${why.slice(0, 300)}` }));
      return 0;
    }
  }

  if (flags.has('--changed')) {
    const abs = files.map((f) => path.resolve(f));
    const root = abs.length ? findRoot(abs[0]) || DEFAULT_ROOT : DEFAULT_ROOT;
    const { ok, lines } = checkFiles(root, abs);
    if (ok) return 0;
    for (const l of lines) console.error(l);
    return 1;
  }

  return runAll(DEFAULT_ROOT, { flags, rule });
}

// 被測試 import 時不跑 main。比對真實路徑：專案目錄經過符號連結（macOS 的 /tmp）時兩邊寫法會不一樣
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (isMain) {
  // 用 exitCode 不用 process.exit()：macOS 上 stdout／stderr 接管線時是非同步寫，馬上 exit 會把訊息截掉
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(err);
      process.exitCode = process.argv.includes('--hook') ? 0 : 1;
    },
  );
}
