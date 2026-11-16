import { Input } from "@/components/SearchBox";
import { rocDate, rocDateTimeFull, rocDeadline } from "@/lib/meetings/roc";
import { daysBetween, type Milestone } from "@/lib/meetings/timeline";
import { meetingKey } from "@/lib/meetings/slug";
import { stepHref, type StepKey } from "@/lib/meetings/steps";
import { copy } from "@/lib/copy";
import { addMilestone, deleteMilestone, setMeetingStatus, toggleMeetingPublic } from "../../actions";
import { Block, btn, btnSolid, meetingTimeline, relDays, summaryCls, type MeetingFull } from "./shell";

const c = copy.meetings;
const STATUSES = ["DRAFT", "NOTICED", "HELD", "CLOSED"] as const;

/** 籌備時程上的事項各屬哪一步，點了直接過去。 */
const MILESTONE_STEP: Partial<Record<Milestone["action"], StepKey>> = {
  notice: "notice",
  deadline: "agenda",
  law: "agenda",
  agenda: "agenda",
  meeting: "live",
};

/** 第 1 步　會議資料：基本資料、籌備時程、公開設定、狀態更正。 */
export function InfoStep({ m, isAdmin }: { m: MeetingFull; isAdmin: boolean }) {
  const key = meetingKey(m);
  const now = new Date();
  const timeline = meetingTimeline(m);

  return (
    <>
      <Block
        title={c.detail.infoTitle}
        right={
          <a href={`/console/meetings/${key}/edit`} className={btn}>
            {c.detail.edit}
          </a>
        }
      >
        <dl className="grid gap-x-4 gap-y-2 font-sans text-body text-ink hero:grid-cols-[8rem_1fr]">
          <dt className="text-caption text-meta hero:text-body">{c.form.meetingAt}</dt>
          <dd>{rocDateTimeFull(m.meetingAt)}</dd>
          <dt className="text-caption text-meta hero:text-body">{c.form.location}</dt>
          <dd>{m.location || "—"}</dd>
          <dt className="text-caption text-meta hero:text-body">{c.form.meetingUrl}</dt>
          <dd className="break-all">
            {m.meetingUrl ? (
              <a href={m.meetingUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                {m.meetingUrl}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-caption text-meta hero:text-body">{c.form.docNumber}</dt>
          <dd>{m.docNumber || "—"}</dd>
          <dt className="text-caption text-meta hero:text-body">{c.form.proposalDeadline}</dt>
          <dd>{m.proposalDeadline ? rocDeadline(m.proposalDeadline) : "—"}</dd>
        </dl>
        {m.notes ? <p className="mt-3 whitespace-pre-wrap font-sans text-caption text-meta">{m.notes}</p> : null}
      </Block>

      <Block title={c.info.scheduleTitle}>
        <ol className="divide-y divide-line-soft border-y border-line-soft">
          {timeline.map((ms) => {
            const d = daysBetween(now, ms.date);
            const step = MILESTONE_STEP[ms.action];
            return (
              <li key={ms.key} className="grid gap-x-4 gap-y-0.5 py-3 hero:grid-cols-[12rem_1fr]">
                <div>
                  <p className="font-sans text-body tnum text-ink">{rocDate(ms.date)}</p>
                  <p className={`font-sans text-caption ${d > 0 ? "text-accent" : d === 0 ? "text-warn-ink" : "text-meta"}`}>
                    {relDays(now, ms.date)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-body font-medium text-ink">{ms.title}</p>
                  {ms.hint ? <p className="font-sans text-caption text-meta">{ms.hint}</p> : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ms.source ? (
                      <a
                        href={ms.sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-sans text-caption text-ref-ink hover:underline"
                      >
                        法源：{ms.source} ↗
                      </a>
                    ) : null}
                    {step ? (
                      <a href={stepHref(key, step)} className="font-sans text-caption text-accent hover:underline">
                        {c.steps.label[step]} →
                      </a>
                    ) : null}
                    {ms.action === "custom" && ms.id ? (
                      <form action={deleteMilestone}>
                        <input type="hidden" name="id" value={ms.id} />
                        <input type="hidden" name="meetingId" value={m.id} />
                        <button type="submit" className="font-sans text-caption text-meta hover:text-warn-ink">
                          {c.timeline.del}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 font-sans text-caption text-meta">{c.info.scheduleNote}</p>

        <details className="mt-3 border border-line-soft px-3 py-2">
          <summary className={summaryCls}>{c.info.addMilestone}</summary>
          <form action={addMilestone} className="mt-3 grid gap-3 hero:grid-cols-3 hero:items-end">
            <input type="hidden" name="meetingId" value={m.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ms-title" className="font-sans text-caption font-medium text-ink">
                {c.timeline.mTitle}
              </label>
              <Input id="ms-title" name="title" required placeholder={c.timeline.mTitlePlaceholder} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ms-at" className="font-sans text-caption font-medium text-ink">
                {c.timeline.mAt}
              </label>
              <Input id="ms-at" name="at" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ms-note" className="font-sans text-caption font-medium text-ink">
                {c.timeline.mNote}
              </label>
              <Input id="ms-note" name="note" />
            </div>
            <div className="hero:col-span-3">
              <button type="submit" className={btnSolid}>
                {c.timeline.mAdd}
              </button>
            </div>
          </form>
        </details>
      </Block>

      <Block title={c.info.publicTitle}>
        <p className="max-w-reader font-sans text-body text-ink">{m.isPublic ? c.info.publicOn : c.info.publicOff}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <form action={toggleMeetingPublic}>
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className={m.isPublic ? btn : btnSolid}>
                {m.isPublic ? c.detail.makePrivate : c.detail.makePublic}
              </button>
            </form>
          ) : (
            <p className="font-sans text-caption text-meta">{c.info.publicAdminOnly}</p>
          )}
          {m.isPublic ? (
            <a href={`/meetings/${key}`} target="_blank" rel="noreferrer" className="font-sans text-caption text-accent hover:underline">
              {c.detail.viewPublic}
            </a>
          ) : null}
        </div>
      </Block>

      <Block title={c.info.statusTitle}>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((st) => (
            <form key={st} action={setMeetingStatus}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value={st} />
              <button
                type="submit"
                disabled={m.status === st}
                aria-pressed={m.status === st}
                className={
                  "border px-3 py-1.5 font-sans text-caption leading-none transition-colors " +
                  (m.status === st
                    ? "border-accent bg-accent text-white"
                    : "border-line text-meta hover:border-accent hover:text-accent")
                }
              >
                {c.status[st]}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-2 font-sans text-caption text-meta">{c.info.statusHint}</p>
      </Block>
    </>
  );
}
