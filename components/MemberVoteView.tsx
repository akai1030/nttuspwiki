import { copy } from "@/lib/copy";
import { meetingKey } from "@/lib/meetings/slug";
import { methodLabel } from "@/lib/meetings/voting";
import type { MemberContext } from "@/lib/meetings/vote-queries";
import { BallotForm } from "@/components/BallotForm";
import { VoteResultCard } from "@/components/VoteBlocks";

const c = copy.meetings.vote.member;
const vt = copy.meetings.vote;

/**
 * 議員登入後看到的表決畫面。專屬連結頁（/v/…）與共用投票頁（/vote）共用。
 * token：專屬連結傳 token；/vote 傳 null，投票時伺服器改讀登入 cookie。
 */
export function MemberVoteView({
  ctx,
  token,
}: {
  ctx: Exclude<MemberContext, { state: "invalid" }>;
  token: string | null;
}) {
  if (ctx.state === "noMeeting") return <p className="mt-6 font-sans text-body text-meta">{c.noMeeting}</p>;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-line-soft pb-2">
        <p className="font-sans text-body font-medium text-ink">{ctx.meeting.name}</p>
        <a
          href={`/meetings/${meetingKey(ctx.meeting)}/live`}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-caption text-accent hover:underline"
        >
          {c.liveBoard}
        </a>
      </div>

      <section className="mt-5" aria-live="polite">
        {!ctx.open ? (
          <p className="font-sans text-body text-meta">{c.waiting}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-ui text-chip text-accent">
                {methodLabel(ctx.open.secret)}
                {ctx.open.kind === "election" && ctx.open.seats ? `・${vt.seatsOf(ctx.open.seats)}` : ""}
              </p>
              <h2 className="mt-1 font-serif text-h4 text-ink">{ctx.open.title}</h2>
            </div>
            {!ctx.open.eligible ? (
              <p className="border border-warn-border bg-warn-surface px-3 py-2 font-sans text-body text-warn-ink">
                {c.notEligible}
              </p>
            ) : ctx.open.voted ? (
              <div className="border border-accent bg-paper p-card">
                <p className="font-sans text-body font-medium text-ink">{c.voted}</p>
                <p className="mt-1 font-sans text-caption text-meta">
                  {ctx.open.secret ? c.votedSecret : c.votedNamed(ctx.open.myChoice ?? "")}
                </p>
                <p className="mt-1 font-sans text-caption text-meta">{vt.hiddenWhileOpen}</p>
              </div>
            ) : (
              <BallotForm key={ctx.open.id} token={token} voteId={ctx.open.id} options={ctx.open.options} />
            )}
          </div>
        )}
      </section>

      {ctx.lastClosed ? (
        <section className="mt-8">
          <p className="mb-2 font-ui text-chip uppercase tracking-kicker text-meta">{c.lastResult}</p>
          <VoteResultCard vote={ctx.lastClosed} />
        </section>
      ) : null}
    </>
  );
}
