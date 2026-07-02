import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { categoryConfig } from "@/lib/categories";
import { categorySlug, formatROC, chapterPrefix, shortLawName } from "@/lib/format";
import {
  getReaderData,
  type ReaderData,
  type ReaderArticle,
  type ArticleRef,
} from "@/lib/queries";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleBlock, Xref, type ArticleNote } from "@/components/ArticleBlock";
import { AmendmentTimeline } from "@/components/AmendmentTimeline";
import { CopyCite } from "@/components/CopyCite";
import { Chip } from "@/components/Tag";

// request 時渲染：建置期不連 DB（DATABASE_URL 於部署 runtime 才可用，避免 SSG 在 build 期連不到 DB 使整個 build 失敗）。
// 同一 request 內 metadata 與 page 共用查詢（cache 去重）。
export const dynamic = "force-dynamic";

const loadReader = cache(getReaderData);

export async function generateMetadata({
  params,
}: {
  params: { number: string };
}): Promise<Metadata> {
  const data = await loadReader(params.number);
  if (!data) return { title: `找不到法規｜${copy.home.org}${copy.home.sys}` };
  return {
    title: `${data.name}｜${copy.home.org}${copy.home.sys}`,
    description: `${data.name}（${data.number}）全文——共 ${data.articleCount} 條，第 ${data.session} 屆現行版，逐條可溯源、可跳轉參照。`,
  };
}

/* ── 顯示輔助 ─────────────────────────────────────────────── */

interface ChapterGroup {
  prefix: string | null;
  title: string | null;
  articles: ReaderArticle[];
}

/** 依 article.chapter 前綴分章（走條文原順，無章節法規自然成單一無標題群）。 */
function groupByChapter(data: ReaderData): ChapterGroup[] {
  const titleByPrefix = new Map(data.chapters.map((ch) => [chapterPrefix(ch.title), ch.title]));
  const groups: ChapterGroup[] = [];
  let cur: ChapterGroup | null = null;
  for (const a of data.articles) {
    // article.chapter 與 chapters[].title 都正規化到「第X章」章號再比對（章名可能夾空白）。
    const prefix = a.chapter ? chapterPrefix(a.chapter) : null;
    if (!cur || cur.prefix !== prefix) {
      cur = {
        prefix,
        title: prefix ? titleByPrefix.get(prefix) ?? prefix : null,
        articles: [],
      };
      groups.push(cur);
    }
    cur.articles.push(a);
  }
  return groups;
}

