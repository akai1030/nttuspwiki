/**
 * DOM 逐字保真檢查（Phase 3 收尾，保真鏈最後一段：DB → 網站顯示）。
 *
 * 對每部現行法規抓取 `/law/{number}` 的渲染 HTML，驗證每一條、每一款的原文字元序列
 * （去空白後）逐字出現在頁面上。前段 `fidelity:source` 已保「PDF → DB」逐字；本步保「DB → 頁面」，
 * 兩段接起來即「PDF 原文 === 使用者看到的條文」——資料保真紅線的端到端驗證。
 *
 * 用法：先另開一個終端 `PORT=3100 npm run start`，再 `BASE=http://localhost:3100 npm run fidelity:dom`。
 * （OneDrive 路徑不能用 next dev，見進度 memory。）
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE ?? "http://localhost:3100";

/** 取渲染 HTML 的純文字（去 script/style/標籤、解常見實體、去空白）供逐字比對。 */
function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, "");
}

async function main() {
  const laws = await prisma.law.findMany({
    where: { isCurrent: true },
    select: { number: true, name: true, articles: { select: { number: true, items: true } } },
  });

  let totalItems = 0;
  const misses: string[] = [];

  for (const law of laws) {
    const res = await fetch(`${BASE}/law/${law.number}`);
    if (!res.ok) {
      misses.push(`${law.number}（${law.name}）HTTP ${res.status}`);
      continue;
    }
    const pageText = stripToText(await res.text());
    for (const a of law.articles) {
      const items = Array.isArray(a.items) ? (a.items as string[]) : [];
      for (const it of items) {
        totalItems++;
        const norm = it.replace(/\s+/g, "");
        if (norm && !pageText.includes(norm)) {
          misses.push(`${law.number} §${a.number}：款項未逐字出現 →「${it.slice(0, 46)}…」`);
        }
      }
    }
    process.stdout.write(".");
  }

  console.log(`\n\nDOM 逐字檢查：${laws.length} 部 / ${totalItems} 款（BASE=${BASE}）`);
  if (misses.length === 0) {
    console.log("✅ 全部逐字命中（render === DB）");
  } else {
    console.log(`❌ ${misses.length} 筆未命中：`);
    misses.slice(0, 50).forEach((m) => console.log("  - " + m));
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  return prisma.$disconnect();
});
