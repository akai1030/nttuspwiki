/**
 * 建交互參照圖：掃全部條文的《法規》第X條 / 準用 / 牴觸，寫入 LawReference。
 * 冪等（先清空再重建）。用法：npm run refs:build
 */
import { PrismaClient } from "@prisma/client";
import { extractRefs, resolveLawId } from "./extract";

const prisma = new PrismaClient();

async function main() {
  const laws = await prisma.law.findMany({ select: { id: true, number: true, name: true } });
  const arts = await prisma.article.findMany({ select: { lawId: true, number: true, body: true } });
  const lawById = new Map(laws.map((l) => [l.id, l]));

  const rows: {
    fromLawId: string;
    fromArticleNo: string;
    toLawName: string;
    toLawId: string | null;
    toArticleNo: string | null;
    kind: string;
    raw: string;
  }[] = [];

  for (const a of arts) {
    for (const r of extractRefs(a.body)) {
      rows.push({
        fromLawId: a.lawId,
        fromArticleNo: a.number,
        toLawName: r.toLawName,
        toLawId: resolveLawId(r.toLawName, laws),
        toArticleNo: r.toArticleNo,
        kind: r.kind,
        raw: r.raw,
      });
    }
  }

  await prisma.lawReference.deleteMany();
  // 批次寫入
  for (let i = 0; i < rows.length; i += 200) {
    await prisma.lawReference.createMany({ data: rows.slice(i, i + 200) });
  }

  const resolved = rows.filter((r) => r.toLawId).length;
  const byKind = rows.reduce<Record<string, number>>((m, r) => {
    m[r.kind] = (m[r.kind] || 0) + 1;
    return m;
  }, {});
  console.log(`參照邊：${rows.length} 筆　解析到語料內 toLawId：${resolved}　語料外：${rows.length - resolved}`);
  console.log(`by kind：${JSON.stringify(byKind)}`);

  // 語料外（未解析）的 distinct 名，供人工確認是否漏配
  const ext = [...new Set(rows.filter((r) => !r.toLawId).map((r) => r.toLawName))];
  console.log(`語料外 distinct 名（${ext.length}）：`, ext.join("、"));

  // 指向母法（組織章程）的邊數（ARCHITECTURE：母法被引用最多）
  const charter = laws.find((l) => l.number === "0.0");
  if (charter) {
    const toCharter = rows.filter((r) => r.toLawId === charter.id).length;
    console.log(`指向《組織章程》(0.0) 的參照：${toCharter} 筆`);
  }
  void lawById;
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  return prisma.$disconnect();
});
