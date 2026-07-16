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
