import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeeting, listRecipients } from "@/lib/meetings/queries";
import { rocDateTimeFull, rocDeadline, rocDate } from "@/lib/meetings/roc";
import { buildAgendaText } from "@/lib/meetings/agenda";
import { buildTimeline, daysBetween, PREP_OFFSETS } from "@/lib/meetings/timeline";
import { AGENDA_SECTIONS } from "@/lib/meetings/sections";
import { DEFAULT_OFFSETS } from "@/lib/meetings/reminders";
import { Input } from "@/components/SearchBox";
import { CopyBlock, CopyButton } from "@/components/CopyBlock";
import { PrintButton } from "@/components/PrintButton";
import { copy } from "@/lib/copy";
import {
  addProposal,
  deleteProposal,
  generateNoticeAction,
  addReminder,
  markReminderDone,
  unmarkReminderDone,
  deleteReminder,
  setMeetingStatus,
  addMilestone,
  deleteMilestone,
  toggleMeetingPublic,
  deleteNotice,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;
const STATUSES = ["DRAFT", "NOTICED", "HELD", "CLOSED"] as const;
// 分區色（回應「多用顏色、分層」）：左側色條＋同色 eyebrow，讓密集資訊可掃讀。
const SEC = {
  timeline: { card: "border border-line border-l-[3px] border-l-accent bg-paper p-card", eb: "text-accent", en: "Timeline" },
  info: { card: "border border-line border-l-[3px] border-l-accent2 bg-paper p-card", eb: "text-accent2", en: "Info" },
  reminders: { card: "border border-line border-l-[3px] border-l-sch bg-paper p-card", eb: "text-sch", en: "Reminders" },
  proposals: { card: "border border-line border-l-[3px] border-l-ref bg-paper p-card", eb: "text-ref-ink", en: "Proposals" },
  agenda: { card: "border border-line border-l-[3px] border-l-accent bg-paper p-card", eb: "text-accent", en: "Agenda" },
  notice: { card: "border border-line border-l-[3px] border-l-warn bg-paper p-card", eb: "text-warn-ink", en: "Notice" },
  files: { card: "border border-line border-l-[3px] border-l-line bg-paper p-card", eb: "text-meta", en: "Files" },
} as const;

function SecHead({
  s,
  title,
  right,
}: {
  s: { eb: string; en: string };
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className={`font-ui text-chip font-medium uppercase tracking-kicker ${s.eb}`}>{s.en}</div>
        <h2 className="mt-1 font-serif text-h4">{title}</h2>
      </div>
      {right}
    </div>
  );
}

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

  const now = new Date();
  const timeline = buildTimeline(
    { meetingAt: m.meetingAt, proposalDeadline: m.proposalDeadline, kind: m.kind },
    m.milestones.map((ms) => ({ id: ms.id, title: ms.title, at: ms.at, note: ms.note }))
  );

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
            {m.isPublic ? (
              <span className="ml-2 font-ui text-chip text-accent">● {c.detail.publicBadge}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {m.isPublic ? (
            <a
              href={`/meetings/${m.id}`}
              target="_blank"
              rel="noreferrer"
              className="font-ui text-caption text-accent hover:underline"
            >
              {c.detail.viewPublic}
            </a>
          ) : null}
          <form action={toggleMeetingPublic}>
            <input type="hidden" name="id" value={m.id} />
            <button
              type="submit"
              className={
                "border px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug transition-colors " +
                (m.isPublic
                  ? "border-line text-meta hover:border-accent hover:text-accent"
                  : "border-accent bg-accent text-white hover:bg-accent-soft")
              }
            >
              {m.isPublic ? c.detail.makePrivate : c.detail.makePublic}
            </button>
          </form>
          <a
            href={`/console/meetings/${m.id}/edit`}
            className="border border-line px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {c.detail.edit}
          </a>
        </div>
      </div>
      <p className="mt-2 font-sans text-caption text-meta">{c.detail.publicHint}</p>

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

      {/* 籌備時間軸（大） */}
      <section className={`${SEC.timeline.card} mt-8`}>
        <SecHead
          s={SEC.timeline}
          title={c.timeline.title}
          right={<span className="hidden max-w-[16rem] text-right font-sans text-caption text-meta hero:block">{c.timeline.lede}</span>}
        />

        <ol className="relative mt-6 space-y-6 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-line">
          {timeline.map((ms) => {
            const d = daysBetween(now, ms.date);
            const statusText =
              d > 0 ? c.timeline.inDays(d) : d === 0 ? c.timeline.today : c.timeline.agoDays(-d);
            const statusCls = d > 0 ? "text-accent" : d === 0 ? "text-warn-ink" : "text-meta";
            const dotCls =
              ms.action === "law"
                ? "bg-ref"
                : ms.action === "custom"
                  ? "bg-sch"
                  : ms.action === "meeting"
                    ? "bg-ink"
                    : d === 0
                      ? "bg-warn-ink"
                      : d < 0
                        ? "bg-line"
                        : "bg-accent";
            return (
              <li key={ms.key} className="relative pl-7">
                <span
                  className={`absolute left-0 top-1 h-[13px] w-[13px] rounded-full border-2 border-paper ${dotCls}`}
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-serif text-art-name tnum text-ink">{rocDate(ms.date)}</span>
                  <span className={`font-ui text-chip leading-none ${statusCls}`}>{statusText}</span>
                </div>
                <p className="mt-0.5 font-sans text-body font-medium text-ink">{ms.title}</p>
                <p className="font-sans text-caption text-meta">{ms.hint}</p>

                {ms.action === "law" && ms.source ? (
                  <a
                    href={ms.sourceHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block border border-ref-border bg-ref-surface px-2 py-0.5 font-sans text-chip text-ref-ink transition-colors hover:border-ref"
                  >
                    法源：{ms.source} ↗
                  </a>
                ) : null}

                {ms.action === "law" ? (
                  <form action={addReminder} className="mt-2">
                    <input type="hidden" name="meetingId" value={m.id} />
                    <input type="hidden" name="offsetDays" value={ms.offsetDays ?? 6} />
                    <button
                      type="submit"
                      className="border border-ink px-3 py-1.5 font-ui text-chip font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:bg-accent hover:text-white"
                    >
                      {c.timeline.actRemind}
                    </button>
                  </form>
                ) : null}

                {ms.action === "notice" || ms.action === "agenda" ? (
                  <a
                    href="#notice"
                    className="mt-2 inline-block border border-ink px-3 py-1.5 font-ui text-chip font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:bg-accent hover:text-white"
                  >
                    {ms.action === "notice" ? c.timeline.actNotice : c.timeline.actAgenda}
                  </a>
                ) : null}

                {ms.action === "remind" ? (
                  <form action={addReminder} className="mt-2">
                    <input type="hidden" name="meetingId" value={m.id} />
                    <input type="hidden" name="offsetDays" value={PREP_OFFSETS.remind} />
                    <button
                      type="submit"
                      className="border border-ink px-3 py-1.5 font-ui text-chip font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:bg-accent hover:text-white"
                    >
                      {c.timeline.actRemind}
                    </button>
                  </form>
                ) : null}

                {ms.action === "custom" && ms.id ? (
                  <form action={deleteMilestone} className="mt-2">
                    <input type="hidden" name="id" value={ms.id} />
                    <input type="hidden" name="meetingId" value={m.id} />
                    <button
                      type="submit"
                      className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                    >
                      {c.timeline.del}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* 新增委員會 / 其他時程 */}
        <form
          action={addMilestone}
          className="mt-6 grid gap-3 border-t border-line-soft pt-5 hero:grid-cols-[1.1fr_1fr_1.4fr_auto] hero:items-end"
        >
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
          <button
            type="submit"
            className="h-[42px] border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
          >
            {c.timeline.mAdd}
          </button>
        </form>

        <p className="mt-4 border-t border-line-soft pt-3 font-sans text-caption text-meta">
          {c.timeline.offsetNote}
        </p>
      </section>

      <div className="mt-8 grid gap-6 rd:grid-cols-2">
        {/* 會議資訊 */}
        <section className={SEC.info.card}>
          <SecHead s={SEC.info} title={c.detail.infoTitle} />
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
        <section className={SEC.reminders.card}>
          <SecHead s={SEC.reminders} title={c.detail.remindersTitle} />
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
                  <div className="ml-auto flex items-center gap-2">
                    {r.sentAt ? (
                      <form action={unmarkReminderDone} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="meetingId" value={m.id} />
                        <span className="text-sch">✓ {c.reminder.done}</span>
                        <button
                          type="submit"
                          className="border border-line px-2 py-1 font-ui text-chip leading-none text-accent transition-colors hover:border-accent"
                        >
                          {c.reminder.undo}
                        </button>
                      </form>
                    ) : (
                      <form action={markReminderDone}>
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
                    <form action={deleteReminder}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="meetingId" value={m.id} />
                      <button
                        type="submit"
                        className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                      >
                        {c.reminder.del}
                      </button>
                    </form>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* 提案 */}
      <section className={`${SEC.proposals.card} mt-6`}>
        <SecHead s={SEC.proposals} title={c.detail.proposalsTitle} />

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
      <section className={`${SEC.agenda.card} mt-6`}>
        <SecHead
          s={SEC.agenda}
          title={c.detail.agendaTitle}
          right={
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[12rem] text-right font-sans text-caption text-meta rd:block">
                {c.detail.agendaHint}
              </span>
              <PrintButton heading="" body={agendaText} label={c.notice.pdf} filename={`${m.name} 議程`} />
            </div>
          }
        />
        <div className="mt-4">
          <CopyBlock text={agendaText} label={c.detail.agendaTitle} />
        </div>
      </section>

      {/* 開會通知 / 會議通知 */}
      <section id="notice" className={`${SEC.notice.card} mt-6 scroll-mt-20`}>
        <SecHead s={SEC.notice} title={c.detail.noticeTitle} />
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

          <div className="mt-4 grid gap-3 hero:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="n-aud" className="font-sans text-caption font-medium text-ink">
                {c.notice.audience}
              </label>
              <Input id="n-aud" name="audience" defaultValue="議員代表" placeholder={c.notice.audiencePlaceholder} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="n-signer" className="font-sans text-caption font-medium text-ink">
                {c.notice.signer}
              </label>
              <Input id="n-signer" name="signer" placeholder={c.notice.signerPlaceholder} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="n-phone" className="font-sans text-caption font-medium text-ink">
                {c.notice.contactPhone}
              </label>
              <Input id="n-phone" name="contactPhone" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="n-email" className="font-sans text-caption font-medium text-ink">
                {c.notice.contactEmail}
              </label>
              <Input id="n-email" name="contactEmail" type="email" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-sans text-caption font-medium text-ink">{c.notice.recipients}</p>
              <a
                href="/console/meetings/recipients"
                target="_blank"
                rel="noreferrer"
                className="font-ui text-chip text-accent hover:underline"
              >
                {c.notice.manageRecipients}
              </a>
            </div>
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
                      <div className="flex flex-wrap gap-2">
                        <CopyButton text={n.subject} label={c.notice.copySubject} />
                        <CopyButton text={n.bodyText} label={c.notice.copyBody} />
                        {emails ? <CopyButton text={emails} label={c.notice.copyRecipients} /> : null}
                        <PrintButton heading={n.subject} body={n.bodyText} label={c.notice.pdf} filename={n.subject} />
                        <form action={deleteNotice}>
                          <input type="hidden" name="id" value={n.id} />
                          <input type="hidden" name="meetingId" value={m.id} />
                          <button
                            type="submit"
                            className="border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-meta transition-colors hover:border-warn-border hover:text-warn-ink"
                          >
                            {c.notice.del}
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="font-sans text-caption font-medium text-ink">{c.notice.subject}</p>
                      <p className="mt-0.5 font-sans text-body text-ink">{n.subject}</p>
                      <details className="mt-3">
                        <summary className="cursor-pointer font-sans text-caption font-medium text-accent">
                          {c.notice.body}
                        </summary>
                        <pre className="mt-1.5 max-h-[24rem] overflow-auto whitespace-pre-wrap break-words border border-line-soft bg-paper2 p-2.5 font-sans text-body leading-relaxed text-ink">
                          {n.bodyText}
                        </pre>
                      </details>
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
      <section className={`${SEC.files.card} mt-6`}>
        <SecHead
          s={SEC.files}
          title={c.detail.filesTitle}
          right={filesList ? <CopyButton text={filesList} label={c.files.copyAll} /> : undefined}
        />
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