/** 把款項字串中「已解析到語料內」的參照原文包成可跳轉連結；逐字保留、只包已命中片段。 */
function linkify(text: string, refs: ArticleRef[]): ReactNode {
  const marks: { start: number; end: number; ref: ArticleRef }[] = [];
  for (const ref of refs) {
    if (!ref.href || !ref.raw) continue; // 只連可解析者；語料外留純文字（仍列於邊註）
    const idx = text.indexOf(ref.raw);
    if (idx >= 0) marks.push({ start: idx, end: idx + ref.raw.length, ref });
  }
  if (marks.length === 0) return text;
  marks.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const m of marks) {
    if (m.start < cursor) continue; // 重疊時保留較前者
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(
      <Xref key={key++} href={m.ref.href!}>
        {text.slice(m.start, m.end)}
      </Xref>
    );
    cursor = m.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** 參照 → 右側邊註（label 標明 cite/準用/牴觸/另訂；preview 為被引條文真實節錄）。 */
function refToNote(ref: ArticleRef): ArticleNote {
  const label = ref.kind === "cite" ? copy.note.ref : `${copy.note.ref}・${ref.kind}`;
  const name = shortLawName(ref.toLawName);
  const artText = ref.toArticleNo ? ` 第${ref.toArticleNo}條` : "";
  return {
    kind: "ref",
    label,
    text: ref.href ? (
      <a href={ref.href} className="text-accent underline-offset-2 hover:underline">
        《{name}》{artText}
      </a>
    ) : (
      <span>
        《{name}》{artText}
      </span>
    ),
    preview: ref.preview ?? undefined,
  };
}

/* ── 頁面 ─────────────────────────────────────────────────── */

export default async function ReaderPage({ params }: { params: { number: string } }) {
  const data = await loadReader(params.number);
  if (!data) notFound();

  const cfg = categoryConfig(data.category);
  const chapters = groupByChapter(data);
  const latestRoc = data.amendments[0]?.roc ?? (data.currentDate ? formatROC(data.currentDate) : null);

  const breadcrumb = (
    <>
      <a href="/law" className="hover:text-accent">
        {copy.readerPage.breadcrumbRoot}
      </a>
      <span aria-hidden="true" className="mx-1.5 text-meta opacity-60">›</span>
      <a href={`/law#${categorySlug(cfg.en)}`} className="hover:text-accent">
        {data.category}
      </a>
      <span aria-hidden="true" className="mx-1.5 text-meta opacity-60">›</span>
      <span aria-current="page" className="text-accent">{data.name}</span>
    </>
  );

  return (
    <>
      <SiteHeader breadcrumb={breadcrumb} />

      <div className="mx-auto grid max-w-wrap-reader grid-cols-1 rd:grid-cols-[236px_minmax(0,1fr)]">
        {/* 左：章條目錄（sticky；手機隱藏） */}
        <aside
          aria-label={copy.readerPage.tocTitle}
          className="hidden border-r border-line px-[22px] pb-16 pt-10 rd:sticky rd:top-[52px] rd:block rd:h-[calc(100vh-52px)] rd:overflow-auto"
        >
          <div className="mb-1 font-serif text-[17px] font-bold leading-snug">{data.name}</div>
          <div className="mb-6 font-sans text-caption text-meta tnum">
            {data.number} · {copy.reader.articleCount(data.articleCount)} · 第{data.session}屆
          </div>
          {chapters.map((g, gi) => (
            <div key={gi}>
              {g.title && (
                <div className="mb-2 mt-5 font-sans text-caption font-bold tracking-tag text-meta">
                  {g.title.replace(/\s+/g, " ")}
                </div>
              )}
              {g.articles.map((a) => (
                <a
                  key={a.number}
                  href={`#art-${a.number}`}
                  className="flex gap-2 rounded-sm px-2 py-1.5 text-[13.5px] text-ink hover:bg-paper2"
                >
                  <span className="min-w-[32px] font-mono text-[11px] text-meta tnum">§{a.number}</span>
                  <span className="min-w-0">{a.name ?? ""}</span>
                </a>
              ))}
            </div>
          ))}
        </aside>

        {/* 右：主閱讀區（頁面主地標） */}
        <main className="min-w-0 px-wrap-sm py-12 rd:px-12 rd:py-14">
          <div className="mx-auto max-w-[900px]">
            <a href="/law" className="mb-6 inline-block font-sans text-caption text-meta hover:text-accent rd:hidden">
              {copy.readerPage.backToIndex}
            </a>

            <div className="font-ui text-caption font-medium text-accent tnum">
              {data.category} · {data.number}
            </div>
            <h1 className="mb-2 mt-3 font-serif text-law-title">{data.name}</h1>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b-2 border-ink pb-3.5">
              <span className="font-sans text-caption text-meta tnum">
                {copy.reader.articleCount(data.articleCount)}
              </span>
              <Chip active>第{data.session}屆 現行</Chip>
              {latestRoc && (
                <span className="font-sans text-caption text-meta tnum">
                  · {copy.reader.lastAmended(latestRoc)}
                </span>
              )}
            </div>

            {data.amendments.length > 0 && (
              <AmendmentTimeline amendments={data.amendments} count={data.amendments.length} />
            )}

            {data.preamble && (
              <div className="my-6 border-l-2 border-l-accent bg-paper2 px-5 py-4">
                <div className="mb-1.5 font-sans text-note-label text-accent">
                  {copy.readerPage.preambleLabel}
                </div>
                <p className="font-serif text-art-body text-body-ink">{data.preamble}</p>
              </div>
            )}

            <div className="mt-8">
              {chapters.map((g, gi) => (
                <div key={gi}>
                  {g.title && (
                    <div className="mb-5 mt-11 border-t border-line pt-3.5 text-center font-serif text-chap tracking-chap text-accent">
                      {g.title.replace(/\s+/g, " ")}
                    </div>
                  )}
                  {g.articles.map((a) => (
                    <ArticleBlock
                      key={a.number}
                      number={a.number}
                      name={a.name ?? undefined}
                      items={a.items.map((it) => linkify(it, a.refs))}
                      notes={a.refs.length > 0 ? a.refs.map(refToNote) : undefined}
                      action={<CopyCite cite={`《${data.name}》第${a.number}條`} />}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </>
  );
}
