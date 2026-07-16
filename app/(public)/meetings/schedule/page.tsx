import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { scheduleGroups, scheduleCount, type StatutoryItem } from "@/lib/meetings/statutory";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: `${copy.publicMeetings.schedule.title}｜${copy.home.org}${copy.home.sys}`,
  description: copy.publicMeetings.schedule.lede,
};

const c = copy.publicMeetings.schedule;

const TYPE_TAG: Record<StatutoryItem["type"], { label: string; cls: string }> = {
  RECURRING: { label: "週期", cls: "border-sch-line text-sch" },
  ABSOLUTE: { label: "固定日", cls: "border-accent-soft text-accent" },
  RELATIVE: { label: "相對", cls: "border-ref-border text-ref-ink" },
};

function Item({ x }: { x: StatutoryItem }) {
  const tag = TYPE_TAG[x.type];
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`shrink-0 border px-1.5 py-0.5 font-ui text-chip leading-none ${tag.cls}`}>{tag.label}</span>
        <span className="font-sans text-body font-medium text-ink">{x.summary}</span>
        <span className="font-sans text-caption text-meta">· {x.subject}</span>
      </div>
      <p className="mt-1 font-sans text-caption leading-relaxed text-lede-ink">{x.quote}</p>
      <a
        href={`/law/${x.lawNumber}#art-${x.article}`}
        className="mt-1 inline-block font-ui text-chip text-accent hover:underline"
      >
        {c.source}：{x.lawName} §{x.article}
        {x.articleName ? `（${x.articleName}）` : ""} ↗
      </a>
    </li>
  );
}

export default function StatutorySchedulePage() {
  const groups = scheduleGroups();
  const total = scheduleCount();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <a href="/meetings" className="font-sans text-caption text-accent hover:underline">
          {c.back}
        </a>

        <header className="mt-4 border-b-2 border-ink pb-6">
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">Statutory Schedule</div>
          <h1 className="mt-3 font-serif text-h2">{c.title}</h1>
          <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">{c.lede}</p>
          <p className="mt-2 font-sans text-caption text-meta">{c.count(total)}</p>
        </header>

        {/* 分類跳轉 */}
        <nav aria-label="分類" className="mt-6 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a
              key={g.key}
              href={`#cat-${g.key}`}
              className="border border-line-soft px-3 py-1.5 font-ui text-caption text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {g.title}
              <span className="ml-1.5 text-meta">{g.items.length}</span>
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {groups.map((g) => (
            <section key={g.key} id={`cat-${g.key}`} className="scroll-mt-20">
              <div className="mb-3 flex items-end gap-3 border-b border-line pb-2">
                <span className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">{g.en}</span>
                <h2 className="font-serif text-h4">{g.title}</h2>
                <span className="ml-auto font-sans text-caption text-meta">{g.items.length}</span>
              </div>
              <ul className="divide-y divide-line-soft">
                {g.items.map((x, i) => (
                  <Item key={`${x.lawNumber}-${x.article}-${i}`} x={x} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line-soft pt-4 font-sans text-caption text-meta">{c.disclaimer}</p>
      </main>
      <SiteFooter />
    </>
  );
}
