import { copy } from "@/lib/copy";
import { citeOf, type VoteRule } from "@/lib/meetings/vote-rules";
import { evaluate } from "@/lib/meetings/tally";
import { methodLabel } from "@/lib/meetings/voting";
import type { VoteView } from "@/lib/meetings/vote-queries";

const c = copy.meetings.vote;
const v = copy.meetings.voteRule;

function Head({ vote }: { vote: VoteView }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span
        className={`shrink-0 border px-2 py-0.5 font-ui text-chip leading-none ${
          vote.status === "open" ? "border-accent text-accent" : "border-line-soft text-meta"
        }`}
      >
        {c.status[vote.status]}
      </span>
      <span className="shrink-0 font-ui text-chip text-accent">{methodLabel(vote.secret)}</span>
      {vote.kind === "election" && vote.seats ? (
        <span className="shrink-0 font-ui text-chip text-meta">{c.seatsOf(vote.seats)}</span>
      ) : null}
      <span className="min-w-0 basis-full font-sans text-body font-medium text-ink">{vote.title}</span>
    </div>
  );
}

/** 投票中：只有進度，沒有票數。pendingNames 只有後台會傳。 */
export function VoteOpenCard({ vote, pendingNames }: { vote: VoteView; pendingNames?: string[] | null }) {
  return (
    <div className="border border-accent bg-paper p-card" role="status">
      <Head vote={vote} />
      <p className="mt-2 font-sans text-body text-ink">
        <strong className="tnum">{c.progress(vote.castCount, vote.eligibleCount)}</strong>
      </p>
      <p className="mt-0.5 font-sans text-caption text-meta">{c.hiddenWhileOpen}</p>
      {pendingNames && pendingNames.length > 0 ? (
        <p className="mt-2 font-sans text-caption text-meta">
          <span className="text-ink">{c.pending}：</span>
          {pendingNames.join("、")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 截止後的結果。rule 有給（議案有類型）就在同意票旁換算門檻，但不宣告通過與否。
 * 門檻分母用開票當下的出席名單人數，與實際可投票的人一致。
 */
export function VoteResultCard({
  vote,
  rule,
  totalMembers,
}: {
  vote: VoteView;
  rule?: VoteRule | null;
  totalMembers?: number | null;
}) {
  const s = vote.summary;
  if (!s) return null;
  const options =
    vote.kind === "election" ? [...s.options].sort((a, b) => b.count - a.count || a.order - b.order) : s.options;
  const max = Math.max(1, ...options.map((o) => o.count));
  const thresholds =
    vote.kind === "motion" && rule
      ? (rule.thresholdRules ?? []).map((t) => ({
          t,
          o: evaluate(t, { present: s.eligible, total: totalMembers ?? undefined }),
        }))
      : [];

  return (
    <div className={`border bg-paper p-card ${vote.status === "voided" ? "border-line-soft opacity-70" : "border-line"}`}>
      <Head vote={vote} />
      <ul className="mt-3 flex flex-col gap-1.5">
        {options.map((o) => (
          <li key={o.id} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-x-2.5">
            <span className="truncate font-sans text-body text-ink">{o.label}</span>
            <span className="h-2 bg-paper2" aria-hidden>
              <span className="block h-2 bg-accent" style={{ width: `${(o.count / max) * 100}%` }} />
            </span>
            <span className="tnum font-sans text-body font-medium text-ink">{c.votes(o.count)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-sans text-caption text-meta">
        {c.present} <span className="tnum">{c.people(s.eligible)}</span>
        <span className="mx-1.5 text-line">·</span>
        {c.notVoted} <span className="tnum">{c.people(s.notVoted)}</span>
      </p>

      {thresholds.length > 0 ? (
        <div className="mt-2 border-t border-line-soft pt-2">
          {thresholds.map(({ t, o }, i) => (
            <p key={i} className="font-sans text-caption text-ink">
              {t.label ? <span className="text-meta">{t.label}　</span> : null}
              {o.kind === "votes" ? (
                <>
                  {v.need}
                  <strong className="tnum">{o.need}</strong>
                  {v.votesOf(o.base === "total" ? v.totalMembers : v.present, o.of)}
                </>
              ) : o.kind === "missing" ? (
                <span className="text-meta">{v.needInput(o.base === "total" ? v.totalMembers : v.present)}</span>
              ) : (
                <span className="text-warn-ink">
                  {v.cannotCompute}：{o.reason}
                </span>
              )}
            </p>
          ))}
          {rule ? <p className="mt-0.5 font-ui text-chip text-meta">{citeOf(rule)}</p> : null}
        </div>
      ) : null}

      {vote.named ? (
        <div className="mt-2 border-t border-line-soft pt-2">
          <p className="font-ui text-chip text-meta">{c.namedList}</p>
          <dl className="mt-1 flex flex-col gap-1">
            {vote.named.map((n) => (
              <div key={n.label} className="flex flex-wrap gap-x-2 font-sans text-caption">
                <dt className="shrink-0 font-medium text-ink">{n.label}</dt>
                <dd className="text-ink">{n.names.length ? n.names.join("、") : "—"}</dd>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-2 font-sans text-caption">
              <dt className="shrink-0 font-medium text-meta">{c.notVoted}</dt>
              <dd className="text-meta">{vote.notVotedNames?.length ? vote.notVotedNames.join("、") : "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {!s.consistent ? (
        <p className="mt-2 border border-warn-border bg-warn-surface px-2 py-1 font-sans text-caption text-warn-ink">
          {c.consistencyBad}
        </p>
      ) : null}
    </div>
  );
}
