import type { Config } from "tailwindcss";

// Phase 1 依 DESIGN-SYSTEM.md 建立 styles/tokens.css 後，於此映射 tokens。
// 在那之前不定義任何自訂色彩/字級（設計不漂移原則）。
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
