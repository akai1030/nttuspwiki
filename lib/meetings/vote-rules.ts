/**
 * 法定表決方式對照資料層 — 讀 data/vote-rules.json，供「新增提案／設定議程」時提示承辦。
 *
 * 資料保真（CLAUDE.md 第 1 條）：每筆 quote 皆為法規原文精確子字串，
 * lawNumber / article 直取自 法規MD轉檔/法規結構化-第20屆.json，
 * 由 npm run verify:vote-rules 驗證（引文對不上就不放行）。
 *
 * 人在迴路（第 2 條）：本模組只「顯示規定」，不判斷本案屬於哪一類、不計票、不下通過與否的結論。
 * 議案歸類由承辦與主席認定；措辭不同就是不同筆，不合併、不代為擇一。
 *
 * 已知的查無規定（38 部全庫掃描命中 0，不要在 UI 上憑空補上）：
 *   匿名、棄權、廢票、舉手、唱名、起立、視訊、遠距、直播、轉播、委託投票、代理表決
 * 其中「匿名」一詞法規完全未使用 —— UI 一律寫「無記名／記名」。
 */
import raw from "@/data/vote-rules.json";
import type { ThresholdRule } from "./tally";

export type VoteRule = {
  id: string;
  matter: string;
  scope: "assembly" | "committee";
  sections: string[];
  /** 法定表決方式；null＝法未指定。 */
  method: string | null;
  methodNote?: string;
  /** 可決門檻原文措辭；null＝法未規定。 */
  threshold: string | null;
  thresholdNote?: string;
  lawNumber: string;
  lawName: string;
  article: string;
  articleName: string;
  /** 法規原文精確子字串。 */
  quote: string;
  /** 可機械換算的門檻（見 lib/meetings/tally.ts）。條文措辭有歧義者 comparator 為 null。 */
  thresholdRules?: ThresholdRule[];
  /** 與其他條文措辭衝突時的說明（系統不代為擇一）。 */
  conflict?: string;
  note?: string;
};

export const VOTE_RULES = raw as VoteRule[];

/** 引用格式：《法規名》第 N 條。 */
export function citeOf(r: VoteRule): string {
  return `《${r.lawName}》第 ${r.article} 條`;
}

/**
 * 依會議類別與議程分節挑出適用規定。
 * COMMITTEE 場次看委員會規定，其餘看議會規定。
 */
export function rulesFor(kind: string, section: string): VoteRule[] {
  const scope = kind === "COMMITTEE" ? "committee" : "assembly";
  return VOTE_RULES.filter((r) => r.scope === scope && r.sections.includes(section));
}

/** 依 id 取單筆（Proposal.matterType 存的就是 id）。 */
export function ruleById(id: string | null | undefined): VoteRule | null {
  if (!id) return null;
  return VOTE_RULES.find((r) => r.id === id) ?? null;
}

/** 該會議類別下所有規定（供整頁對照用）。 */
export function rulesForKind(kind: string): VoteRule[] {
  const scope = kind === "COMMITTEE" ? "committee" : "assembly";
  return VOTE_RULES.filter((r) => r.scope === scope);
}
