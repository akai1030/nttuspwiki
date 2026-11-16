import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${copy.meetings.vote.guide.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const g = copy.meetings.vote.guide;

const h2 = "font-serif text-h4 text-ink";
const anchor = "scroll-mt-24";

/**
 * 後台使用說明（祕書處、議長用）。內容在 lib/copy.ts 的 meetings.vote.guide。
 * 章節順序跟會議頁的五步一致；各步驟頁的「使用說明」連結用 #info、#notice、#agenda、#live、#after 跳到對應段落。
 */
export default async function GuidePage() {
  await requireUser();
  const extra = [
    { id: "trouble", heading: g.troubleTitle },
    { id: "link", heading: g.linkTitle },
    { id: "public", heading: g.publicTitle },
  ];

  return (
    <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
      <h1 className="font-serif text-h2">{g.title}</h1>
      <p className="mt-2 font-sans text-body text-lede-ink">{g.lede}</p>

      <nav aria-labelledby="guide-toc" className="mt-6 border border-line-soft bg-paper2 px-4 py-3">
        <p id="guide-toc" className="font-sans text-caption font-medium text-meta">
          {g.tocLabel}
        </p>
        <ol className="mt-1.5 flex flex-col gap-1">
          {[...g.sections, ...extra].map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="font-sans text-body text-accent hover:underline">
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {g.sections.map((s) => (
        <section key={s.id} id={s.id} className={`mt-10 border-t border-line-soft pt-6 ${anchor}`}>
          <h2 className={h2}>{s.heading}</h2>
          <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-2 gap-y-1 font-sans text-caption">
            <dt className="text-meta">{g.whenLabel}</dt>
            <dd className="text-ink">{s.when}</dd>
            <dt className="text-meta">{g.whereLabel}</dt>
            <dd className="text-ink">{s.where}</dd>
          </dl>
          <ol className="mt-4 flex flex-col gap-2.5">
            {s.steps.map((t, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-x-2 font-sans text-body text-ink">
                <span className="tnum font-ui text-body text-accent">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section id="trouble" className={`mt-10 border-t border-line-soft pt-6 ${anchor}`}>
        <h2 className={h2}>{g.troubleTitle}</h2>
        <dl className="mt-3 divide-y divide-line-soft border-y border-line-soft">
          {g.trouble.map((t) => (
            <div key={t.msg} className="grid gap-x-6 gap-y-1 py-3 hero:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <dt className="font-sans text-body font-medium text-ink">
                <span className="sr-only">{g.troubleMsg}：</span>「{t.msg}」
              </dt>
              <dd className="font-sans text-body text-ink">
                <span className="sr-only">{g.troubleFix}：</span>
                {t.fix}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="link" className={`mt-10 border-t border-line-soft pt-6 ${anchor}`}>
        <h2 className={h2}>{g.linkTitle}</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 font-sans text-body text-ink">
          {g.link.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section id="public" className={`mt-10 border-t border-line-soft pt-6 ${anchor}`}>
        <h2 className={h2}>{g.publicTitle}</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 font-sans text-body text-ink">
          {g.public.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <p className="mt-10 border-t border-line-soft pt-4 font-sans text-caption text-meta">{g.adminNote}</p>
    </main>
  );
}
