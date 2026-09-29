import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { memberContext } from "@/lib/meetings/vote-queries";
import { meetingKey } from "@/lib/meetings/slug";
import { methodLabel } from "@/lib/meetings/voting";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BallotForm } from "@/components/BallotForm";
import { VoteResultCard } from "@/components/VoteBlocks";

export const dynamic = "force-dynamic";

const c = copy.meetings.vote.member;
const vt = copy.meetings.vote;

export const metadata: Metadata = {
  title: `${c.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
  // 網址路徑就是投票憑證，任何連出去的請求都不帶 Referer。
  referrer: "no-referrer",
};

/**
 * 議員投票頁（免登入，連結即身分）。
 *
 * 自動找這位議員那一屆「正在開現場議事」的會議，顯示進行中的表決。
 * 畫面每 3 秒跟伺服器同步一次；主席開票、截止都會自動反映，議員不用重新整理。
 */
export default async function VotePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const ctx = await memberContext(token);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-ui text-chip uppercase tracking-kicker text-accent">{c.title}</p>
            {ctx.state !== "invalid" ? (
              <h1 className="mt-1 font-serif text-h2">{c.hello(ctx.member.name)}</h1>
            ) : (
              <h1 className="mt-1 font-serif text-h2">{c.title}</h1>
            )}
          </div>
          {ctx.state !== "invalid" ? <AutoRefresh seconds={3} /> : null}
        </div>

        {ctx.state === "invalid" ? (
          <p className="mt-4 font-sans text-body text-ink">{c.invalid}</p>
        ) : (
          <p className="mt-1.5 font-sans text-caption text-meta">{c.doNotShare}</p>
        )}

        {ctx.state === "noMeeting" ? <p className="mt-6 font-sans text-body text-meta">{c.noMeeting}</p> : null}

        {ctx.state === "ready" ? (
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
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
