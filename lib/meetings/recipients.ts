/**
 * 收件人字串 — 供承辦複製後貼進 Gmail 的收件者／副本／密件副本欄。
 *
 * 事實依據（2026-08-27 讀 nttusp@ 寄出的真本，Gmail message 1a031df341df7c80）：
 * 議員名單走 Bcc（To: nttusc@、Cc: nttusrc@）。Bcc 的 display-name 對收件端不可見，
 * 所以加姓名的用途是「承辦按送出前，在 chip 上核對人對不對」，不是給收件人看的。
 *
 * 不做 RFC 2047 encoded-word：那是 SMTP header 的 wire format 要求，
 * 而此字串只進 Gmail 撰寫視窗的 UI 欄位、永不直接進郵件標頭，Gmail 送出時自行編碼。
 * 也不做完整 RFC 5322 quoting：對含半形括號或句點的名字加引號，反而更可能讓 UI parser 失敗。
 * 只防兩個真的會切錯的字元：半形逗號（分隔符）與雙引號（破壞引號結構）。
 */
const NEEDS_QUOTE = /[",]/;

export type AddressLike = { name: string; email: string };

export function formatAddress(name: string, email: string): string {
  const e = email.trim();
  const n = name.trim();
  if (!n) return e;
  const d = NEEDS_QUOTE.test(n) ? `"${n.replace(/(["\\])/g, "\\$1")}"` : n;
  return `${d} <${e}>`;
}

/** 含姓名（貼進 Gmail 密件副本欄，chip 顯示名字供送出前核對）。 */
export function formatAddressList(rs: AddressLike[]): string {
  return rs.map((r) => formatAddress(r.name, r.email)).join(", ");
}

/** 僅信箱（給不吃 display-name 的舊系統／CSV 匯入）。 */
export function formatEmailList(rs: AddressLike[]): string {
  return rs.map((r) => r.email.trim()).join(", ");
}
