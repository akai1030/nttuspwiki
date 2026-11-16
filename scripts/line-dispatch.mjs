#!/usr/bin/env node
/**
 * scripts/line-dispatch.mjs · 會前提醒的排程呼叫
 *
 * Coolify 的排程任務（Scheduled Tasks）在網站容器裡跑：node scripts/line-dispatch.mjs
 * 打同一個容器的 /api/line/dispatch，帶 LINE_CRON_SECRET。不需要額外套件（Node 22 內建 fetch）。
 * 輸出一行結果給 Coolify 的執行紀錄；失敗時結束碼不是 0。
 */
const secret = process.env.LINE_CRON_SECRET?.trim();
if (!secret) {
  console.error("LINE_CRON_SECRET 沒設，不呼叫。");
  process.exit(1);
}
const port = process.env.PORT || "3000";
const url = `http://127.0.0.1:${port}/api/line/dispatch`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  console.log(`${new Date().toISOString()} ${res.status} ${text}`);
  if (!res.ok) process.exit(1);
} catch (e) {
  console.error(`${new Date().toISOString()} 呼叫失敗：${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
