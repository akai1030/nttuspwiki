import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { categorySlug, formatCE } from "@/lib/format";
import { getLawIndex, type LawIndexItem } from "@/lib/queries";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SearchBox } from "@/components/SearchBox";
import { CategoryRow } from "@/components/Tag";
import { LawRow } from "@/components/LawRow";

export const metadata: Metadata = {
  title: `${copy.indexPage.title}｜${copy.home.org}${copy.home.sys}`,
  description: copy.indexPage.lede,
};

/** 索引列 meta：`31 條 · 修正 2024·09·19 · 引用 6 處`（皆真實 DB 值）。 */
function lawMeta(l: LawIndexItem): string {
  const parts: string[] = [`${l.articleCount} ${copy.indexPage.articlesSuffix}`];
  if (l.currentDate) parts.push(`${l.currentType ?? "修正"} ${formatCE(l.currentDate)}`);
  if (l.isMother) parts.push(copy.indexPage.mother);
  else if (l.outgoingRefs > 0) parts.push(`${l.outgoingRefs} ${copy.indexPage.citesSuffix}`);
  return parts.join(" · ");
}

export default async function LawIndexPage() {
  const groups = await getLawIndex();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <header className="mb-10 border-b-2 border-ink pb-8">
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
            {copy.indexPage.en}
          </div>
          <h1 className="mt-3 font-serif text-h2">{copy.indexPage.title}</h1>
          <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">{copy.indexPage.lede}</p>
        </header>

        <div className="mb-14 max-w-reader">
          <SearchBox />
        </div>

        {groups.map((g) => {
          const slug = categorySlug(g.en);
          return (
            <section key={g.category} id={slug} aria-labelledby={`${slug}-h`} className="mb-14 scroll-mt-[70px]">
              <h2 id={`${slug}-h`} className="sr-only">
                {g.category}
              </h2>
              <div className="mb-2">
                <CategoryRow category={g.category} count={g.count} />
              </div>
              <div>
                {g.laws.map((l) => (
                  <LawRow
                    key={l.number}
                    number={l.number}
                    name={l.name}
                    meta={lawMeta(l)}
                    href={`/law/${l.number}`}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <SiteFooter />
    </>
  );
}
