import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { listMeetings } from "@/lib/meetings/queries";
import { rocDateTime } from "@/lib/meetings/roc";
import { copy } from "@/lib/copy";
import { meetingKey } from "@/lib/meetings/slug";
import { STEP_KEYS, suggestedStep } from "@/lib/meetings/steps";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;

export default async function MeetingsPage() {
  await requireUser();
  const meetings = await listMeetings();
  const now = new Date();

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-h2">{c.title}</h1>
          <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
        </div>
        <a
          href="/console/meetings/new"
          className="border border-ink bg-ink px-4 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
        >
          {c.list.newMeeting}
        </a>
      </div>

      <div className="mt-8">
        {meetings.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">
            {c.list.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {meetings.map((m) => {
              const key = meetingKey(m);
              const next = suggestedStep(m, now);
              const n = STEP_KEYS.indexOf(next) + 1;
              return (
                <li key={m.id}>
                  <a
                    href={`/console/meetings/${key}`}
                    className="group grid gap-x-6 gap-y-1 py-4 transition-colors hover:bg-paper2 hero:grid-cols-[minmax(0,1fr)_14rem] hero:px-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-line-soft px-2 py-0.5 font-sans text-caption leading-none text-meta">
                          {c.kind[m.kind]}
                        </span>
                        <span className="font-sans text-caption text-accent">{c.status[m.status]}</span>
                      </div>
                      <p className="mt-1 font-serif text-art-name text-ink group-hover:text-accent">{m.name}</p>
                      <p className="font-sans text-caption tnum text-meta">
                        {rocDateTime(m.meetingAt)}・{c.list.proposalsN(m._count.proposals)}
                      </p>
                    </div>
                    <p className="self-center font-sans text-caption text-ink hero:text-right">
                      {m.status === "CLOSED" ? c.status.CLOSED : copy.console.nextStep(c.steps.numbered(n, c.steps.label[next]), null)}
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

