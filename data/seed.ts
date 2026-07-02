/**
 * Phase 0-3 種子腳本：法規MD轉檔/法規結構化-第20屆.json → Law / Article / AmendmentHistory
 * 資料保真紅線（CLAUDE.md）：只做欄位映射，不改寫任何法條文字；缺漏一律報錯停手，不自行補值。
 * 用法：npm run db:seed（需 .env 的 DATABASE_URL）
 */
import { PrismaClient } from "@prisma/client";
import { articleBody, loadLaws, sessionFromLabel } from "./shared";

const prisma = new PrismaClient();

async function main() {
  const laws = loadLaws();
  console.log(`讀入 ${laws.length} 部法規`);

  // 冪等：依 FK 依賴順序清空法規結構相關表後重灌
  await prisma.$transaction([
    prisma.reminder.deleteMany(),
    prisma.scheduleEvent.deleteMany(),
    prisma.scheduleRule.deleteMany(),
    prisma.lawReference.deleteMany(),
    prisma.amendmentHistory.deleteMany(),
    prisma.article.deleteMany(),
    prisma.law.deleteMany(),
  ]);

  let lawCount = 0;
  let articleCount = 0;
  let amendmentCount = 0;

  for (const law of laws) {
    const session = sessionFromLabel(law.session_label);

    for (const h of law.amendment_history) {
      if (!h.date) {
        throw new Error(
          `沿革缺日期：${law.number}《${law.name}》（roc=${h.roc}）— 停手待人工確認`
        );
      }
    }
    if (law.articles.length !== law.article_count) {
      throw new Error(
        `JSON 內部不一致：${law.number}《${law.name}》articles=${law.articles.length} 但 article_count=${law.article_count}`
      );
    }

    await prisma.law.create({
      data: {
        category: law.category,
        number: law.number,
        name: law.name,
        session,
        isCurrent: true,
        currentDate: law.current_date ? new Date(law.current_date) : null,
        currentType: law.current_type,
        preamble: law.preamble || null,
        sourceFile: law.file,
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
      },
    });

    lawCount += 1;
    articleCount += law.articles.length;
    amendmentCount += law.amendment_history.length;
  }

  const dbLaws = await prisma.law.count();
  const dbArticles = await prisma.article.count();
  const dbAmendments = await prisma.amendmentHistory.count();

  console.log(
    `灌入完成：Law ${dbLaws} / Article ${dbArticles} / AmendmentHistory ${dbAmendments}`
  );

  if (dbLaws !== lawCount || dbArticles !== articleCount || dbAmendments !== amendmentCount) {
    throw new Error(
      `計數不符：DB ${dbLaws}/${dbArticles}/${dbAmendments}，來源 ${lawCount}/${articleCount}/${amendmentCount}`
    );
  }
  console.log("計數一致。請接著跑 npm run db:verify 做逐字比對。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
