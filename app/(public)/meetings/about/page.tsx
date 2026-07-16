import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: `${copy.publicMeetings.about.title}｜${copy.home.org}${copy.home.sys}`,
  description: copy.publicMeetings.about.lede,
};

const a = copy.publicMeetings.about;

export default function MeetingsAboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <a href="/meetings" className="font-sans text-caption text-accent hover:underline">
          {a.back}
        </a>
        <header className="mt-4 border-b-2 border-ink pb-6">
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
            About
          </div>
          <h1 className="mt-3 font-serif text-h2">{a.title}</h1>
          <p className="mt-4 font-sans text-lede text-lede-ink">{a.lede}</p>
        </header>

        <div className="mt-10 space-y-8">
          {a.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-serif text-h4">{s.h}</h2>
              <ul className="mt-3 space-y-2">
                {s.items.map((item, i) => (
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
