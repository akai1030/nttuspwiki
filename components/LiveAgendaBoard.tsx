import { copy } from "@/lib/copy";
import { citeOf, ruleById } from "@/lib/meetings/vote-rules";
import { evaluate } from "@/lib/meetings/tally";
import type { LiveMeeting } from "@/lib/meetings/queries";
import type { VoteView } from "@/lib/meetings/vote-queries";
import { VoteOpenCard, VoteResultCard } from "@/components/VoteBlocks";

const c = copy.meetings.live;
const v = copy.meetings.voteRule;

/**
 * 現場議事看板 — 祕書／議長與與會人看到的是同一塊，資料同源。
 *
 * 只呈現伺服器上的狀態，不自己推進任何東西：
 * 進到哪一案、出席幾人，都是主席／祕書在中控台按下去才會變（人工操控）。
 * 沒有倒數計時，也不依時鐘推算議程進度。
 */
export function LiveAgendaBoard({ m, votes = [] }: { m: LiveMeeting; votes?: VoteView[] }) {
  const current = m.proposals.find((p) => p.id === m.liveProposalId) ?? null;
  const openVote = votes.find((x) => x.status === "open") ?? null;
  // 看板只放最近三次結果；完整紀錄在議事公開頁。
  const recent = votes.filter((x) => x.status === "closed").slice(0, 3);
  const rule = ruleById(current?.matterType);
  const attendance = { present: m.livePresent ?? undefined, total: m.liveTotal ?? undefined };

  return (
    <div className="flex flex-col gap-4">
      {/* 主席公告 */}
      {m.liveNote?.trim() ? (
        <div className="border border-warn-border bg-warn-surface px-3.5 py-2.5">
          <p className="font-ui text-chip text-warn-ink">{c.note}</p>
          <p className="mt-0.5 whitespace-pre-wrap font-sans text-body text-warn-ink">
            {m.liveNote.trim()}
          </p>
        </div>
      ) : null}

      {/* 線上表決：投票中只有進度，截止後才有票數 */}
      {openVote ? (
        <div>
          <VoteOpenCard vote={openVote} />
          <a href="/vote" target="_blank" rel="noreferrer" className="mt-1.5 inline-block font-sans text-body text-accent hover:underline">
            {copy.meetings.vote.boardVoteLink}
          </a>
        </div>
      ) : null}

      {/* 點名結果 */}
      <div className="border border-line bg-paper2 px-3.5 py-2.5">
        <p className="font-ui text-chip text-meta">{c.attendance}</p>
        {m.livePresent == null && m.liveTotal == null ? (
          <p className="mt-0.5 font-sans text-body text-meta">{c.attendanceNone}</p>
        ) : (
          <>
            <p className="mt-0.5 font-sans text-body text-ink">
              {v.present}
              <strong className="tnum mx-1">{m.livePresent ?? "—"}</strong>
              {m.liveTotal != null ? (
                <>
                  <span className="mx-1.5 text-line">·</span>
                  {v.totalMembers}
                  <strong className="tnum mx-1">{m.liveTotal}</strong>
                </>
              ) : null}
            </p>
            {m.liveTotalBasis ? (
              <p className="mt-0.5 font-sans text-caption text-meta">
                {c.totalBasis}：{c.totalBasisLabel[m.liveTotalBasis as "2.3-4-2" | "2.0-13-1"] ?? m.liveTotalBasis}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* 現在討論到哪一案 */}
      <div className="border border-line border-l-[3px] border-l-accent bg-paper p-card">
        <p className="font-ui text-chip uppercase tracking-kicker text-accent">{c.current}</p>
        {current ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5">
              <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
                附件{current.serialNo}
              </span>
              <span className="shrink-0 font-ui text-chip text-accent">{current.section}</span>
            </div>
            <h2 className="mt-1.5 font-serif text-h4 text-ink">{current.title}</h2>
            {current.proposer ? (
              <p className="mt-1 font-sans text-caption text-meta">
                {copy.meetings.proposal.proposer}：{current.proposer}
              </p>
            ) : null}
            {current.explanation?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap font-sans text-body leading-relaxed text-ink">
                {current.explanation.trim()}
              </p>
            ) : null}

            {/* 該案的法定表決方式與所需票數 */}
            {rule ? (
              <div className="mt-3 border-t border-line-soft pt-2.5">
                <p className="font-sans text-caption text-ink">
                  <span className="text-meta">{v.method}：</span>
                  {rule.method ?? rule.methodNote ?? v.unspecified}
                  <span className="mx-1.5 text-line">·</span>
                  <span className="text-meta">{v.threshold}：</span>
                  {rule.threshold ?? rule.thresholdNote ?? v.unspecified}
                </p>
                <p className="mt-0.5 font-ui text-chip text-meta">{citeOf(rule)}</p>
                {(rule.thresholdRules ?? []).map((t, i) => {
                  const o = evaluate(t, attendance);
                  return (
                    <p key={i} className="mt-0.5 font-sans text-caption">
                      {t.label ? <span className="text-meta">{t.label}　</span> : null}
                      {o.kind === "votes" ? (
                        <span className="text-ink">
                          {v.need}
                          <strong className="tnum">{o.need}</strong>
                          {v.votesOf(o.base === "total" ? v.totalMembers : v.present, o.of)}
                        </span>
                      ) : o.kind === "missing" ? (
                        <span className="text-meta">
                          {v.needInput(o.base === "total" ? v.totalMembers : v.present)}
                        </span>
                      ) : (
                        <span className="text-warn-ink">
                          {v.cannotCompute}：{o.reason}
                        </span>
                      )}
                    </p>
                  );
                })}
                {rule.conflict ? (
                  <p className="mt-1 border border-warn-border bg-warn-surface px-2 py-1 font-sans text-caption text-warn-ink">
                    {v.conflict}：{rule.conflict}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-line-soft pt-2.5 font-sans text-caption text-meta">
                {c.noRule}
              </p>
            )}

            {current.resolution?.trim() ? (
              <p className="mt-2.5 whitespace-pre-wrap border-t border-line-soft pt-2.5 font-sans text-body text-ink">
                <span className="text-meta">{copy.meetings.proposal.resolution}：</span>
                {current.resolution.trim()}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-1.5 font-sans text-body text-meta">{c.currentNone}</p>
        )}
      </div>

      {recent.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="font-ui text-chip uppercase tracking-kicker text-meta">{copy.meetings.vote.history}</p>
          {recent.map((rv) => (
            <VoteResultCard key={rv.id} vote={rv} rule={ruleById(rv.matterType)} totalMembers={m.liveTotal} />
          ))}
        </div>
      ) : null}

      {/* 議程全覽，標出目前位置 */}
      <div className="border border-line bg-paper p-card">
        <p className="font-ui text-chip uppercase tracking-kicker text-meta">{c.agenda}</p>
        {m.proposals.length === 0 ? (
          <p className="mt-2 font-sans text-caption text-meta">{copy.meetings.proposal.empty}</p>
        ) : (
          <ol className="mt-2 flex flex-col">
            {m.proposals.map((p) => {
              const active = p.id === m.liveProposalId;
              return (
                <li
                  key={p.id}
                  aria-current={active ? "step" : undefined}
                  className={`flex flex-wrap items-baseline gap-x-2 border-l-2 py-1.5 pl-2.5 font-sans text-caption ${
                    active ? "border-l-accent text-ink" : "border-l-line-soft text-meta"
                  }`}
                >
                  <span className="tnum shrink-0">附件{p.serialNo}</span>
                  <span className="shrink-0 font-ui text-chip">{p.section}</span>
                  <span className="min-w-0 flex-1">{p.title}</span>
                  {p.resolution?.trim() ? (
                    <span className="shrink-0 font-ui text-chip text-accent">{c.done}</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
