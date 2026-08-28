/**
 * 會議語意網址（slug）— 取代 cuid 出現在 /console/meetings/… 與 /meetings/… 路徑上。
 *
 * 形狀：`{屆}-{學年}-{學期}-{月日}-{會別}`，例：21-115-1-0827-special
 * 刻意「不含會議名稱」：updateMeeting 對改名沒有任何限制，而建置期改名是高頻動作；
 * slug 若含 name，每改一次名就製造一批死鏈。四段資訊已足以辨識，且與 lib/format.ts:38
 * 「用 EN 小寫，避免 CJK 進 URL」的既有立場一致。幹部仍可手動改寫成更好認的字串。
 *
 * 舊 cuid 網址永久可用：查詢層以 OR 同時吃 slug 與 id，非正規鍵以 307 轉址到 slug。
 */

export type MeetingKindLike = "REGULAR" | "SPECIAL" | "COMMITTEE";

/** 路由段保留字：撞到就會被 Next 的靜態段吃掉，該場會議永遠打不開。 */
export const RESERVED = new Set([
  "new",
  "edit",
  "recipients",
  "about",
  "schedule",
  "api",
  "votes",
]);

/** slug 不得長得像 cuid，否則 `OR: [{slug}, {id}]` 查詢有歧義。 */
const CUID_LIKE = /^c[a-z0-9]{20,}$/i;

/** 小寫英數與連字號，2–64 字元，需以英數開頭。 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

const KIND_SEG: Record<MeetingKindLike, string> = {
  REGULAR: "regular",
  SPECIAL: "special",
  COMMITTEE: "committee",
};

/**
 * 「115學年度第1學期」→「115-1」。
 * 取前兩組數字；抓不到就回 null，由呼叫端退回不含學年段的形式。
 */
export function academicYearSeg(academicYear: string): string | null {
  const m = academicYear.match(/(\d{2,3})\D+?(\d)/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export type MeetingForSlug = {
  session: number;
  academicYear: string;
  kind: MeetingKindLike;
  meetingAt: Date;
};

/**
 * 由會議資料產生 slug 基底（不含撞名後綴）。
 * 月日一律走 Asia/Taipei（同 lib/meetings/roc.ts）；不可用 getUTCDate()，
 * 台北時間的凌晨場次會被算到前一天。
 */
export function buildMeetingSlug(m: MeetingForSlug): string {
  const parts: string[] = [String(m.session)];
  const ay = academicYearSeg(m.academicYear);
  if (ay) parts.push(ay);
  parts.push(taipeiMonthDay(m.meetingAt));
  parts.push(KIND_SEG[m.kind] ?? "regular");
  return parts.join("-");
}

/** 台北時區的 MMDD。 */
function taipeiMonthDay(d: Date): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return `${p.month ?? "01"}${p.day ?? "01"}`;
}

/** 使用者手輸入的正規化：小寫、空白與底線轉連字號、去掉不合法字元、收合連字號。 */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export type SlugIssue = "empty" | "format" | "reserved" | "cuidLike";

/** 回傳問題種類；合法則回 null。前後端都要跑這支。 */
export function validateSlug(slug: string): SlugIssue | null {
  if (!slug) return "empty";
  if (RESERVED.has(slug)) return "reserved";
  if (CUID_LIKE.test(slug)) return "cuidLike";
  if (!SLUG_RE.test(slug)) return "format";
  return null;
}

/** 撞名後綴：base、base-2、base-3…（保留字與 cuid 形也走這裡讓開）。 */
export function slugCandidate(base: string, n: number): string {
  const b = base || "meeting";
  return n <= 1 ? b : `${b}-${n}`;
}

/**
 * 在既有 slug 集合中挑一個可用的。純函式，方便建立/回填/測試共用。
 * `taken` 由呼叫端從 DB 撈（回填腳本一次撈全部；建立會議時撈同屆即可）。
 */
export function pickAvailableSlug(base: string, taken: ReadonlySet<string>): string {
  const b = normalizeSlug(base) || "meeting";
  for (let n = 1; n < 1000; n += 1) {
    const c = slugCandidate(b, n);
    if (!taken.has(c) && validateSlug(c) === null) return c;
  }
  // 不可能到這裡；保底不丟例外，讓建立流程不會因為 slug 而整個失敗。
  return `${b}-${Date.now()}`;
}

/** 網址段：優先 slug；尚未回填的舊資料退回 cuid（查詢層兩者都吃得到）。 */
export function meetingKey(m: { slug: string | null; id: string }): string {
  return m.slug ?? m.id;
}
