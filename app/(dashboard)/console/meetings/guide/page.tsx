import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${copy.meetings.vote.guide.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const g = copy.meetings.vote.guide;

/** 線上表決操作說明（祕書處用）。內容在 lib/copy.ts，改流程時一併改這裡。 */
export default async function VoteGuidePage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {copy.meetings.title}
      </a>
      <h1 className="mt-4 font-serif text-h2">{g.title}</h1>
      <p className="mt-2 font-sans text-body text-lede-ink">{g.lede}</p>

      {g.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-serif text-h4 text-ink">{s.heading}</h2>
          <ol className="mt-3 flex flex-col gap-2.5">
            {s.steps.map((t, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-x-2 font-sans text-body leading-relaxed text-ink">
                <span className="tnum font-ui text-caption leading-[inherit] text-accent">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className="mt-10 border-t border-line-soft pt-4 font-sans text-caption text-meta">{g.adminNote}</p>
    </main>
  );
}
