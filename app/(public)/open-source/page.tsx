import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const o = copy.openSource;

export const metadata: Metadata = {
  title: `${o.title}｜${copy.home.org}${copy.home.sys}`,
  description: o.lede,
};

const h2 = "font-serif text-h4";

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 font-sans text-body text-ink">
          <span className="select-none text-accent">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * /open-source：給其他學校議會看的系統說明（功能、會議五步、架設需求、需替換的項目、授權）。
 * 純靜態（不連 DB）。內容在 lib/copy.ts 的 openSource，跟 README.md 一致。版面照 /updates。
 */
export default function OpenSourcePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <header className="border-b-2 border-ink pb-6">
          <h1 className="font-serif text-h2">{o.title}</h1>
          <p className="mt-4 font-sans text-lede text-lede-ink">{o.lede}</p>
          <p className="mt-4 font-sans text-body">
            <span className="text-meta">{o.repoLabel}　</span>
            <a href={o.repoUrl} className="break-all text-accent hover:underline" rel="noreferrer">
              {o.repoUrl.replace("https://", "")}
            </a>
          </p>
        </header>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className={h2}>{o.features.h}</h2>
            <Bullets items={o.features.items} />
          </section>

          <section>
            <h2 className={h2}>{o.steps.h}</h2>
            <Bullets items={o.steps.items} />
          </section>

          <section>
            <h2 className={h2}>{o.needs.h}</h2>
            <Bullets items={o.needs.items} />
          </section>

          <section>
            <h2 className={h2}>{o.replace.h}</h2>
            <dl className="mt-3 divide-y divide-line-soft border-y border-line-soft">
              {o.replace.rows.map(([item, where, note]) => (
                <div key={item} className="grid gap-x-4 gap-y-1 py-3 hero:grid-cols-[8rem_minmax(0,1fr)]">
                  <dt className="font-sans text-body font-medium text-ink">{item}</dt>
                  <dd className="min-w-0">
                    <code className="break-all font-mono text-caption text-accent">{where}</code>
                    <p className="mt-0.5 font-sans text-body text-ink">{note}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className={h2}>{o.license.h}</h2>
            <Bullets items={o.license.items} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
