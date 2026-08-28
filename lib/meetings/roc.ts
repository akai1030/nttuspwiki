/**
 * 民國日期格式化 — 一律以台灣時區（Asia/Taipei）呈現，配合開會通知/議程公版用語。
 * DB 存 UTC，顯示轉台北時間；民國年 = 西元年 - 1911。
 */
const TZ = "Asia/Taipei";

type RocParts = {
  rocYear: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayLong: string; // 星期三
  weekdayShort: string; // 三
};

export function rocParts(d: Date): RocParts {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const m: Record<string, string> = {};
  for (const p of f.formatToParts(d)) m[p.type] = p.value;
  const weekdayLong = new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, weekday: "long" }).format(d);
  return {
    rocYear: Number(m.year) - 1911,
    month: Number(m.month),
    day: Number(m.day),
    hour: Number(m.hour),
    minute: Number(m.minute),
    weekdayLong,
    weekdayShort: weekdayLong.replace("星期", ""),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 依時段給稱謂（公版慣用「晚間19:00」＝時段標籤＋24 小時制）。
function period(hour: number): string {
  if (hour < 12) return "上午";
  if (hour < 18) return "下午";
  return "晚間";
}

/** 「115年7月15日（星期三）晚間19:00」— 會議重要資訊用。 */
export function rocDateTimeFull(d: Date): string {
  const p = rocParts(d);
  return `${p.rocYear}年${p.month}月${p.day}日（${p.weekdayLong}）${period(p.hour)}${p.hour}:${pad2(p.minute)}`;
}

/** 「115年07月15日（三）19:00」— 開會通知/議程用（月日補零、週次短寫、無時段稱謂，對齊真本）。 */
export function rocDateTime(d: Date): string {
  const p = rocParts(d);
  return `${p.rocYear}年${pad2(p.month)}月${pad2(p.day)}日（${p.weekdayShort}）${p.hour}:${pad2(p.minute)}`;
}

/** 「115年7月15日（星期三）」— 純日期。 */
export function rocDate(d: Date): string {
  const p = rocParts(d);
  return `${p.rocYear}年${p.month}月${p.day}日（${p.weekdayLong}）`;
}

/** 「07/15（三）」— 函送日等短格式。 */
export function mmddWeek(d: Date): string {
  const p = rocParts(d);
  return `${pad2(p.month)}/${pad2(p.day)}（${p.weekdayShort}）`;
}

/** 「115年07月05日（星期日）23時59分」— 提案截止用。 */
export function rocDeadline(d: Date): string {
  const p = rocParts(d);
  return `${p.rocYear}年${pad2(p.month)}月${pad2(p.day)}日（${p.weekdayLong}）${p.hour}時${pad2(p.minute)}分`;
}

/**
 * 解析 <input type="datetime-local"> 的值（無時區，代表台灣牆上時間）為 UTC Date。
 * 台灣全年 UTC+8、無日光節約，故固定補 +08:00。
 */
export function parseTaipeiLocal(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+08:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** UTC Date → 台北時間的 datetime-local 值「YYYY-MM-DDTHH:MM」（編輯表單預填）。 */
export function toTaipeiInputValue(d: Date): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const m: Record<string, string> = {};
  for (const p of f.formatToParts(d)) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
}

/**
 * 由日期推出「N學年度第M學期」。
 *
 * 台灣學年度以 8 月為界，**上學期會跨年**：
 *   8–12 月 → 該民國年學年度、第 1 學期
 *   1 月    → 前一民國年學年度、第 1 學期（上學期的尾巴，不是下學期）
 *   2–7 月  → 前一民國年學年度、第 2 學期
 * 例：115年8月 → 115學年度第1學期；115年1月 → 114學年度第1學期；
 *     115年7月 → 114學年度第2學期（與既有的七月議會臨時會資料相符）。
 *
 * 供「建立會議」表單預填 —— 這個欄位每學期只會變一次，不該每場手打。
 */
export function academicTermOf(d: Date): string {
  const { rocYear, month } = rocParts(d);
  const year = month >= 8 ? rocYear : rocYear - 1;
  const term = month >= 8 || month === 1 ? 1 : 2;
  return `${year}學年度第${term}學期`;
}

/**
 * 「115年07月15日（三）晚間19:00」— 開會通知單開頭句用。
 *
 * 真本體例：開頭那句用短週次＋時段稱謂，下方「會議時間：」那行才用長週次
 * （見 lib/meetings/notice.ts 檔頭的三封真本比對）。月日一律補零 ——
 * 真本自己不一致（七月那封未補零、六月那封有補零），取與全站其他輸出一致的補零。
 */
export function rocDateTimeLead(d: Date): string {
  const p = rocParts(d);
  return `${p.rocYear}年${pad2(p.month)}月${pad2(p.day)}日（${p.weekdayShort}）${period(p.hour)}${p.hour}:${pad2(p.minute)}`;
}
