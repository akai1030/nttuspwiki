/**
 * 公開頁的 DB 讀取層（Server Components 專用）。所有法規查詢集中在此，
 * 頁面只呼叫這些函式、不直接寫 Prisma——好維護、好驗資料保真。
 * 全程零 token、公開唯讀（查詢不呼叫任何付費服務）。
 */
import { prisma } from "./db";
import { CATEGORY_ORDER, categoryConfig, type CategoryKey } from "./categories";
import { compareNumbering, chapterPrefix, clip, shortLawName } from "./format";

/* ── 首頁統計（數字一律由 DB 帶入，不硬編）─────────────────── */

export interface Stats {
  laws: number;
  articles: number;
  session: number;
}

export async function getStats(): Promise<Stats> {
  // 公開頁只呈現現行屆（isCurrent）。schema 支援跨屆，防未來灌入他屆時混入。
  const [laws, articles, latest] = await Promise.all([
    prisma.law.count({ where: { isCurrent: true } }),
    prisma.article.count({ where: { law: { isCurrent: true } } }),
    prisma.law.findFirst({ where: { isCurrent: true }, select: { session: true }, orderBy: { session: "desc" } }),
  ]);
  return { laws, articles, session: latest?.session ?? 20 };
}

/* ── 五類部數摘要（首頁總覽 preview）───────────────────────── */

export interface CategorySummary {
  category: CategoryKey;
  en: string;
  count: number;
}

export async function getCategorySummary(): Promise<CategorySummary[]> {
  const grouped = await prisma.law.groupBy({ by: ["category"], where: { isCurrent: true }, _count: { _all: true } });
  const countByCat = new Map(grouped.map((g) => [g.category, g._count._all]));
  return CATEGORY_ORDER.map((category) => ({
    category,
    en: categoryConfig(category).en,
    count: countByCat.get(category) ?? 0,
  }));
}

/* ── /law 全索引（五類分組）─────────────────────────────────── */

export interface LawIndexItem {
  number: string;
  name: string;
  category: string;
  articleCount: number;
  currentDate: Date | null;
  currentType: string | null;
  outgoingRefs: number;
  isMother: boolean;
}

export interface CategoryGroup {
  category: CategoryKey;
  en: string;
  count: number;
  laws: LawIndexItem[];
}

export async function getLawIndex(): Promise<CategoryGroup[]> {
  const [laws, refGroups] = await Promise.all([
    prisma.law.findMany({
      where: { isCurrent: true },
      select: {
        number: true,
        name: true,
        category: true,
        currentDate: true,
        currentType: true,
        _count: { select: { articles: true } },
      },
    }),
    prisma.lawReference.groupBy({ by: ["fromLawId"], _count: { _all: true } }),
  ]);
  // 參照數要對回 law → 需 law.id；上面沒選 id，改用第二次輕查詢建 id→number 對照（僅現行屆）。
  const ids = await prisma.law.findMany({ where: { isCurrent: true }, select: { id: true, number: true } });
  const numberById = new Map(ids.map((l) => [l.id, l.number]));
  const refsByNumber = new Map<string, number>();
  for (const g of refGroups) {
    const num = numberById.get(g.fromLawId);
    if (num) refsByNumber.set(num, g._count._all);
  }

  const items: LawIndexItem[] = laws.map((l) => ({
    number: l.number,
    name: l.name,
    category: l.category,
    articleCount: l._count.articles,
    currentDate: l.currentDate,
    currentType: l.currentType,
    outgoingRefs: refsByNumber.get(l.number) ?? 0,
    isMother: l.number === "0.0",
  }));

  return CATEGORY_ORDER.map((category) => {
    const group = items
      .filter((it) => it.category === category)
      .sort((a, b) => compareNumbering(a.number, b.number));
    return { category, en: categoryConfig(category).en, count: group.length, laws: group };
  }).filter((g) => g.count > 0);
}

/** 全部法規號（供 /law/[number] 的 generateStaticParams 靜態生成）。 */
export async function getAllLawNumbers(): Promise<string[]> {
  const laws = await prisma.law.findMany({ where: { isCurrent: true }, select: { number: true } });
  return laws.map((l) => l.number);
}

/* ── /law/[number] 閱讀器完整資料 ─────────────────────────── */

export interface ArticleRef {
  raw: string; // 原文片段（用來在內文定位、包成連結）
  toLawName: string;
  toLawNumber: string | null; // 解析到語料內才有
  toArticleNo: string | null;
  kind: string; // cite / 準用 / 牴觸 / 另訂
  href: string | null; // 可跳轉才有（語料外 = null）
  preview: { title: string; body: string } | null; // 被引條文節錄（真實 DB 內容）
}

export interface ReaderArticle {
  number: string;
  name: string | null;
  chapter: string | null; // 「第一章」前綴
  items: string[]; // 逐款原文（不改寫）
  refs: ArticleRef[]; // 此條的對外參照（真實 LawReference）
}

