import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { memberContext } from "@/lib/meetings/vote-queries";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MemberVoteView } from "@/components/MemberVoteView";

export const dynamic = "force-dynamic";

const c = copy.meetings.vote.member;

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
      {/* ph-no-capture：PostHog 不錄這一塊（lib/posthog.ts） */}
      <main className="ph-no-capture mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
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

        {ctx.state !== "invalid" ? <MemberVoteView ctx={ctx} token={token} /> : null}
      </main>
      <SiteFooter />
    </>
  );
}
