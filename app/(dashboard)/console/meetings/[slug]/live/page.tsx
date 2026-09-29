import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeetingByKey } from "@/lib/meetings/queries";
import { rocDateTimeFull } from "@/lib/meetings/roc";
import { meetingKey } from "@/lib/meetings/slug";
import { copy } from "@/lib/copy";
import { CopyButton } from "@/components/CopyBlock";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ruleById, citeOf } from "@/lib/meetings/vote-rules";
import { evaluate } from "@/lib/meetings/tally";
import {
  toggleMeetingLive,
  setLiveProposal,
  setLiveAttendance,
  setLiveNote,
  updateProposalResolution,
} from "../../actions";
import { openVote, closeVote, voidVote, applyVoteToResolution } from "../../vote-actions";
import { loadVoteViews, sessionMembers } from "@/lib/meetings/vote-queries";
import { idList, secretFromLawMethod } from "@/lib/meetings/voting";
import { VoteOpenCard, VoteResultCard } from "@/components/VoteBlocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.live.consoleTitle}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.live;
const v = copy.meetings.voteRule;
const vt = copy.meetings.vote;

const btn =
  "border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent";
const btnSolid =
  "border border-ink bg-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent";
const field =
  "rounded-sm border border-line bg-paper px-2.5 py-1.5 font-sans text-caption text-ink focus:border-accent";

/**
 * 現場議事控制台（祕書／議長）。
 *
 * 這頁的每一個按鈕都是人按下去才會動：宣告進入某案、登記點名、發布公告、開關現場頁。
 * 沒有倒數計時、沒有排程、不以時鐘推進議程 —— 伺服器存狀態，與會人的畫面只跟隨。
 */
