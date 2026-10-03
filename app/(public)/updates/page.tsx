import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { formatCE } from "@/lib/format";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const u = copy.updates;

export const metadata: Metadata = {
  title: `${u.title}｜${copy.home.org}${copy.home.sys}`,
  description: u.lede,
};

/**
 * /updates 更新紀錄：這個網站每次上線改了什麼。條目在 lib/copy.ts 的 updates.entries，新的在最上面。
 * 純靜態（不連 DB）。版面照 /meetings/about。
 */
export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <header className="border-b-2 border-ink pb-6">
          <h1 className="font-serif text-h2">{u.title}</h1>
          <p className="mt-4 font-sans text-lede text-lede-ink">{u.lede}</p>
        </header>

        <div className="mt-10 space-y-8">
          {u.entries.map((e) => (
            <section key={e.date}>
              <h2 className="font-mono text-h4 tnum">
                <time dateTime={e.date}>{formatCE(new Date(`${e.date}T00:00:00Z`))}</time>
              </h2>
              <ul className="mt-3 space-y-2">
                {e.items.map((item, i) => (
                  <li key={i} className="flex gap-2 font-sans text-body text-ink">
                    <span className="select-none text-accent">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
