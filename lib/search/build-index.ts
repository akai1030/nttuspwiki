/**
 * 建全文檢索索引：對每條 Article 斷詞 → 寫入 tsv（tsvector, 'simple' config）。
 * 索引文字＝條名 + body（款項已含在 body）。GIN 索引見 migration add_article_tsv_gin。
 * 冪等、可重跑。用法：npm run search:index
 */
import { PrismaClient } from "@prisma/client";
import { segmentForIndex } from "./segment";

const prisma = new PrismaClient();

async function main() {
  const arts = await prisma.article.findMany({
    select: { id: true, name: true, body: true },
  });
  console.log(`索引 ${arts.length} 條…`);

  let done = 0;
  for (const a of arts) {
    const text = [a.name ?? "", a.body].filter(Boolean).join(" ");
    const seg = segmentForIndex(text);
    // 參數化：seg 成為綁定參數，天然擋 injection。
    await prisma.$executeRaw`UPDATE "Article" SET tsv = to_tsvector('simple', ${seg}) WHERE id = ${a.id}`;
    done += 1;
    if (done % 200 === 0) console.log(`  ${done}/${arts.length}`);
  }

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM "Article" WHERE tsv IS NOT NULL`;
  console.log(`完成。tsv 已寫入 ${count} / ${arts.length} 條。`);
  if (Number(count) !== arts.length) {
    console.error("⚠️ 有條文 tsv 未寫入。");
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  return prisma.$disconnect();
});
