/**
 * 可決門檻換算 — 把法條的文字門檻換成「這場會議需要幾票」。
 *
 * 全部走整數運算，不用浮點數：票數是整數，四捨五入會在邊界上錯一票，
 * 而在 18 人的議會裡錯一票就是通過與否決之差。
 *
 * 人在迴路（CLAUDE.md 第 2 條）：本模組只算「依這條文字需要幾票」，
 * 不判斷本案屬於哪一類、不比對實際票數、不宣告通過與否。
 * 文字本身有歧義（如光桿的「三分之二」）時一律回 unresolved 並附原文，絕不代為擇一。
 */

/** 分母基準：present＝出席人數；total＝議員總額。 */
export type ThresholdBase = "present" | "total";

/**
 * gte —「以上」「達」：k ≧ 比例
 * gt  —「超過」「過半數」：k ＞ 比例
 * null — 條文措辭無法機械判定（既未寫「以上」亦未寫「超過」），不換算。
 */
export type Comparator = "gte" | "gt" | null;

export type ThresholdRule = {
  /** 顯示用標籤，複合門檻或條文衝突時用來區分。 */
  label?: string;
  base: ThresholdBase;
  num: number;
  den: number;
  comparator: Comparator;
  /** comparator 為 null 時，說明為什麼算不出來。 */
  unresolvedNote?: string;
};

export type TallyOutcome =
  | { kind: "votes"; label?: string; base: ThresholdBase; need: number; of: number }
  | { kind: "unresolved"; label?: string; reason: string }
  | { kind: "missing"; label?: string; base: ThresholdBase };

/**
 * 需要幾票。
 *
 * 令 num/den 為比例、N 為分母基準人數，q = ⌊num·N / den⌋、exact = (q·den === num·N)：
 *   gt  （嚴格大於）→ q + 1
 *   gte （大於等於）→ exact ? q : q + 1
 *
 * 例（N = 18）：
 *   過半數（gt 1/2）    → q=9  exact  → 10
 *   二分之一以上（gte） → q=9  exact  → 9
 *   超過三分之二（gt）  → q=12 exact  → 13
 *   三分之二以上（gte） → q=12 exact  → 12   ← 與上一列差一票，這正是 2.3 §35 與 0.0 §27③ 的衝突
 */
export function requiredVotes(num: number, den: number, comparator: Exclude<Comparator, null>, n: number): number {
  const total = num * n;
  const q = Math.floor(total / den);
  const exact = q * den === total;
  const need = comparator === "gt" ? q + 1 : exact ? q : q + 1;
  // 需要的票數不可能超過分母本身（例如 gt 1/1）。
  return Math.min(Math.max(need, 0), n);
}

export type Attendance = {
  /** 出席人數 */
  present?: number;
  /** 議員總額 */
  total?: number;
};

export function evaluate(rule: ThresholdRule, a: Attendance): TallyOutcome {
  if (rule.comparator === null) {
    return {
      kind: "unresolved",
      label: rule.label,
      reason: rule.unresolvedNote ?? "條文措辭無法機械判定，請人工認定。",
    };
  }
  const n = rule.base === "total" ? a.total : a.present;
  if (!n || n <= 0) return { kind: "missing", label: rule.label, base: rule.base };
  return {
    kind: "votes",
    label: rule.label,
    base: rule.base,
    need: requiredVotes(rule.num, rule.den, rule.comparator, n),
    of: n,
  };
}
