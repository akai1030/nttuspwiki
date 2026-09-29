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

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.live.consoleTitle}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.live;
const v = copy.meetings.voteRule;

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
export default async function LiveConsolePage({ params }: { params: { slug: string } }) {
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

      {/* 點名 */}
      <section className="mt-5 border border-line bg-paper p-card">
        <p className="font-sans text-body font-medium text-ink">{c.attendance}</p>
        <form action={setLiveAttendance} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <input type="hidden" name="id" value={m.id} />
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
