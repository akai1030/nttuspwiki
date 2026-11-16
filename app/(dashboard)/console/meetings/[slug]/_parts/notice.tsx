import { CopyButton } from "@/components/CopyBlock";
import { PrintButton } from "@/components/PrintButton";
import { Input } from "@/components/SearchBox";
import { formatAddressList, formatEmailList } from "@/lib/meetings/recipients";
import { noticePreviewDoc, type NoticeKind } from "@/lib/meetings/notice";
import { rocDateTimeFull } from "@/lib/meetings/roc";
import { copy } from "@/lib/copy";
import { generateNoticeAction, deleteNotice } from "../../actions";
import { btnSolid, summaryCls, type MeetingFull } from "./shell";

const c = copy.meetings;
const n = c.notice;
const ns = c.noticeStep;

type Recipient = { id: string; name: string; email: string; roleTag: string };

/** 產生開會通知單（第 2 步）或會議通知含議程（第 3 步）。不常改的欄位收在 <details>。 */
export function NoticeForm({
  m,
  kind,
  recipients,
}: {
  m: MeetingFull;
  kind: NoticeKind;
  recipients: Recipient[];
}) {
  const id = (s: string) => `${kind}-${s}`;
  return (
    <form action={generateNoticeAction} className="flex flex-col gap-3">
      <input type="hidden" name="meetingId" value={m.id} />
      <input type="hidden" name="kind" value={kind} />

      <label className="flex items-start gap-2 font-sans text-body text-ink">
        <input type="checkbox" name="includeVoteUrl" value="1" defaultChecked className="mt-1.5 h-4 w-4 shrink-0" />
        {c.vote.noticeVoteUrl}
      </label>

      <details className="border border-line-soft px-3 py-2">
        <summary className={summaryCls}>{ns.recipientsSummary(recipients.length)}</summary>
        {recipients.length === 0 ? (
          <p className="mt-2 font-sans text-caption text-meta">
            {n.noRecipients}{" "}
            <a href="/console/meetings/recipients" className="text-accent hover:underline">
              {n.manageRecipients}
            </a>
          </p>
        ) : (
          <div className="mt-2 grid gap-1.5 hero:grid-cols-3">
            {recipients.map((r) => (
              <label key={r.id} className="flex items-center gap-2 font-sans text-caption text-ink">
                <input type="checkbox" name="recipientIds" value={r.id} defaultChecked className="h-4 w-4" />
                <span className="text-meta">{r.roleTag}</span> {r.name}
              </label>
            ))}
          </div>
        )}
      </details>

      <details className="border border-line-soft px-3 py-2">
        <summary className={summaryCls}>{ns.senderSummary}</summary>
        <div className="mt-3 grid gap-3 hero:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("aud")} className="font-sans text-caption font-medium text-ink">
              {n.audience}
            </label>
            <Input id={id("aud")} name="audience" defaultValue="議員代表" placeholder={n.audiencePlaceholder} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("signer")} className="font-sans text-caption font-medium text-ink">
              {n.signer}
            </label>
            <Input id={id("signer")} name="signer" placeholder={n.signerPlaceholder} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("phone")} className="font-sans text-caption font-medium text-ink">
              {n.contactPhone}
            </label>
            <Input id={id("phone")} name="contactPhone" inputMode="tel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("email")} className="font-sans text-caption font-medium text-ink">
              {n.contactEmail}
            </label>
            <Input id={id("email")} name="contactEmail" type="email" />
          </div>
        </div>
      </details>

      <details className="border border-line-soft px-3 py-2">
        <summary className={summaryCls}>{ns.prefixSummary}</summary>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor={id("prefix")} className="font-sans text-caption font-medium text-ink">
            {n.subjectPrefix}
          </label>
          <Input id={id("prefix")} name="subjectPrefix" placeholder={n.subjectPrefixPlaceholder} />
          <p className="font-sans text-caption text-meta">{n.subjectPrefixHint}</p>
        </div>
      </details>

      <div>
        <button type="submit" className={btnSolid}>
          {n.generate}
        </button>
      </div>
    </form>
  );
}

