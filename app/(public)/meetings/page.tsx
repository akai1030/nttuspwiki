import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { listPublicMeetings } from "@/lib/meetings/queries";
import { rocDateTime } from "@/lib/meetings/roc";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.publicMeetings.title}｜${copy.home.org}${copy.home.sys}`,
  description: copy.publicMeetings.lede,
};

const c = copy.publicMeetings;

export default async function PublicMeetingsPage() {
  let meetings: Awaited<ReturnType<typeof listPublicMeetings>> = [];
  try {
    meetings = await listPublicMeetings();
  } catch {
    /* runtime DB 暫時不可用 */
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => m.meetingAt.getTime() >= now);
  const past = meetings.filter((m) => m.meetingAt.getTime() < now);

  const Row = ({ m }: { m: (typeof meetings)[number] }) => (
    <li>
      <a
        href={`/meetings/${m.id}`}
        className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 transition-colors hover:bg-paper2"
      >
        <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
          {copy.meetings.kind[m.kind]}
        </span>
        <span className="min-w-0 flex-1 font-serif text-art-name text-ink group-hover:text-accent">
          {m.name}
        </span>
        <span className="font-sans text-caption tnum text-meta">{rocDateTime(m.meetingAt)}</span>
        {m.location ? <span className="font-sans text-caption text-meta">{m.location}</span> : null}
      </a>
    </li>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <header className="mb-10 border-b-2 border-ink pb-8">
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
            Meetings
          </div>
          <h1 className="mt-3 font-serif text-h2">{c.title}</h1>
          <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">{c.lede}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <a href="/meetings/schedule" className="font-sans text-body text-accent hover:underline">
              {copy.publicMeetings.schedule.nav} →
            </a>
            <a href="/meetings/about" className="font-sans text-body text-accent hover:underline">
              {c.aboutLink} →
            </a>
          </div>
        </header>

        <a
          href="/meetings/schedule"
          className="mb-10 block border border-line border-l-[3px] border-l-accent bg-paper2 p-card transition-colors hover:border-accent"
        >
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
            Statutory Schedule
          </div>
          <h2 className="mt-2 font-serif text-h4">{copy.publicMeetings.schedule.cardTitle} →</h2>
          <p className="mt-2 max-w-reader font-sans text-body text-body-ink">
            {copy.publicMeetings.schedule.cardBody}
          </p>
        </a>

        {meetings.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-10 text-center font-sans text-body text-meta">
            {c.empty}
          </p>
        ) : (
          <div className="max-w-reader">
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-2 font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
                  {c.upcoming}
                </h2>
                <ul className="divide-y divide-line-soft border-y border-line-soft">
                  {upcoming.map((m) => (
                    <Row key={m.id} m={m} />
                  ))}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-2 font-ui text-eyebrow font-medium uppercase tracking-kicker text-meta">
                  {c.past}
                </h2>
                <ul className="divide-y divide-line-soft border-y border-line-soft">
                  {past.map((m) => (
                    <Row key={m.id} m={m} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
