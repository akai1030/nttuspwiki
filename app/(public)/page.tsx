import { copy } from "@/lib/copy";
import { categorySlug } from "@/lib/format";
import { getStats, getCategorySummary } from "@/lib/queries";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SideRail } from "@/components/SideRail";
import { SectionHead } from "@/components/SectionHead";
import { SearchBox } from "@/components/SearchBox";
import { CategoryRow } from "@/components/Tag";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

// 首頁統計由 DB 帶入（不硬編）。資料靜態 → 建置期預算染，公開唯讀、零 token。
export default async function Home() {
  const [stats, categories] = await Promise.all([getStats(), getCategorySummary()]);
  const c = copy.landing;

  return (
    <>
      <SideRail />
      <SiteHeader />

      <main>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative flex min-h-[88vh] flex-col justify-center overflow-hidden border-b border-line"
        >
          {/* 大「法」浮水印（--glyph = --ink @4.5%） */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-[-3%] top-1/2 z-0 -translate-y-1/2 select-none font-serif font-black leading-[.7] text-glyph text-[min(56vw,760px)]"
          >
            法
          </span>

          <div className="relative z-[2] mx-auto w-full max-w-wrap px-wrap-sm hero:px-wrap">
            <div className="mb-5 font-ui text-[12.5px] font-medium uppercase tracking-kicker text-accent">
              {copy.home.kicker}
            </div>
            <h1 className="font-serif">
              <span className="block text-hero-org">{copy.home.org}</span>
              <span className="mt-1 block text-hero-sys text-ink">{copy.home.sys}</span>
              <span className="mt-3 block font-ui text-hero-en uppercase stroke-text">
                {copy.home.en}
              </span>
            </h1>
            <p className="mt-5 font-serif text-h4 text-lede-ink">{copy.home.subtitle}</p>
            <p className="mt-6 max-w-[520px] font-sans text-lede text-lede-ink">{copy.home.lede}</p>

            <dl className="mt-11 flex flex-wrap gap-x-10 gap-y-6">
              <div>
                <dt className="font-ui text-bignum text-ink tnum">
                  <span className="text-accent">{stats.laws}</span>
                </dt>
                <dd className="mt-1 font-sans text-caption text-meta">{copy.home.stats.laws}</dd>
              </div>
              <div>
                <dt className="font-ui text-bignum text-ink tnum">
                  <span className="text-accent">{stats.articles}</span>
                </dt>
                <dd className="mt-1 font-sans text-caption text-meta">{copy.home.stats.articles}</dd>
              </div>
              <div>
                <dt className="font-ui text-bignum text-ink tnum">
                  第<span className="text-accent">{stats.session}</span>屆
                </dt>
                <dd className="mt-1 font-sans text-caption text-meta">{copy.home.stats.current}</dd>
              </div>
            </dl>
          </div>

          {/* 純視覺捲動提示：拉丁用 mono、中文用 sans(≥12.5px)；對輔助技術隱藏。 */}
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-wrap-sm z-[2] flex items-center gap-2 text-meta hero:left-wrap"
          >
            <span className="font-mono text-[11px] uppercase tracking-wide">{copy.home.scrollcue.latin}</span>
            <span className="font-sans text-caption">{copy.home.scrollcue.zh}</span>
          </div>
        </section>

        {/* ── 01 · 法規總覽 preview ─────────────────────────── */}
        <section id="index" className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
          <SectionHead no={c.sections.index.no} title={c.sections.index.title} en={c.sections.index.en} />
          <p className="mb-10 max-w-reader font-sans text-lede text-lede-ink">{c.sections.index.lede}</p>

          <div className="space-y-3">
            {categories.map((cat) => (
              <a
                key={cat.category}
                href={`/law#${categorySlug(cat.en)}`}
                className="-mx-2.5 block px-2.5 py-2 transition-colors hover:bg-paper2"
              >
                <CategoryRow category={cat.category} count={cat.count} />
              </a>
            ))}
          </div>

          <div className="mt-10">
            <Button variant="ink" href="/law">
              {c.browseAll} →
            </Button>
          </div>
        </section>

        {/* ── 02 · 全文檢索 ─────────────────────────────────── */}
        <section id="search" className="bg-paper2">
          <div className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
            <SectionHead no={c.sections.search.no} title={c.sections.search.title} en={c.sections.search.en} />
            <p className="mb-8 max-w-reader font-sans text-lede text-lede-ink">{c.sections.search.lede}</p>
            <div className="max-w-reader">
              <SearchBox />
            </div>
          </div>
        </section>

        {/* ── 03 · 檢核與時程 teaser（尚未開放，只述用途，不輸出判定）─── */}
        <section id="tools" className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
          <SectionHead no={c.sections.tools.no} title={c.sections.tools.title} en={c.sections.tools.en} />
          <p className="mb-10 max-w-reader font-sans text-lede text-lede-ink">{c.sections.tools.lede}</p>

          <div className="grid grid-cols-1 gap-6 rd:grid-cols-2">
            <Card label={copy.toolsTeaser.comingSoon} title={copy.toolsTeaser.check.title}>
              <p className="font-sans text-body leading-relaxed text-lede-ink">{copy.toolsTeaser.check.body}</p>
              <p className="mt-4 font-sans text-caption leading-relaxed text-meta">{copy.disclaimer}</p>
            </Card>
            <Card label={copy.toolsTeaser.comingSoon} title={copy.toolsTeaser.schedule.title}>
              <p className="font-sans text-body leading-relaxed text-lede-ink">{copy.toolsTeaser.schedule.body}</p>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