export default async function LiveConsolePage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ voteError?: string }>;
}) {
  const params = await props.params;
  const { voteError } = await props.searchParams;
  await requireUser();
  const m = await getMeetingByKey(params.slug);
  if (!m) notFound();
  if (m.slug && m.slug !== params.slug) redirect(`/console/meetings/${m.slug}/live`);

  const key = meetingKey(m);
  const listed = m.proposals.filter((p) => p.reviewStatus !== "rejected");
  const shareUrl = `/meetings/${key}/live`;

  // 現在討論的那一案。決議與票數換算都在這裡完成 ——
  // 會中祕書就守在這一頁，不該為了記一句決議跳回提案頁。
  const current = listed.find((p) => p.id === m.liveProposalId) ?? null;
  const rule = ruleById(current?.matterType);
  // 出席人數已在上方點名區登記，換算直接沿用，不要求再填一次。
  const attendance = { present: m.livePresent ?? undefined, total: m.liveTotal ?? undefined };

  // 點名名冊與線上表決。
  const [members, votes] = await Promise.all([sessionMembers(m.session), loadVoteViews(m.id, "console")]);
  const attendees = new Set(idList(m.liveAttendeeIds));
  const openVoteView = votes.find((x) => x.status === "open") ?? null;
  const pastVotes = votes.filter((x) => x.status !== "open");
  const proposalTitle = new Map(m.proposals.map((p) => [p.id, p.title]));
  const lawSecret = secretFromLawMethod(rule?.method);

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href={`/console/meetings/${key}`} className="font-sans text-caption text-accent hover:underline">
        ← {m.name}
      </a>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-ui text-chip uppercase tracking-kicker text-accent">{c.consoleTitle}</p>
          <h1 className="mt-1 font-serif text-h2">{m.name}</h1>
          <p className="mt-1 font-sans text-caption text-meta">{rocDateTimeFull(m.meetingAt)}</p>
        </div>
        <AutoRefresh seconds={10} />
      </div>

      <p className="mt-3 font-sans text-caption text-meta">{c.lead}</p>

      {/* 開關與分享連結 */}
      <section className="mt-6 border border-line border-l-[3px] border-l-accent bg-paper p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-body font-medium text-ink">
            {m.liveOpen ? c.openState : c.closedState}
          </p>
          <form action={toggleMeetingLive}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" className={btnSolid}>
              {m.liveOpen ? c.close : c.open}
            </button>
          </form>
        </div>
        <p className="mt-2 font-sans text-caption text-meta">{c.closedHint}</p>
        {m.liveOpen ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-sans text-caption text-meta">{c.shareLink}</span>
            <code className="break-all font-sans text-caption text-ink">{shareUrl}</code>
            <CopyButton text={shareUrl} label={c.copyLink} />
            <a href={shareUrl} target="_blank" rel="noreferrer" className={btn}>
              {c.title} ↗
            </a>
          </div>
        ) : null}
        {m.liveUpdatedAt ? (
          <p className="mt-2 font-sans text-caption text-meta">
            {c.lastUpdated}：{rocDateTimeFull(m.liveUpdatedAt)}
          </p>
        ) : null}
      </section>

      {/* 點名：有名冊就勾選（出席名單同時是線上表決的可投票者），沒有名冊才填數字 */}
      <section className="mt-5 border border-line bg-paper p-card">
        <p className="font-sans text-body font-medium text-ink">{c.attendance}</p>
        <form action={setLiveAttendance} className="mt-3">
          <input type="hidden" name="id" value={m.id} />
          {members.length > 0 ? (
            <>
              <input type="hidden" name="rollcall" value="1" />
              <p className="font-sans text-caption text-meta">
                {c.rollCallHint}　
                <span className="text-ink">
                  {v.present} <strong className="tnum">{attendees.size}</strong>／{members.length}
                </span>
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 hero:grid-cols-4">
                {members.map((r) => (
                  <li key={r.id}>
                    <label className="flex items-center gap-2 py-1 font-sans text-body text-ink">
                      <input type="checkbox" name="attendee" value={r.id} defaultChecked={attendees.has(r.id)} className="h-4 w-4" />
                      {r.name}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            {members.length === 0 ? (
              <label className="font-sans text-caption text-meta">
                {v.present}
                <input
                  name="present"
                  type="number"
                  min={0}
                  defaultValue={m.livePresent ?? ""}
                  className={`ml-1.5 w-20 ${field}`}
                />
              </label>
            ) : null}
            <label className="font-sans text-caption text-meta">
              {v.totalMembers}
              <input
                name="total"
                type="number"
                min={0}
                defaultValue={m.liveTotal ?? ""}
                className={`ml-1.5 w-20 ${field}`}
              />
            </label>
            <label className="font-sans text-caption text-meta">
              {c.totalBasis}
              <select name="totalBasis" defaultValue={m.liveTotalBasis ?? ""} className={`ml-1.5 ${field}`}>
                <option value="">{c.totalBasisNone}</option>
                <option value="2.3-4-2">{c.totalBasisLabel["2.3-4-2"]}</option>
                <option value="2.0-13-1">{c.totalBasisLabel["2.0-13-1"]}</option>
              </select>
            </label>
            <button type="submit" className={btn}>
              {c.saveAttendance}
            </button>
          </div>
        </form>
        <p className="mt-2 font-sans text-caption text-meta">{c.totalBasisHint}</p>
      </section>

      {/* 主席公告 */}
      <section className="mt-5 border border-line bg-paper p-card">
        <p className="font-sans text-body font-medium text-ink">{c.note}</p>
        <form action={setLiveNote} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={m.id} />
          <input
            name="note"
            defaultValue={m.liveNote ?? ""}
            placeholder={c.notePlaceholder}
            className={`min-w-0 flex-1 ${field}`}
          />
          <button type="submit" className={btn}>
            {c.saveNote}
          </button>
        </form>
      </section>

      {/* 現在討論的議案：案由、法定表決方式、所需票數、決議 —— 一頁完成 */}
      <section className="mt-5 border border-line border-l-[3px] border-l-accent bg-paper p-card">
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

            {/* key：換案時表單重建。不重建的話 textarea 會留著上一案的決議（defaultValue 只在掛載時生效），
                此時按儲存會把上一案的決議寫進這一案。 */}
            <form key={current.id} action={updateProposalResolution} className="mt-3 border-t border-line-soft pt-2.5">
              <input type="hidden" name="id" value={current.id} />
              <label
                htmlFor={`live-res-${current.id}`}
                className="font-sans text-caption font-medium text-ink"
              >
                {copy.meetings.proposal.resolution}
              </label>
              <textarea
                id={`live-res-${current.id}`}
                name="resolution"
                rows={3}
                defaultValue={current.resolution ?? ""}
                placeholder={copy.meetings.proposal.resolutionPlaceholder}
                className="mt-1.5 w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink placeholder:text-meta focus:border-accent"
              />
              <button type="submit" className={`mt-2 ${btnSolid}`}>
                {copy.meetings.proposal.resolutionSave}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-1.5 font-sans text-body text-meta">{c.currentNone}</p>
        )}
      </section>

      {/* 線上表決 */}
      <section id="vote" className="mt-5 scroll-mt-20 border border-line border-l-[3px] border-l-accent bg-paper p-card">
        <p className="font-ui text-chip uppercase tracking-kicker text-accent">{vt.sectionTitle}</p>
        <p className="mt-1.5 font-sans text-caption text-meta">
          {vt.lead}
          {vt.chairDeclares}
        </p>

        {voteError && vt.errors[voteError] ? (
          <p role="alert" className="mt-3 border border-warn-border bg-warn-surface px-3 py-2 font-sans text-caption text-warn-ink">
            {vt.errors[voteError]}
          </p>
        ) : null}

        {openVoteView ? (
          <div className="mt-3">
            <VoteOpenCard vote={openVoteView} pendingNames={openVoteView.pendingNames} />
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <form action={closeVote}>
                <input type="hidden" name="voteId" value={openVoteView.id} />
                <button type="submit" className={btnSolid}>
                  {vt.close}
                </button>
              </form>
              <form action={voidVote}>
                <input type="hidden" name="voteId" value={openVoteView.id} />
                <button type="submit" className={btn}>
                  {vt.void}
                </button>
              </form>
              <span className="font-sans text-caption text-meta">{vt.voidHint}</span>
            </div>
          </div>
        ) : !m.liveOpen ? (
          <p className="mt-3 font-sans text-body text-meta">{vt.needLive}</p>
        ) : attendees.size === 0 ? (
          <p className="mt-3 font-sans text-body text-meta">{vt.needRollCall}</p>
        ) : (
          // key：換案時整個表單重建。不重建的話，輸入框會留著上一案的案由（defaultValue 只在掛載時生效）。
          <form key={current?.id ?? "none"} action={openVote} className="group mt-3 flex flex-col gap-3">
            <input type="hidden" name="meetingId" value={m.id} />
            <input type="hidden" name="proposalId" value={current?.id ?? ""} />
            <label className="flex flex-col gap-1 font-sans text-caption font-medium text-ink">
              {vt.title}
              <input name="title" required maxLength={200} defaultValue={current?.title ?? ""} className={field} />
            </label>
            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <legend className="mb-1 font-sans text-caption font-medium text-ink">{vt.kind}</legend>
              <label className="flex items-center gap-1.5 font-sans text-body text-ink">
                <input type="radio" name="kind" value="motion" defaultChecked /> {vt.kindMotion}
              </label>
              <label className="flex items-center gap-1.5 font-sans text-body text-ink">
                <input type="radio" name="kind" value="election" id="kind-election" /> {vt.kindElection}
              </label>
            </fieldset>
            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <legend className="mb-1 font-sans text-caption font-medium text-ink">{vt.method}</legend>
              {lawSecret !== null && rule ? (
                <>
                  <input type="hidden" name="secret" value={lawSecret ? "1" : "0"} />
                  <p className="font-sans text-body text-ink">
                    {vt.lawFixed(citeOf(rule), rule.method ?? "")}
                  </p>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 font-sans text-body text-ink">
                    <input type="radio" name="secret" value="1" required /> {vt.secret}
                  </label>
                  <label className="flex items-center gap-1.5 font-sans text-body text-ink">
                    <input type="radio" name="secret" value="0" /> {vt.named}
                  </label>
                  <span className="basis-full font-sans text-caption text-meta">{vt.lawUnspecified}</span>
                </>
              )}
            </fieldset>
            {/* 選「選舉」才出現候選人欄（純 CSS :has，不用 client JS）。 */}
            <div className="hidden flex-wrap gap-3 group-has-[#kind-election:checked]:flex">
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 font-sans text-caption text-meta">
                {vt.candidates}
                <textarea name="candidates" rows={4} className={field} />
              </label>
              <label className="flex flex-col gap-1 font-sans text-caption text-meta">
                {vt.seats}
                <input name="seats" type="number" min={1} defaultValue={1} className={`w-20 ${field}`} />
              </label>
            </div>
            <p className="font-sans text-caption text-meta">{vt.eligibleNote(attendees.size)}</p>
            <div>
              <button type="submit" className={btnSolid}>
                {vt.open}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 border-t border-line-soft pt-3">
          <p className="font-sans text-caption font-medium text-ink">{vt.history}</p>
          {pastVotes.length === 0 ? (
            <p className="mt-1.5 font-sans text-caption text-meta">{vt.none}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {pastVotes.map((pv) => (
                <li key={pv.id}>
                  {pv.proposalId && proposalTitle.get(pv.proposalId) !== pv.title ? (
                    <p className="mb-1 font-sans text-caption text-meta">{proposalTitle.get(pv.proposalId)}</p>
                  ) : null}
                  <VoteResultCard vote={pv} rule={ruleById(pv.matterType)} totalMembers={m.liveTotal} />
                  {pv.status === "closed" ? (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {pv.proposalId ? (
                        <form action={applyVoteToResolution}>
                          <input type="hidden" name="voteId" value={pv.id} />
                          <button type="submit" className={btn}>
                            {vt.applyResolution}
                          </button>
                        </form>
                      ) : null}
                      <form action={voidVote}>
                        <input type="hidden" name="voteId" value={pv.id} />
                        <button type="submit" className={btn}>
                          {vt.void}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 議程推進 */}
      <section className="mt-5 border border-line bg-paper p-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-body font-medium text-ink">{c.agenda}</p>
          <form action={setLiveProposal}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="proposalId" value="" />
            <button type="submit" className={btn}>
              {c.clearCurrent}
            </button>
          </form>
        </div>

        {listed.length === 0 ? (
          <p className="mt-3 font-sans text-caption text-meta">{copy.meetings.proposal.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {listed.map((p) => {
              const active = p.id === m.liveProposalId;
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 py-2.5 pl-2.5 ${
                    active ? "border-l-accent bg-paper2" : "border-l-transparent"
                  }`}
                >
                  <span className="tnum shrink-0 font-sans text-caption text-meta">附件{p.serialNo}</span>
                  <span className="shrink-0 font-ui text-chip text-accent">{p.section}</span>
                  <span className="min-w-0 flex-1 font-sans text-body text-ink">{p.title}</span>
                  {p.resolution?.trim() ? (
                    <span className="shrink-0 font-ui text-chip text-accent">{c.done}</span>
                  ) : null}
                  {active ? (
                    <span className="shrink-0 font-ui text-chip text-accent">{c.current}</span>
                  ) : (
                    <form action={setLiveProposal}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="proposalId" value={p.id} />
                      <button type="submit" className={btn}>
                        {c.setCurrent}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
