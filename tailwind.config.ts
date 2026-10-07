import type { Config } from "tailwindcss";
import tokens from "./design/tokens.json";

// class 名稱的單一來源是 design/tokens.json，規則在 DESIGN.md（2026-10-07）。
// 這裡只把 tokens 轉成 Tailwind 的格式，不要在這裡另外加值：scripts/design-check.mjs 只認 tokens.json。
// 值一律指向 var(--token)，色值、字級的實際數字在 styles/tokens.css（瀏覽器讀那份）；
// tokens.json 的 value 跟 tokens.css 對不上時 npm run test:design 會失敗。

type Entry = {
  var?: string;
  value: string;
  builtin?: boolean;
  tailwind?: boolean;
  lineHeight?: string;
  letterSpacing?: string;
  fontWeight?: string;
  color?: string;
};
type Group = Record<string, Entry | string>;

/** $ 開頭的鍵是說明 */
const items = (group: object) =>
  Object.entries(group as Group).filter((e): e is [string, Entry] => !e[0].startsWith("$"));

/** 有 CSS 變數的指向變數，沒有的（letterSpacing、斷點）直接用值；builtin 是 Tailwind 內建，不另外定義 */
const pick = (group: object) =>
  Object.fromEntries(items(group).filter(([, t]) => !t.builtin).map(([k, t]) => [k, t.var ? `var(${t.var})` : t.value]));

/** colors 分組只是說明用途，class 名稱不帶組名：text.ink → text-ink、bg.paper2 → bg-paper2 */
const colors: Record<string, string> = {};
for (const [, group] of items(tokens.colors)) {
  for (const [name, t] of items(group)) {
    if (t.builtin || t.tailwind === false) continue;
    if (colors[name]) throw new Error(`design/tokens.json 的色名重複：${name}`);
    colors[name] = `var(${t.var})`;
  }
}

/** 字級含 lineHeight／letterSpacing／fontWeight。deprecated 的也照產生（現有畫面不變），檢查程式另外數它 */
const fontSize = Object.fromEntries(
  items(tokens.fontSize).map(([name, t]) => [
    name,
    [
      `var(${t.var})`,
      {
        lineHeight: t.lineHeight,
        ...(t.letterSpacing !== undefined && { letterSpacing: t.letterSpacing }),
        ...(t.fontWeight !== undefined && { fontWeight: t.fontWeight }),
      },
    ],
  ]),
) as Record<string, [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }]>;

const borderColor = Object.fromEntries(
  items(tokens.borderColor).map(([k, t]) => [k, colors[t.color as string]]),
);

const config: Config = {
  // lib/ 也要掃：lib/categories.ts 內含分類標籤的 class 字串（bg-cat-* / text-cat-*）。
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: pick(tokens.breakpoints),
      colors,
      fontFamily: pick(tokens.fontFamily),
      fontSize,
      letterSpacing: pick(tokens.letterSpacing),
      maxWidth: pick(tokens.maxWidth),
      spacing: pick(tokens.spacing),
      borderRadius: pick(tokens.borderRadius),
      borderColor,
    },
  },
  plugins: [],
};

export default config;
