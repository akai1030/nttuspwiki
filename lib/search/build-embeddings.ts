/**
 * 算並寫入每條 Article 的語意向量（embedding，384 維）。
 * 本地免費離線（@xenova/transformers）；冪等、可重跑。用法：npm run search:embed
 */
import { PrismaClient } from "@prisma/client";
import { embedPassage, toVectorLiteral } from "./embed";

const prisma = new PrismaClient();

async function main() {
  const arts = await prisma.article.findMany({ select: { id: true, name: true, body: true } });
  console.log(`嵌入 ${arts.length} 條…（首次會下載模型，之後離線）`);

  let done = 0;
  for (const a of arts) {
    const text = [a.name ?? "", a.body].filter(Boolean).join("　");
    const vec = await embedPassage(text);
    await prisma.$executeRawUnsafe(
      `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
      toVectorLiteral(vec),
      a.id
    );
    done += 1;
    if (done % 100 === 0) console.log(`  ${done}/${arts.length}`);
  }

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM "Article" WHERE embedding IS NOT NULL`;
  console.log(`完成。embedding 已寫入 ${count} / ${arts.length} 條。`);
  if (Number(count) !== arts.length) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  return prisma.$disconnect();
});
