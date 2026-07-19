/**
 * 單部法規外科更新：把「法規MD轉檔/法規結構化-第20屆.json」中指定編號的法規，
 * 覆蓋寫回 DB（Law 欄位 + 條文全換 + 沿革全換），**不動其他 37 部**。
 *
 * 為何不用 db:seed：seed 是全庫 wipe＋reload，會連帶重生所有 Article.id 並清掉
 * 已建好的 tsv/embedding。單部修法（如 1.10 115.05.18 修正）只需替換該部，
 * 保留其餘各部的 id/embedding/交互參照，風險最小；改完再跑 db:verify 全庫逐字把關。
 *
 * 資料保真紅線（CLAUDE.md）：只做欄位映射，不改寫任何法條文字；缺漏一律報錯停手。
 * 保留 Law.id 不變 → 掛在該 Law 上的 ScheduleRule 不受影響（本專案目前為 0 筆）。
 * Article 為全換（deleteMany + create）；新條文的 tsv/embedding 需事後補建：
 *   npm run search:index   （tsv，必要，公開查詢用）
 *   npm run search:embed   （embedding，可選；語意層目前自部署切離，不影響執行時）
 *
 * 用法：npm run db:update-law -- 1.10       （或 tsx data/update-law.ts 1.10）
 */
import { PrismaClient } from "@prisma/client";
import { articleBody, loadLaws, sessionFromLabel } from "./shared";

const prisma = new PrismaClient();

async function main() {
  const number = process.argv[2];
  if (!number) throw new Error("用法：tsx data/update-law.ts <編號>，例：1.10");

  const law = loadLaws().find((l) => l.number === number);
  if (!law) throw new Error(`JSON 內找不到編號 ${number} 的法規`);

  // 與 seed.ts 相同的內部一致性把關
  if (law.articles.length !== law.article_count) {
    throw new Error(
      `JSON 內部不一致：${law.number}《${law.name}》articles=${law.articles.length} 但 article_count=${law.article_count}`
    );
  }
  for (const h of law.amendment_history) {
    if (!h.date) {
      throw new Error(`沿革缺日期：${law.number}《${law.name}》（roc=${h.roc}）— 停手待人工確認`);
    }
  }

  const session = sessionFromLabel(law.session_label);
  const existing = await prisma.law.findUnique({
    where: { session_number: { session, number } },
    include: { articles: { select: { number: true } } },
  });

  const data = {
    category: law.category,
    name: law.name,
    isCurrent: true,
    currentDate: law.current_date ? new Date(law.current_date) : null,
    currentType: law.current_type,
    preamble: law.preamble || null,
    sourceFile: law.file,
    chapters: law.chapters.length ? law.chapters : undefined,
    articles: {
      create: law.articles.map((a) => ({
        number: a.number,
        name: a.name || null,
        chapter: a.chapter,
        body: articleBody(a.items),
        items: a.items,
        version: session,
      })),
    },
    amendments: {
      create: law.amendment_history.map((h) => ({
        date: new Date(h.date as string),
        roc: h.roc,
        sessionTerm: h.session_term,
        action: h.action,
        text: h.text,
      })),
    },
  };

  if (existing) {
    console.log(
      `更新既有：${law.number}《${law.name}》 DB 現有 ${existing.articles.length} 條 → JSON ${law.articles.length} 條`
    );
    // 保留 Law.id；先清掉舊條文與舊沿革，再建新的（Prisma 巢狀寫入為單一交易）
    await prisma.law.update({
      where: { id: existing.id },
      data: {
        ...data,
        articles: { deleteMany: {}, create: data.articles.create },
        amendments: { deleteMany: {}, create: data.amendments.create },
      },
    });
  } else {
    console.log(`DB 尚無 ${law.number}，改為新建。`);
    await prisma.law.create({ data: { number: law.number, session, ...data } });
  }

  const after = await prisma.law.findUnique({
    where: { session_number: { session, number } },
    include: { articles: { select: { number: true } }, amendments: { select: { roc: true } } },
  });
  console.log(
    `完成：${number} DB 條數=${after?.articles.length}、沿革=${after?.amendments.length}、現行日期=${after?.currentDate
      ?.toISOString()
      .slice(0, 10)}、sourceFile=${after?.sourceFile}`
  );
  console.log("請接著跑：npm run search:index（tsv）、npm run refs:build（參照）、npm run db:verify（全庫逐字把關）。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
