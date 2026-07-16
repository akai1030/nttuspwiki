import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { getPublicMeeting } from "@/lib/meetings/queries";
import { rocDateTimeFull, rocDate, rocDeadline } from "@/lib/meetings/roc";
import { buildTimeline, daysBetween } from "@/lib/meetings/timeline";
import { AGENDA_SECTIONS } from "@/lib/meetings/sections";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

const c = copy.publicMeetings.detail;
const tl = copy.meetings.timeline;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  let m: Awaited<ReturnType<typeof getPublicMeeting>> = null;
  try {
    m = await getPublicMeeting(params.id);
  } catch {
    /* ignore */
  }
  const title = m ? m.name : copy.publicMeetings.title;
  return { title: `${title}｜${copy.home.org}${copy.home.sys}` };
}

export default async function PublicMeetingDetail({ params }: { params: { id: string } }) {
  const m = await getPublicMeeting(params.id);
  if (!m) notFound();

  const now = new Date();
  const timeline = buildTimeline(
    { meetingAt: m.meetingAt, proposalDeadline: m.proposalDeadline },
    m.milestones.map((ms) => ({ id: ms.id, title: ms.title, at: ms.at, note: ms.note }))
  );

  // 議程分節（依會議規範順序；未知分節置後）
  const known = AGENDA_SECTIONS as readonly string[];
  const sections = [...known, ...m.proposals.map((p) => p.section).filter((s) => !known.includes(s))];
  const seen = new Set<string>();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <a href="/meetings" className="font-sans text-caption text-accent hover:underline">
          {c.back}
        </a>

        <header className="mt-4 border-b-2 border-ink pb-6">
          <span className="border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
            {copy.meetings.kind[m.kind]}
          </span>
          <h1 className="mt-3 font-serif text-h2">{m.name}</h1>
          <p className="mt-1 font-sans text-caption text-meta">
            {m.academicYear}・第{m.session}屆
          </p>
        </header>

        {/* 會議資訊 */}
        <section className="mt-8">
          <h2 className="font-serif text-h4">{c.infoTitle}</h2>
          <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2 font-sans text-body text-ink">
            <dt className="text-meta">{c.when}</dt>
            <dd>{rocDateTimeFull(m.meetingAt)}</dd>
            {m.location ? (
              <>
                <dt className="text-meta">{c.place}</dt>
                <dd>{m.location}</dd>
              </>
            ) : null}
            {m.meetingUrl ? (
              <>
                <dt className="text-meta">{c.link}</dt>
                <dd className="break-all">
                  <a href={m.meetingUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {m.meetingUrl}
                  </a>
                </dd>
              </>
            ) : null}
            {m.docNumber ? (
              <>
                <dt className="text-meta">{c.doc}</dt>
                <dd>{m.docNumber}</dd>
              </>
            ) : null}
            {m.proposalDeadline ? (
              <>
                <dt className="text-meta">{c.deadline}</dt>
                <dd>{rocDeadline(m.proposalDeadline)}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {/* 議程 */}
        <section className="mt-8">
          <h2 className="font-serif text-h4">{c.agendaTitle}</h2>
          {m.proposals.length === 0 ? (
            <p className="mt-3 font-sans text-body text-meta">{c.noProposals}</p>
          ) : (
            <div className="mt-3 space-y-5">
              {sections.map((section) => {
                if (seen.has(section)) return null;
                seen.add(section);
                const items = m.proposals.filter((p) => p.section === section);
                if (items.length === 0) return null;
                return (
                  <div key={section}>
                    <h3 className="font-sans text-body font-bold text-ink">{section}</h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {items.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 font-sans text-body text-ink">
                          <span className="shrink-0 text-meta tnum">附件{p.serialNo}</span>
                          <span className="min-w-0 flex-1">{p.title}</span>
                          {p.proposer ? <span className="text-caption text-meta">{p.proposer}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 籌備時程 */}
        <section className="mt-8">
          <h2 className="font-serif text-h4">{c.timelineTitle}</h2>
          <ol className="relative mt-4 space-y-5 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-line">
            {timeline.map((ms) => {
              const d = daysBetween(now, ms.date);
              const statusText = d > 0 ? tl.inDays(d) : d === 0 ? tl.today : tl.agoDays(-d);
              const statusCls = d > 0 ? "text-accent" : d === 0 ? "text-warn-ink" : "text-meta";
              const dotCls =
                ms.action === "custom" ? "bg-sch" : ms.action === "meeting" ? "bg-ink" : d < 0 ? "bg-line" : "bg-accent";
              return (
                <li key={ms.key} className="relative pl-7">
                  <span className={`absolute left-0 top-1 h-[13px] w-[13px] rounded-full border-2 border-paper ${dotCls}`} />
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-serif text-art-name tnum text-ink">{rocDate(ms.date)}</span>
                    <span className={`font-ui text-chip leading-none ${statusCls}`}>{statusText}</span>
                  </div>
                  <p className="mt-0.5 font-sans text-body text-ink">{ms.title}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="mt-10 border-t border-line-soft pt-4 font-sans text-caption text-meta">{c.disclaimer}</p>
      </main>
      <SiteFooter />
    </>
  );
}
