import { AgendaSectionField } from "@/components/AgendaSectionField";
import { CopyBlock, CopyButton } from "@/components/CopyBlock";
import { PrintButton } from "@/components/PrintButton";
import { Input } from "@/components/SearchBox";
import { buildAgendaText } from "@/lib/meetings/agenda";
import { attachmentBaseName, attachmentNameList } from "@/lib/meetings/attachments";
import { rocDate } from "@/lib/meetings/roc";
import { AGENDA_SECTIONS } from "@/lib/meetings/sections";
import { agendaMilestones } from "@/lib/meetings/steps";
import { ruleById, rulesForKind } from "@/lib/meetings/vote-rules";
import { copy } from "@/lib/copy";
import { addProposal, deleteProposal, setProposalReview } from "../../actions";
import { NoticeForm, NoticeList } from "./notice";
import { Block, btnSolid, field, meetingTimeline, relDays, summaryCls, type MeetingFull } from "./shell";

const c = copy.meetings;
const p = c.proposal;
const a = c.agendaStep;

type Recipient = { id: string; name: string; email: string; roleTag: string };

const REVIEW_LABEL: Record<string, string> = {
  pending: p.reviewPending,
  passed: p.reviewPassed,
  rejected: p.reviewRejected,
};

/** 第 3 步　提案與議程：提案清單（審核收起來）、議程、寄會議通知（含議程）。 */
export function AgendaStep({
  m,
  recipients,
  recipientMap,
}: {
  m: MeetingFull;
  recipients: Recipient[];
  recipientMap: Map<string, Recipient>;
}) {
  const now = new Date();
  const dates = agendaMilestones(meetingTimeline(m));
  const agendaText = buildAgendaText(
    { session: m.session, name: m.name, meetingAt: m.meetingAt, location: m.location, meetingUrl: m.meetingUrl },
    m.proposals
  );
  const withFiles = m.proposals.filter((x) => x.fileUrl?.trim());
  const filesList = withFiles.map((x) => `附件${x.serialNo}｜${x.title}：${x.fileUrl}`).join("\n");

  return (
    <>
      <ul className="mt-4 grid gap-2 hero:grid-cols-3">
        {dates.map((d) => (
          <li key={d.key} className="border border-line-soft px-3 py-2">
            <p className="font-sans text-caption text-meta">{d.title}</p>
            <p className="font-sans text-body tnum text-ink">{rocDate(d.date)}</p>
            <p className="font-sans text-caption text-accent">{relDays(now, d.date)}</p>
          </li>
        ))}
      </ul>

      <Block
        title={`${c.detail.proposalsTitle}（${m.proposals.length}）`}
        right={
          m.proposals.length > 0 ? (
            <CopyButton text={attachmentNameList(m.proposals)} label={p.copyAllFileNames} />
          ) : undefined
        }
      >
        <p className="max-w-reader font-sans text-caption text-meta">{a.proposalsLead}</p>

        {m.proposals.length === 0 ? (
          <p className="mt-3 font-sans text-body text-meta">{p.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            {m.proposals.map((x) => {
              const rule = ruleById(x.matterType);
              const fileName = attachmentBaseName(x.serialNo, x.title);
              return (
                <li key={x.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="shrink-0 border border-line-soft px-2 py-0.5 font-sans text-caption leading-none text-meta">
                      附件{x.serialNo}
                    </span>
                    <span className="shrink-0 font-sans text-caption text-accent">{x.section}</span>
                    <span
                      className={
                        "shrink-0 font-sans text-caption " +
                        (x.reviewStatus === "rejected"
                          ? "text-warn-ink"
                          : x.reviewStatus === "passed"
                            ? "text-ink"
                            : "text-meta")
                      }
                    >
                      {p.review}：{REVIEW_LABEL[x.reviewStatus] ?? x.reviewStatus}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-body text-ink">{x.title}</p>
                  <p className="font-sans text-caption text-meta">
                    {[x.proposer, rule ? rule.matter : null].filter(Boolean).join("・")}
                  </p>

                  <details className="mt-1.5">
                    <summary className={summaryCls}>{a.editSummary}</summary>
                    <form action={setProposalReview} className="mt-2 grid gap-3 hero:grid-cols-3 hero:items-end">
                      <input type="hidden" name="id" value={x.id} />
                      <label className="flex flex-col gap-1 font-sans text-caption text-meta">
                        {p.review}
                        <select name="reviewStatus" defaultValue={x.reviewStatus} className={field}>
                          <option value="pending">{p.reviewPending}</option>
                          <option value="passed">{p.reviewPassed}</option>
                          <option value="rejected">{p.reviewRejected}</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 font-sans text-caption text-meta">
                        {p.matterType}
                        <select name="matterType" defaultValue={x.matterType ?? ""} className={`w-full ${field}`}>
                          <option value="">{p.matterTypeNone}</option>
                          {rulesForKind(m.kind)
                            .filter((r) => r.sections.includes(x.section))
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.matter}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 font-sans text-caption text-meta">
                        {p.order}
                        <input name="order" type="number" defaultValue={x.order} className={`w-24 ${field}`} />
                      </label>
                      <div className="hero:col-span-3">
                        <button type="submit" className={btnSolid}>
                          {p.reviewSave}
                        </button>
                      </div>
                    </form>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-sans text-caption text-meta">{p.fileName}</span>
                      <code className="min-w-0 break-all font-sans text-caption text-ink">{fileName}</code>
                      <CopyButton text={fileName} label={p.copyFileName} />
                    </div>
                    {x.fileUrl?.trim() ? (
                      <a
                        href={x.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all font-sans text-caption text-accent hover:underline"
                      >
                        {x.fileUrl}
                      </a>
                    ) : null}
                    <form action={deleteProposal} className="mt-2">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="meetingId" value={m.id} />
                      <button type="submit" className="font-sans text-caption text-meta hover:text-warn-ink">
                        {p.delete}
                      </button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 font-sans text-caption text-meta">{a.reviewLaw}</p>

        <details className="mt-4 border border-line-soft px-3 py-2" open={m.proposals.length === 0}>
          <summary className={summaryCls}>{a.addSummary}</summary>
          <form action={addProposal} className="mt-3 grid gap-3 hero:grid-cols-2">
            <input type="hidden" name="meetingId" value={m.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-serial" className="font-sans text-caption font-medium text-ink">
                {p.serialNo}
              </label>
              <Input id="p-serial" name="serialNo" type="number" defaultValue={m.proposals.length + 2} />
            </div>
            <AgendaSectionField rules={rulesForKind(m.kind)} sections={AGENDA_SECTIONS} defaultSection="討論事項" />
            <div className="flex flex-col gap-1.5 hero:col-span-2">
              <label htmlFor="p-title" className="font-sans text-caption font-medium text-ink">
                {p.title}
              </label>
              <Input id="p-title" name="title" required placeholder={p.titlePlaceholder} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-proposer" className="font-sans text-caption font-medium text-ink">
                {p.proposer}
              </label>
              <Input id="p-proposer" name="proposer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-file" className="font-sans text-caption font-medium text-ink">
                {p.fileUrl}
              </label>
              <Input id="p-file" name="fileUrl" placeholder={p.fileUrlPlaceholder} />
            </div>
            <div className="flex flex-col gap-1.5 hero:col-span-2">
              <label htmlFor="p-exp" className="font-sans text-caption font-medium text-ink">
                {p.explanation}
              </label>
              <textarea
                id="p-exp"
                name="explanation"
                rows={3}
                className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink placeholder:text-meta focus:border-accent"
              />
            </div>
            <div className="hero:col-span-2">
              <button type="submit" className={btnSolid}>
                {p.add}
              </button>
            </div>
          </form>
        </details>
      </Block>

      {withFiles.length > 0 ? (
        <Block title={a.filesTitle} right={<CopyButton text={filesList} label={c.files.copyAll} />}>
          <ul className="divide-y divide-line-soft">
            {withFiles.map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline gap-x-3 py-2 font-sans text-caption">
                <span className="text-meta">附件{x.serialNo}</span>
                <span className="text-ink">{x.title}</span>
                <a href={x.fileUrl!} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
                  {x.fileUrl}
                </a>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block
        title={c.detail.agendaTitle}
        right={<PrintButton heading="" body={agendaText} label={c.notice.pdf} filename={`${m.name} 議程`} />}
      >
        <p className="mb-3 font-sans text-caption text-meta">{a.agendaHint}</p>
        <CopyBlock text={agendaText} label={c.detail.agendaTitle} />
      </Block>

      <Block title={c.noticeStep.formAgenda} id="agenda-notice">
        <p className="mb-3 font-sans text-caption text-meta">{c.noticeStep.agendaFirst}</p>
        <NoticeForm m={m} kind="agenda" recipients={recipients} />
      </Block>

      <Block title={c.noticeStep.listAgenda}>
        <NoticeList m={m} kind="agenda" recipientMap={recipientMap} />
      </Block>
    </>
  );
}

