/**
 * 版本標記 — 讓人不必翻 deploy log 就知道線上跑的是哪一版。
 *
 * 三個值都由 next.config.mjs 在建置時 inline（見該檔 env 區塊）：
 *   NEXT_PUBLIC_APP_VERSION  package.json 的 version，人工遞增
 *   NEXT_PUBLIC_BUILD_SHA    commit 短碼，對得回 git log
 *   NEXT_PUBLIC_BUILD_TIME   建置當下的 UTC 時間
 *
 * 建置時間是最可靠的一項：SHA 在某些建置環境抓不到，但時間一定有。
 * 推完之後如果頁尾的時間沒變，就是那次部署沒生效。
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

/** 建置時間（台北時區，MM/DD HH:mm）。取不到就回空字串。 */
export function buildTimeTaipei(): string {
  if (!BUILD_TIME) return "";
  const d = new Date(BUILD_TIME);
  if (Number.isNaN(d.getTime())) return "";
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/** 頁尾用的一行標記，例：v0.2.0 · f0e7e79 · 08/28 22:15 */
export function versionLabel(): string {
  return [APP_VERSION ? `v${APP_VERSION}` : "", BUILD_SHA, buildTimeTaipei()]
    .filter(Boolean)
    .join(" · ");
}
