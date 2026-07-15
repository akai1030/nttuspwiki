/**
 * 議程分節 — 依內政部《會議規範》常見議事順序。可依實際議程調整。
 * 生成議程時依此順序分節排列提案。
 */
export const AGENDA_SECTIONS = [
  "報告事項",
  "討論事項",
  "選舉事項",
  "臨時動議",
  "其他",
] as const;

export type AgendaSection = (typeof AGENDA_SECTIONS)[number];

export const DEFAULT_SECTION: AgendaSection = "討論事項";

/** 中文數字（1–99，議程屆別/案號用）。 */
const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export function zhNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n < 10) return DIGITS[n];
  if (n === 10) return "十";
  if (n < 20) return "十" + DIGITS[n % 10];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return DIGITS[tens] + "十" + (ones ? DIGITS[ones] : "");
  }
  return String(n);
}

/** 全形括號中文序號：（一）（二）… */
export function zhParenIndex(i: number): string {
  return `（${zhNumber(i)}）`;
}
