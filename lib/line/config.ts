/**
 * LINE 機器人的設定（2026-11，會前提醒推播）。
 *
 * LINE_CHANNEL_ACCESS_TOKEN 與 LINE_CHANNEL_SECRET 兩個都有值才啟用；少一個就整段關閉：
 * webhook 回 404、排程端點回 disabled、後台顯示「未設定」，會議營運的其他功能照常。
 * 這裡只回「有沒有設」，值本身不寫 log、不回畫面。
 */
export type LineConfig = { token: string; secret: string };

export function lineConfig(): LineConfig | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!token || !secret) return null;
  return { token, secret };
}

/** 排程端點的密鑰最短長度。太短就當沒設，整支端點關閉。 */
export const MIN_CRON_SECRET_LENGTH = 16;

/** 排程呼叫 /api/line/dispatch 用的密鑰（LINE_CRON_SECRET）。 */
export function cronSecret(): string | null {
  const s = process.env.LINE_CRON_SECRET?.trim();
  return s && s.length >= MIN_CRON_SECRET_LENGTH ? s : null;
}

/** 後台「連線設定」顯示用：三個環境變數各自有沒有設。 */
export function lineConfigStatus() {
  return {
    token: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
    secret: Boolean(process.env.LINE_CHANNEL_SECRET?.trim()),
    cron: Boolean(cronSecret()),
  };
}

/**
 * 寄進群組的連結（議事公開頁）用的網站根網址。排程從容器內部呼叫，請求的 Host 是 127.0.0.1，
 * 不能用 lib/site-origin.ts；跟 app/robots.ts、app/sitemap.ts 一樣讀 SITE_URL。
 */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://nttuspcodex.transtation.org").replace(/\/+$/, "");
}
