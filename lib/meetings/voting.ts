/**
 * 線上表決的純邏輯（不碰 DB，供後台、看板、公開頁、議員投票頁共用）。
 *
 * 規則（2026-09-29 議會決定）：
 *   - 表決只有「同意／不同意」兩個選項；出席但沒投的算廢票，可以不投。
 *   - 選舉每人投一位候選人。
 *   - 記名投票的「誰投了什麼」在看板與公開頁列名；無記名只給票數。
 *
 * 人在迴路（CLAUDE.md 第 2 條）：這裡只計票、換算門檻，不宣告通過或當選 —— 由主席宣布。
 */

export const MOTION_OPTIONS = ["同意", "不同意"] as const;

export type VoteKind = "motion" | "election";
export type VoteStatus = "open" | "closed" | "voided";

export function methodLabel(secret: boolean): string {
  return secret ? "無記名投票" : "記名投票";
}

/**
 * 法定表決方式 → 是否無記名。法規用詞有「無記名投票」「不記名投票」「記名投票」三種；
 * 法未指定（null）回 null，由主席開票時自選。
 */
export function secretFromLawMethod(method: string | null | undefined): boolean | null {
  if (!method) return null;
  if (/[無不]記名/.test(method)) return true;
  if (method.includes("記名")) return false;
  return null;
}

export const MAX_CANDIDATES = 20;
const MAX_LABEL = 40;

/** 候選人名單：一行一位，去空白、去重複；超過上限或空白就回錯誤訊息。 */
export function parseCandidates(text: string): { ok: true; names: string[] } | { ok: false; reason: string } {
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const n = line.trim();
    if (!n) continue;
    if (n.length > MAX_LABEL) return { ok: false, reason: `候選人名稱太長（上限 ${MAX_LABEL} 字）：${n.slice(0, 12)}…` };
    if (!names.includes(n)) names.push(n);
  }
  if (names.length === 0) return { ok: false, reason: "請至少填一位候選人。" };
  if (names.length > MAX_CANDIDATES) return { ok: false, reason: `候選人最多 ${MAX_CANDIDATES} 位。` };
  return { ok: true, names };
}

export type OptionCount = { id: string; label: string; order: number; count: number };

export type VoteSummary = {
  /** 開票時點名出席、有權投票的人數 */
  eligible: number;
  /** 實際投票人數 */
  cast: number;
  /** 出席但沒投＝廢票 */
  notVoted: number;
  options: OptionCount[];
  /** 各選項票數總和是否等於投票人數（資料一致性自檢） */
  consistent: boolean;
};

export function summarize(options: OptionCount[], eligible: number, cast: number): VoteSummary {
  const sorted = [...options].sort((a, b) => a.order - b.order);
  const sum = sorted.reduce((s, o) => s + o.count, 0);
  return {
    eligible,
    cast,
    notVoted: Math.max(eligible - cast, 0),
    options: sorted,
    consistent: sum === cast,
  };
}

/** 寫進決議欄的一句話。只陳述票數，通過與否由主席補上。 */
export function resolutionLine(kind: VoteKind, secret: boolean, s: VoteSummary): string {
  const head = kind === "election" ? "選舉結果" : "表決結果";
  const opts = (kind === "election" ? [...s.options].sort((a, b) => b.count - a.count || a.order - b.order) : s.options)
    .map((o) => `${o.label} ${o.count} 票`)
    .join("、");
  return `${head}（${methodLabel(secret)}）：出席 ${s.eligible} 人，${opts}，未投票（廢票）${s.notVoted} 人。`;
}

/** Json 欄位（Recipient.id[]）轉字串陣列；格式不對一律當空名單。 */
export function idList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
