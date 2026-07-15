import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeeting, listRecipients } from "@/lib/meetings/queries";
import { rocDateTimeFull, rocDeadline } from "@/lib/meetings/roc";
import { buildAgendaText } from "@/lib/meetings/agenda";
import { AGENDA_SECTIONS } from "@/lib/meetings/sections";
import { DEFAULT_OFFSETS } from "@/lib/meetings/reminders";
import { Input } from "@/components/SearchBox";
import { CopyBlock, CopyButton } from "@/components/CopyBlock";
import { copy } from "@/lib/copy";
import {
  addProposal,
  deleteProposal,
  generateNoticeAction,
  addReminder,
  markReminderDone,
  setMeetingStatus,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;
const STATUSES = ["DRAFT", "NOTICED", "HELD", "CLOSED"] as const;
const sectionTitle = "font-serif text-h4";
const cardCls = "border border-line bg-paper p-card";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  await requireUser();
  const m = await getMeeting(params.id);
  if (!m) notFound();

  const allRecipients = await listRecipients();
  const activeRecipients = allRecipients.filter((r) => r.active);
  const recipientMap = new Map(allRecipients.map((r) => [r.id, r]));

  const agendaText = buildAgendaText(
    { session: m.session, name: m.name, meetingAt: m.meetingAt, location: m.location, meetingUrl: m.meetingUrl },
    m.proposals
  );

  const filesList = m.proposals
    .filter((p) => p.fileUrl?.trim())
    .map((p) => `附件${p.serialNo}｜${p.title}：${p.fileUrl}`)
    .join("\n");

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {c.title}
      </a>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
              {c.kind[m.kind]}
            </span>
            <span className="font-ui text-chip text-accent">{c.status[m.status]}</span>
          </div>
          <h1 className="mt-2 font-serif text-h2">{m.name}</h1>
          <p className="mt-1 font-sans text-caption text-meta">
            {m.academicYear}・第{m.session}屆
          </p>
        </div>
        <a
          href={`/console/meetings/${m.id}/edit`}
          className="border border-line px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {c.detail.edit}
        </a>
      </div>

      {/* 狀態切換 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <form key={s} action={setMeetingStatus}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value={s} />
            <button
              type="submit"
              disabled={m.status === s}
              className={
                "border px-3 py-1.5 font-ui text-chip leading-none transition-colors " +
                (m.status === s
                  ? "border-accent bg-accent text-white"
                  : "border-line text-meta hover:border-accent hover:text-accent")
              }
            >
              {c.status[s]}
            </button>
          </form>
        ))}
      </div>

      <div className="mt-8 grid gap-6 rd:grid-cols-2">
        {/* 會議資訊 */}
        <section className={cardCls}>
          <h2 className={sectionTitle}>{c.detail.infoTitle}</h2>
          <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2 font-sans text-body text-ink">
            <dt className="text-meta">{c.form.meetingAt}</dt>
            <dd>{rocDateTimeFull(m.meetingAt)}</dd>
            <dt className="text-meta">{c.form.location}</dt>
            <dd>{m.location || "—"}</dd>
            <dt className="text-meta">{c.form.meetingUrl}</dt>
            <dd className="break-all">
              {m.meetingUrl ? (
                <a href={m.meetingUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                  {m.meetingUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-meta">{c.form.docNumber}</dt>
            <dd>{m.docNumber || "—"}</dd>
            <dt className="text-meta">{c.form.proposalDeadline}</dt>
            <dd>{m.proposalDeadline ? rocDeadline(m.proposalDeadline) : "—"}</dd>
          </dl>
          {m.notes ? <p className="mt-3 whitespace-pre-wrap font-sans text-caption text-meta">{m.notes}</p> : null}
        </section>

        {/* 會前提醒 */}
        <section className={cardCls}>
          <h2 className={sectionTitle}>{c.detail.remindersTitle}</h2>
          <form action={addReminder} className="mt-4 flex items-end gap-3">
            <input type="hidden" name="meetingId" value={m.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rem-off" className="font-sans text-caption font-medium text-ink">
                {c.reminder.offsetDays}
              </label>
              <select
                id="rem-off"
                name="offsetDays"
                defaultValue={3}
                className="rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
              >
                {DEFAULT_OFFSETS.map((d) => (
                  <option key={d} value={d}>
                    會前 {d} 天
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-[42px] border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
            >
              {c.reminder.add}
            </button>
          </form>

          <ul className="mt-4 divide-y divide-line-soft">
            {m.reminders.length === 0 ? (
              <li className="py-2 font-sans text-caption text-meta">{c.reminder.empty}</li>
            ) : (
              m.reminders.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 font-sans text-caption">
                  <span className="text-ink">會前 {r.offsetDays} 天</span>
                  <span className="tnum text-meta">{rocDateTimeFull(r.fireAt)}</span>
                  {r.sentAt ? (
                    <span className="ml-auto text-meta">{c.reminder.done}</span>
                  ) : (
                    <form action={markReminderDone} className="ml-auto">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="meetingId" value={m.id} />
                      <button
                        type="submit"
                        className="border border-line px-2 py-1 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        {c.reminder.markDone}
                      </button>
                    </form>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* 提案 */}
      <section className={`${cardCls} mt-6`}>
        <h2 className={sectionTitle}>{c.detail.proposalsTitle}</h2>

        <ul className="mt-4 divide-y divide-line-soft">
          {m.proposals.length === 0 ? (
            <li className="py-2 font-sans text-caption text-meta">{c.proposal.empty}</li>
          ) : (
            m.proposals.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
                  附件{p.serialNo}
                </span>
                <span className="shrink-0 font-ui text-chip text-accent">{p.section}</span>
                <span className="min-w-0 flex-1 font-sans text-body text-ink">{p.title}</span>
                {p.proposer ? <span className="font-sans text-caption text-meta">{p.proposer}</span> : null}
                <form action={deleteProposal}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="meetingId" value={m.id} />
                  <button
                    type="submit"
                    className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                  >
                    {c.proposal.delete}
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>

        {/* 新增提案 */}
        <form action={addProposal} className="mt-5 grid gap-3 border-t border-line-soft pt-5 hero:grid-cols-2">
          <input type="hidden" name="meetingId" value={m.id} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-serial" className="font-sans text-caption font-medium text-ink">
              {c.proposal.serialNo}
            </label>
            <Input id="p-serial" name="serialNo" type="number" defaultValue={m.proposals.length + 2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-section" className="font-sans text-caption font-medium text-ink">
              {c.proposal.section}
            </label>
            <select
              id="p-section"
              name="section"
              defaultValue="討論事項"
              className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
            >
              {AGENDA_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 hero:col-span-2">
            <label htmlFor="p-title" className="font-sans text-caption font-medium text-ink">
              {c.proposal.title}
            </label>
            <Input id="p-title" name="title" required placeholder={c.proposal.titlePlaceholder} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-proposer" className="font-sans text-caption font-medium text-ink">
              {c.proposal.proposer}
            </label>
            <Input id="p-proposer" name="proposer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-file" className="font-sans text-caption font-medium text-ink">
              {c.proposal.fileUrl}
            </label>
            <Input id="p-file" name="fileUrl" placeholder={c.proposal.fileUrlPlaceholder} />
          </div>
          <div className="flex flex-col gap-1.5 hero:col-span-2">
            <label htmlFor="p-exp" className="font-sans text-caption font-medium text-ink">
              {c.proposal.explanation}
            </label>
            <textarea
              id="p-exp"
              name="explanation"
              rows={2}
              className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink placeholder:text-meta focus:border-accent"
            />
          </div>
          <div className="hero:col-span-2">
            <button
              type="submit"
              className="border border-ink bg-ink px-5 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
            >
              {c.proposal.add}
            </button>
          </div>
        </form>
      </section>

      {/* 議程 */}
      <section className={`${cardCls} mt-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={sectionTitle}>{c.detail.agendaTitle}</h2>
          <span className="font-sans text-caption text-meta">{c.detail.agendaHint}</span>
        </div>
        <div className="mt-4">
          <CopyBlock text={agendaText} label={c.detail.agendaTitle} />
        </div>
      </section>

      {/* 開會通知 / 會議通知 */}
      <section className={`${cardCls} mt-6`}>
        <h2 className={sectionTitle}>{c.detail.noticeTitle}</h2>
        <p className="mt-2 font-sans text-caption text-meta">{c.notice.pick}</p>
        <p className="mt-1 font-sans text-caption text-warn-ink">{c.notice.draftOnly}</p>

        <form action={generateNoticeAction} className="mt-4">
          <input type="hidden" name="meetingId" value={m.id} />
          <fieldset className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-sans text-body text-ink">
              <input type="radio" name="kind" value="notice" defaultChecked /> {c.notice.kindNotice}
            </label>
            <label className="flex items-center gap-2 font-sans text-body text-ink">
              <input type="radio" name="kind" value="agenda" /> {c.notice.kindAgenda}
            </label>
          </fieldset>

          <div className="mt-4">
            <p className="font-sans text-caption font-medium text-ink">{c.notice.recipients}</p>
            {activeRecipients.length === 0 ? (
              <p className="mt-2 font-sans text-caption text-meta">{c.notice.noRecipients}</p>
            ) : (
              <div className="mt-2 grid gap-1.5 hero:grid-cols-3">
                {activeRecipients.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 font-sans text-caption text-ink">
                    <input type="checkbox" name="recipientIds" value={r.id} defaultChecked />
                    <span className="text-meta">{r.roleTag}</span> {r.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="mt-5 border border-ink bg-ink px-5 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
          >
            {c.notice.generate}
          </button>
        </form>

        {/* 已生成的通知 */}
        <div className="mt-6">
          <p className="font-sans text-caption font-medium text-ink">{c.notice.latest}</p>
          {m.notices.length === 0 ? (
            <p className="mt-2 font-sans text-caption text-meta">{c.notice.none}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-5">
              {m.notices.slice(0, 5).map((n) => {
                const ids = Array.isArray(n.recipientIds) ? (n.recipientIds as string[]) : [];
                const emails = ids
                  .map((id) => recipientMap.get(id))
                  .filter((r): r is NonNullable<typeof r> => Boolean(r))
                  .map((r) => r.email)
                  .join(", ");
                return (
                  <li key={n.id} className="border border-line-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft bg-paper2 px-3 py-2">
                      <span className="font-ui text-chip text-accent">
                        {n.kind === "agenda" ? c.notice.kindAgenda : c.notice.kindNotice}
                      </span>
                      <div className="flex gap-2">
                        <CopyButton text={n.subject} label={c.notice.copySubject} />
                        <CopyButton text={n.bodyText} label={c.notice.copyBody} />
                        {emails ? <CopyButton text={emails} label={c.notice.copyRecipients} /> : null}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="font-sans text-caption font-medium text-ink">{c.notice.subject}</p>
                      <p className="mt-0.5 font-sans text-body text-ink">{n.subject}</p>
                      <p className="mt-3 font-sans text-caption font-medium text-ink">{c.notice.body}</p>
                      <pre className="mt-0.5 max-h-[24rem] overflow-auto whitespace-pre-wrap break-words font-sans text-body leading-relaxed text-ink">
                        {n.bodyText}
                      </pre>
                      {emails ? (
                        <p className="mt-2 break-words font-sans text-caption text-meta">
                          {c.notice.recipients}：{emails}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* 會議資料 */}
      <section className={`${cardCls} mt-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={sectionTitle}>{c.detail.filesTitle}</h2>
          {filesList ? <CopyButton text={filesList} label={c.files.copyAll} /> : null}
        </div>
        <p className="mt-2 font-sans text-caption text-meta">{c.files.hint}</p>
        {filesList ? (
          <ul className="mt-4 divide-y divide-line-soft">
            {m.proposals
              .filter((p) => p.fileUrl?.trim())
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 py-2 font-sans text-caption">
                  <span className="text-meta">附件{p.serialNo}</span>
                  <span className="text-ink">{p.title}</span>
                  <a
                    href={p.fileUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-accent hover:underline"
                  >
                    {p.fileUrl}
                  </a>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-4 font-sans text-caption text-meta">{c.files.empty}</p>
        )}
      </section>
    </main>
  );
}