/** 已產生的通知：寄出要用的按鈕排在最前面，內文、收件人、格式預覽收起來。 */
export function NoticeList({
  m,
  kind,
  recipientMap,
}: {
  m: MeetingFull;
  kind: NoticeKind;
  recipientMap: Map<string, Recipient>;
}) {
  const list = m.notices.filter((x) => x.kind === kind);
  if (list.length === 0) return <p className="font-sans text-caption text-meta">{n.none}</p>;

  return (
    <>
      <p className="font-sans text-caption text-meta">{ns.howToSend}</p>
      <ul className="mt-3 flex flex-col gap-4">
        {list.map((x) => {
          const ids = Array.isArray(x.recipientIds) ? (x.recipientIds as string[]) : [];
          const picked = ids.map((i) => recipientMap.get(i)).filter((r): r is Recipient => Boolean(r));
          const addressList = formatAddressList(picked);
          const emailList = formatEmailList(picked);
          const missing = ids.length - picked.length;
          return (
            <li key={x.id} className="border border-line-soft">
              <div className="border-b border-line-soft bg-paper2 px-3 py-2">
                <p className="font-sans text-body text-ink">{x.subject}</p>
                <p className="mt-0.5 font-sans text-caption text-meta">
                  {rocDateTimeFull(x.createdAt)}・{n.recipientsSent} {picked.length}
                  {missing > 0 ? `／${ids.length}` : ""}
                </p>
              </div>
              <div className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {emailList ? (
                    <a
                      href={`https://mail.google.com/mail/u/0/?fs=1&tf=cm&bcc=${encodeURIComponent(
                        emailList
                      )}&su=${encodeURIComponent(x.subject)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={btnSolid}
                    >
                      {n.openInGmail} ↗
                    </a>
                  ) : null}
                  <CopyButton text={x.bodyText} html={x.bodyHtml ?? undefined} label={n.copyBody} />
                  <CopyButton text={x.subject} label={n.copySubject} />
                  <PrintButton heading={x.subject} body={x.bodyText} label={n.pdf} filename={x.subject} />
                  <form action={deleteNotice} className="ml-auto">
                    <input type="hidden" name="id" value={x.id} />
                    <input type="hidden" name="meetingId" value={m.id} />
                    <button
                      type="submit"
                      className="font-ui text-caption text-meta transition-colors hover:text-warn-ink"
                    >
                      {n.del}
                    </button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className={summaryCls}>{n.body}</summary>
                  <pre className="mt-1.5 max-h-96 overflow-auto whitespace-pre-wrap break-words border border-line-soft bg-paper2 p-2.5 font-sans text-body leading-relaxed text-ink">
                    {x.bodyText}
                  </pre>
                </details>

                {addressList ? (
                  <details className="mt-2">
                    <summary className={summaryCls}>
                      {n.recipientsSent}（{picked.length}）
                    </summary>
                    <p className="mt-1.5 break-words font-sans text-caption text-meta">{addressList}</p>
                    {missing > 0 ? (
                      <p className="mt-1 font-sans text-caption text-meta">{n.recipientsMissing(missing)}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <CopyButton text={addressList} label={n.copyRecipients} />
                      <CopyButton text={emailList} label={n.copyRecipientsPlain} />
                    </div>
                    <p className="mt-1.5 font-sans text-caption text-meta">{n.openInGmailHint}</p>
                  </details>
                ) : null}

                {x.bodyHtml ? (
                  <details className="mt-2">
                    <summary className={summaryCls}>{n.previewRich}</summary>
                    <p className="mt-1.5 font-sans text-caption text-meta">{n.richHint}</p>
                    <div className="mt-1.5">
                      <CopyButton text={x.bodyText} label={n.copyBodyPlain} />
                    </div>
                    <iframe
                      title={n.previewRich}
                      srcDoc={noticePreviewDoc(x.bodyHtml)}
                      sandbox=""
                      className="mt-1.5 h-96 w-full border border-line-soft bg-white"
                    />
                  </details>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

