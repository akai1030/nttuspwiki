import type { Config } from "tailwindcss";

// Phase 1：把 styles/tokens.css 的設計變數命名成 Tailwind utility。
// 這裡不放任何「新」的色碼/字級——值一律指向 var(--token)，tokens.css 才是唯一真理來源
// （CLAUDE.md 設計不漂移：顏色/字級/間距只從 tokens 取）。
const config: Config = {
  // lib/ 也要掃：lib/categories.ts 內含分類標籤的 class 字串（bg-cat-* / text-cat-*）。
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // DESIGN-SYSTEM §5 斷點：860px（首頁/索引）、1000px（閱讀器）。
      screens: {
        hero: "860px",
        rd: "1000px",
      },
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        paper2: "var(--paper2)",
        cloud: "var(--cloud)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        accent2: "var(--accent2)",
        muted: "var(--muted)",
        meta: "var(--meta)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        // 五類分類識別色
        "cat-charter": "var(--cat-charter)",
        "cat-legis": "var(--cat-legis)",
        "cat-exec": "var(--cat-exec)",
        "cat-judic": "var(--cat-judic)",
        "cat-elect": "var(--cat-elect)",
        // 語意
        ok: "var(--ok)",
        warn: "var(--warn)",
        sch: "var(--sch)",
        ref: "var(--ref)",
        "sch-line": "var(--sch-line)",
        // 表面色
        "ref-surface": "var(--ref-surface)",
        "ref-border": "var(--ref-border)",
        "ref-ink": "var(--ref-ink)",
        "toc-on": "var(--toc-on)",
        "warn-surface": "var(--warn-surface)",
        "warn-border": "var(--warn-border)",
        "warn-ink": "var(--warn-ink)",
        "body-ink": "var(--body-ink)",
        "lede-ink": "var(--lede-ink)",
      },
      fontFamily: {
        serif: "var(--serif)",
        sans: "var(--sans)",
        ui: "var(--ui)",
        mono: "var(--mono)",
      },
      fontSize: {
        "hero-org": ["var(--fs-hero-org)", { lineHeight: "1.04", fontWeight: "700" }],
        "hero-sys": ["var(--fs-hero-sys)", { lineHeight: "1.04", letterSpacing: "0.05em", fontWeight: "900" }],
        "hero-en": ["var(--fs-hero-en)", { lineHeight: "1", letterSpacing: "0.03em", fontWeight: "700" }],
        h2: ["var(--fs-h2)", { lineHeight: "1.1", fontWeight: "700" }],
        h4: ["var(--fs-h4)", { lineHeight: "1.3", fontWeight: "600" }],
        "law-title": ["var(--fs-law-title)", { lineHeight: "1.1", letterSpacing: "0.01em", fontWeight: "900" }],
        "art-name": ["var(--fs-art-name)", { lineHeight: "1.5", fontWeight: "600" }],
        "art-body": ["var(--fs-art-body)", { lineHeight: "2.05" }],
        lede: ["var(--fs-lede)", { lineHeight: "1.9" }],
        body: ["var(--fs-body)", { lineHeight: "1.75" }],
        // 小字尺寸命名為 caption（避免與 colors.meta 撞成同一個 .text-meta）。
        caption: ["var(--fs-meta)", { lineHeight: "1.6" }],
        eyebrow: ["var(--fs-eyebrow)", { lineHeight: "1", letterSpacing: "0.13em" }],
        code: ["var(--fs-code)", { lineHeight: "1.5" }],
        bignum: ["var(--fs-bignum)", { lineHeight: "1", letterSpacing: "-0.01em", fontWeight: "700" }],
        "row-num": ["var(--fs-row-num)", { lineHeight: "1" }],
        "cat-label": ["var(--fs-cat-label)", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "700" }],
        chap: ["var(--fs-chap)", { lineHeight: "1.4", letterSpacing: "0.3em", fontWeight: "700" }],
        chip: ["var(--fs-chip)", { lineHeight: "1" }],
        nav: ["var(--fs-nav)", { lineHeight: "1", fontWeight: "500" }],
        brand: ["var(--fs-brand)", { lineHeight: "1.2", fontWeight: "600" }],
        "row-name": ["var(--fs-row-name)", { lineHeight: "1.3", fontWeight: "500" }],
        "cat-en": ["var(--fs-cat-en)", { lineHeight: "1", letterSpacing: "0.12em", fontWeight: "500" }],
        // 邊註字級：字重/顏色（非更小字級）區分「標籤 vs 內文」的層級（§2.1 ≥12.5px）。
        "note-label": ["var(--fs-note-label)", { lineHeight: "1.2", letterSpacing: "0.06em", fontWeight: "700" }],
        note: ["var(--fs-note)", { lineHeight: "1.65" }],
      },
      letterSpacing: {
        snug: "0.02em",
        tag: "0.06em",
        eyebrow: "0.13em",
        label: "0.08em",
        chap: "0.3em",
        kicker: "0.2em",
        // 註：不覆寫 Tailwind 內建 tracking-wide；分類 EN 的 .12em 已寫進 text-cat-en 的 tuple。
      },
      maxWidth: {
        wrap: "var(--wrap-max)",
        "wrap-reader": "var(--wrap-max-reader)",
        reader: "var(--reader-max)",
      },
      spacing: {
        section: "var(--sp-section)",
        "section-sm": "var(--sp-section-sm)",
        wrap: "var(--sp-wrap-pad)",
        "wrap-sm": "var(--sp-wrap-pad-sm)",
        card: "var(--sp-card)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
    },
  },
  plugins: [],
};

export default config;
