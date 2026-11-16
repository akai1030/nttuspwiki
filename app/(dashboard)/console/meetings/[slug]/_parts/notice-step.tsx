import { phoneLast4 } from "@/lib/meetings/voter-login";
import { copy } from "@/lib/copy";
import { setMeetingStatus } from "../../actions";
import { NoticeForm, NoticeList } from "./notice";
import { Block, btnSolid, type MeetingFull } from "./shell";

const c = copy.meetings;
const prep = c.vote.prep;
const ns = c.noticeStep;

type Recipient = {
  id: string;
  name: string;
  email: string;
  roleTag: string;
  session: number;
  studentId: string | null;
  phone: string | null;
};

/** 第 2 步　寄開會通知：線上表決準備、產生開會通知單、已產生的通知、標記已寄出。 */
export function NoticeStep({
  m,
  recipients,
  recipientMap,
}: {
  m: MeetingFull;
  recipients: Recipient[];
  recipientMap: Map<string, Recipient>;
}) {
  const voters = recipients.filter((r) => r.roleTag === "議員" && r.session === m.session);
  const cannotLogin = voters.filter((r) => !r.studentId?.trim() || !phoneLast4(r.phone));
  const latest = m.notices.find((x) => x.kind === "notice") ?? null;
  const hasVoteUrl = !!latest?.bodyText.includes("線上表決：");

  const checks = [
    {
      bad: !!latest && !hasVoteUrl,
      ok: hasVoteUrl,
      text: !latest ? prep.noticeNone : hasVoteUrl ? prep.noticeOk : prep.noticeMissing,
    },
    {
      bad: voters.length === 0 || cannotLogin.length > 0,
      ok: voters.length > 0 && cannotLogin.length === 0,
      text:
        voters.length === 0
          ? prep.noMembers
          : cannotLogin.length > 0
            ? prep.noPhone(cannotLogin.map((r) => r.name).join("、"))
            : prep.allPhone(voters.length),
    },
  ];

  return (
    <>
      <Block
        title={prep.title}
        right={
          <a href="/console/meetings/recipients" className="font-sans text-caption text-accent hover:underline">
            {prep.toRoster}
          </a>
        }
      >
        <ul className="flex flex-col gap-1.5">
          {checks.map((x, i) => (
            <li key={i} className="flex gap-2 font-sans text-body">
              <span aria-hidden className={x.bad ? "text-warn-ink" : x.ok ? "text-accent" : "text-meta"}>
                {x.bad ? "！" : x.ok ? "✓" : "・"}
              </span>
              <span className={x.bad ? "text-warn-ink" : "text-ink"}>{x.text}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={ns.formNotice}>
        <NoticeForm m={m} kind="notice" recipients={recipients} />
      </Block>

      <Block title={ns.listNotice}>
        <NoticeList m={m} kind="notice" recipientMap={recipientMap} />
      </Block>

      {latest ? (
        <div className="mt-8 border border-line bg-paper2 p-4">
          {m.status === "DRAFT" ? (
            <form action={setMeetingStatus} className="flex flex-col items-start gap-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="NOTICED" />
              <input type="hidden" name="next" value="agenda" />
              <p className="font-sans text-caption text-meta">{ns.markSentHint}</p>
              <button type="submit" className={btnSolid}>
                {ns.markSent}
              </button>
            </form>
          ) : (
            <p className="font-sans text-body text-ink">{ns.sentAlready(c.status[m.status])}</p>
          )}
        </div>
      ) : null}
    </>
  );
}
