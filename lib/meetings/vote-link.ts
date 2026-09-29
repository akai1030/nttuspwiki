/**
 * 議員專屬投票連結。
 *
 * 連結形如 /v/<Recipient.id>.<簽章>，簽章＝HMAC-SHA256(AUTH_SECRET, 用途＋id＋版本) 取前 16 bytes。
 * 資料庫不存連結本身：DB 外流拿不到任何一條可用的連結；後台要顯示時再算一次即可。
 * 「作廢重發」把 Recipient.voteLinkVersion 加一，舊簽章就對不上了。
 *
 * 注意：換 AUTH_SECRET 會讓所有投票連結一起失效（登入也會全部登出），換完要重寄連結。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const PURPOSE = "nttusp-vote-link:v1";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET 未設定或過短，無法產生投票連結。");
  return s;
}

function mac(recipientId: string, version: number): Buffer {
  return createHmac("sha256", secret())
    .update(`${PURPOSE}:${recipientId}:${version}`)
    .digest()
    .subarray(0, 16);
}

export function voteToken(recipientId: string, version: number): string {
  return `${recipientId}.${mac(recipientId, version).toString("base64url")}`;
}

/** 拆出 id 與簽章；格式不對回 null（不查 DB）。 */
export function parseVoteToken(token: string): { recipientId: string; sig: Buffer } | null {
  const m = /^([a-z0-9]{8,40})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  return { recipientId: m[1], sig: Buffer.from(m[2], "base64url") };
}

/** 以 DB 查到的版本驗簽章（常數時間比對）。 */
export function verifyVoteSig(recipientId: string, version: number, sig: Buffer): boolean {
  const expected = mac(recipientId, version);
  return sig.length === expected.length && timingSafeEqual(sig, expected);
}

export function votePath(recipientId: string, version: number): string {
  return `/v/${voteToken(recipientId, version)}`;
}

/** 寄給議員本人的信：主旨與內文（純文字，給 Gmail 撰寫視窗與複製用）。 */
export function voteLinkMail(r: { name: string; session: number }, url: string) {
  const org = `國立臺東大學第${r.session}屆學生議會`;
  const subject = `【投票連結】${org} 議員專屬投票連結`;
  const body = [
    `${r.name} 議員您好：`,
    "",
    "以下是您本屆的專屬投票連結。議會開會進行線上表決時，請用這條連結投票：",
    url,
    "",
    "一、這條連結代表您本人，請勿轉傳。",
    "二、整屆有效。若不慎外流，請告知祕書處作廢，祕書處會重新寄發。",
    "三、表決開始後打開連結即可投票；沒有進行中的表決時，畫面會顯示等待中。",
    "",
    `${org} 祕書處`,
  ].join("\n");
  return { subject, body };
}

/**
 * Gmail 網頁版撰寫視窗網址：開好收件人、主旨、內文，按送出前仍可修改。
 * 系統不代寄（會議模組的既有決策：只生草稿、人工送出）。
 */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
