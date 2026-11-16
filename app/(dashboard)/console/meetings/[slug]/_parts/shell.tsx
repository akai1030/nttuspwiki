import type { ReactNode } from "react";
import type { getMeetingByKey } from "@/lib/meetings/queries";
import { rocDate, rocDateTimeFull, rocParts } from "@/lib/meetings/roc";
import { buildTimeline, daysBetween } from "@/lib/meetings/timeline";
import { meetingKey } from "@/lib/meetings/slug";
import { STEP_KEYS, stepDone, stepDue, stepHref, type StepKey } from "@/lib/meetings/steps";
import { copy } from "@/lib/copy";

export type MeetingFull = NonNullable<Awaited<ReturnType<typeof getMeetingByKey>>>;

const c = copy.meetings;
const s = c.steps;

export const btn =
  "border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent";
export const btnSolid =
  "border border-ink bg-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent";
export const field =
  "rounded-sm border border-line bg-paper px-2.5 py-1.5 font-sans text-caption text-ink focus:border-accent";
export const summaryCls =
  "cursor-pointer font-sans text-caption font-medium text-accent hover:underline";

export function meetingTimeline(m: MeetingFull) {
  return buildTimeline(
    { meetingAt: m.meetingAt, proposalDeadline: m.proposalDeadline, kind: m.kind },
    m.milestones.map((ms) => ({ id: ms.id, title: ms.title, at: ms.at, note: ms.note }))
  );
}

/** 「還有 3 天」「今天」「已過 2 天」 */
export function relDays(now: Date, d: Date): string {
  const n = daysBetween(now, d);
  return n > 0 ? c.timeline.inDays(n) : n === 0 ? c.timeline.today : c.timeline.agoDays(-n);
}

function shortDate(d: Date): string {
  const p = rocParts(d);
  return `${p.month}/${p.day}`;
}

/** 每一步的區塊：標題列＋內容。不用色條，靠標題與留白分段。 */
export function Block({
  title,
  right,
  children,
  id,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-24 border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h3 className="font-serif text-art-name text-ink">{title}</h3>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * 會議頁外框：返回連結、會議名稱、五步步驟列、這一步的標題與期限。
 * 第 1、2、3、5 步（[slug]/page.tsx）與第 4 步（[slug]/live/page.tsx）共用。
 */
export function MeetingShell({
  m,
  step,
  aside,
  children,
}: {
  m: MeetingFull;
  step: StepKey;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const key = meetingKey(m);
  const now = new Date();
  const timeline = meetingTimeline(m);
  const idx = STEP_KEYS.indexOf(step);
  const due = stepDue(timeline, m.meetingAt, step);

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        {c.backToList}
      </a>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
            {c.kind[m.kind]}
          </span>
          <span className="font-sans text-caption text-accent">{c.status[m.status]}</span>
          {m.isPublic ? (
            <a
              href={`/meetings/${key}`}
              target="_blank"
              rel="noreferrer"
              className="font-sans text-caption text-accent hover:underline"
            >
              ● {c.detail.publicBadge} ↗
            </a>
          ) : null}
        </div>
        <h1 className="mt-2 font-serif text-h2">{m.name}</h1>
        <p className="mt-1 font-sans text-caption text-meta">
          {rocDateTimeFull(m.meetingAt)}
          {m.location ? `・${m.location}` : ""}
          ・{m.academicYear}・第{m.session}屆
        </p>
      </header>

      <nav aria-label={s.navLabel} className="mt-6 border-y border-line">
        <ol className="grid grid-cols-5">
          {STEP_KEYS.map((k, i) => {
            const active = k === step;
            const done = stepDone(m, k);
            const d = stepDue(timeline, m.meetingAt, k);
            return (
              <li key={k} className="min-w-0">
                <a
                  href={stepHref(key, k)}
                  aria-current={active ? "step" : undefined}
                  className={
                    "flex h-full flex-col items-center gap-1 border-b-2 px-1 py-3 text-center transition-colors hero:flex-row hero:items-start hero:gap-2 hero:px-3 hero:text-left " +
                    (active ? "border-accent bg-paper2" : "border-transparent hover:bg-paper2")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-ui text-chip " +
                      (active
                        ? "border-accent bg-accent text-white"
                        : done
                          ? "border-accent text-accent"
                          : "border-line text-meta")
                    }
                  >
                    {done && !active ? "✓" : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={
                        "font-sans text-caption font-medium " + (active ? "text-ink" : "text-meta")
                      }
                    >
                      <span className="hero:hidden">{s.short[k]}</span>
                      <span className="hidden hero:inline">{s.label[k]}</span>
                      <span className="sr-only">
                        {done ? `（${s.done}）` : ""}
                        {active ? `（${s.now}）` : ""}
                      </span>
                    </span>
                    {d ? <span className="tnum font-ui text-chip text-meta">{shortDate(d)}</span> : null}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-h4 text-ink">{s.numbered(idx + 1, s.label[step])}</h2>
          <p className="mt-1 max-w-reader font-sans text-body text-lede-ink">{s.lead[step]}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 font-sans text-caption">
            {due ? <span className="text-accent">{s.due(rocDate(due), relDays(now, due))}</span> : null}
            <a href={`/console/meetings/guide#${step}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {copy.meetings.vote.guideLink}
            </a>
          </p>
        </div>
        {aside}
      </div>

      {children}
    </main>
  );
}