export interface ReaderData {
  number: string;
  name: string;
  category: string;
  currentDate: Date | null;
  currentType: string | null;
  session: number;
  preamble: string | null;
  chapters: { title: string }[];
  articles: ReaderArticle[];
  amendments: { roc: string; text: string }[]; // 由新到舊
  articleCount: number;
}

export async function getReaderData(number: string): Promise<ReaderData | null> {
  const law = await prisma.law.findFirst({
    where: { number, isCurrent: true },
    select: {
      id: true,
      number: true,
      name: true,
      category: true,
      currentDate: true,
      currentType: true,
      session: true,
      preamble: true,
      chapters: true,
      articles: { select: { number: true, name: true, chapter: true, items: true } },
      amendments: { select: { roc: true, text: true, date: true }, orderBy: { date: "desc" } },
    },
  });
  if (!law) return null;

  // 此法的所有對外參照。
  const refs = await prisma.lawReference.findMany({
    where: { fromLawId: law.id },
    select: {
      fromArticleNo: true,
      toLawName: true,
      toLawId: true,
      toArticleNo: true,
      kind: true,
      raw: true,
    },
  });

  // 解析被引法規的 number（建跳轉連結）。
  const toLawIds = [...new Set(refs.map((r) => r.toLawId).filter((x): x is string => !!x))];
  const toLaws = toLawIds.length
    ? await prisma.law.findMany({ where: { id: { in: toLawIds } }, select: { id: true, number: true, name: true } })
    : [];
  const lawInfoById = new Map(toLaws.map((l) => [l.id, l]));

  // 被引條文節錄（預覽卡）：抓 (toLawId, toArticleNo) 對應的真實條文 body。
  const previewTargets = refs.filter((r) => r.toLawId && r.toArticleNo);
  const previewArticles = previewTargets.length
    ? await prisma.article.findMany({
        where: {
          OR: previewTargets.map((r) => ({ lawId: r.toLawId!, number: r.toArticleNo! })),
        },
        select: { lawId: true, number: true, name: true, body: true },
      })
    : [];
  const previewByKey = new Map(previewArticles.map((a) => [`${a.lawId}:${a.number}`, a]));

  // 短名（去機構前綴）供預覽卡標題；沿用 categories 的顯示邏輯即可，這裡簡單取被引法名。
  const refsByArticle = new Map<string, ArticleRef[]>();
  for (const r of refs) {
    const info = r.toLawId ? lawInfoById.get(r.toLawId) : null;
    const toLawNumber = info?.number ?? null;
    // 被引條文是否真的存在於 DB（用來守門錨點與預覽卡，避免死錨/假節錄）。
    const target =
      r.toLawId && r.toArticleNo ? previewByKey.get(`${r.toLawId}:${r.toArticleNo}`) : undefined;

    let href: string | null = null;
    if (toLawNumber) {
      // 僅在該條確實存在時才附 #art-N 錨點，否則退回法規層（呼應 CLAUDE.md：引用條號須驗證存在於 DB）。
      href = target ? `/law/${toLawNumber}#art-${r.toArticleNo}` : `/law/${toLawNumber}`;
    }

    let preview: ArticleRef["preview"] = null;
    if (target) {
      const shortName = info ? shortLawName(info.name) : r.toLawName;
      preview = {
        title: `${shortName} · 第 ${r.toArticleNo} 條${target.name ? `（${target.name}）` : ""}`,
        body: clip(target.body, 62),
      };
    }
    const ref: ArticleRef = {
      raw: r.raw,
      toLawName: r.toLawName,
      toLawNumber,
      toArticleNo: r.toArticleNo,
      kind: r.kind,
      href,
      preview,
    };
    const key = r.fromArticleNo ?? "";
    if (!refsByArticle.has(key)) refsByArticle.set(key, []);
    refsByArticle.get(key)!.push(ref);
  }

  const articles: ReaderArticle[] = law.articles
    .map((a) => ({
      number: a.number,
      name: a.name && a.name.trim() ? a.name : null,
      chapter: a.chapter,
      items: Array.isArray(a.items) ? (a.items as string[]) : [],
      refs: refsByArticle.get(a.number) ?? [],
    }))
    .sort((a, b) => compareNumbering(a.number, b.number));

  return {
    number: law.number,
    name: law.name,
    category: law.category,
    currentDate: law.currentDate,
    currentType: law.currentType,
    session: law.session,
    preamble: law.preamble && law.preamble.trim() ? law.preamble : null,
    chapters: Array.isArray(law.chapters) ? (law.chapters as { title: string }[]) : [],
    articles,
    amendments: law.amendments.map((am) => ({ roc: am.roc, text: am.text })),
    articleCount: law.articles.length,
  };
}

export { chapterPrefix };
