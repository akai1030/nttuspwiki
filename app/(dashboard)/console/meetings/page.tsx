import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { listMeetings } from "@/lib/meetings/queries";
import { rocDateTime } from "@/lib/meetings/roc";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;

export default async function MeetingsPage() {
  await requireUser();
  const meetings = await listMeetings();

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console" className="font-sans text-caption text-accent hover:underline">
        {c.backToConsole}
      </a>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-h2">{c.title}</h1>
          <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/console/meetings/recipients"
            className="border border-line px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {c.list.recipients}
          </a>
          <a
            href="/console/meetings/new"
            className="border border-ink bg-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
          >
            {c.list.newMeeting}
          </a>
        </div>
      </div>

      <div className="mt-8">
        {meetings.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">
            {c.list.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {meetings.map((m) => (
              <li key={m.id}>
                <a
                  href={`/console/meetings/${m.id}`}
                  className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 transition-colors hover:bg-paper2"
                >
                  <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
                    {c.kind[m.kind]}
                  </span>
                  <span className="min-w-0 flex-1 font-serif text-art-name text-ink group-hover:text-accent">
                    {m.name}
                  </span>
                  <span className="font-sans text-caption tnum text-meta">
                    {rocDateTime(m.meetingAt)}
                  </span>
                  <span className="font-sans text-caption text-meta">
                    {c.list.proposalsN(m._count.proposals)}
                  </span>
                  <span className="font-ui text-chip text-accent">{c.status[m.status]}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
