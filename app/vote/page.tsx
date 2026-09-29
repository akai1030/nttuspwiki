import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { memberContext } from "@/lib/meetings/vote-queries";
import { readVoterToken } from "@/lib/meetings/voter-login";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MemberVoteView } from "@/components/MemberVoteView";
import { VoterLoginForm } from "@/components/VoterLoginForm";
import { voterLogout } from "./actions";

export const dynamic = "force-dynamic";

const c = copy.meetings.vote.member;
const lb = copy.meetings.vote.lobby;

export const metadata: Metadata = {
  title: `${c.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

/**
 * 共用投票頁：開會通知裡附的就是這個網址。
 * 未登入 → 學號＋手機末四碼；登入後跟專屬連結頁同一個畫面，每 3 秒同步。
 * cookie 失效（過期、作廢重發）就回到登入表單。
 */
export default async function VoteLobbyPage() {
  const token = await readVoterToken();
  const ctx = token ? await memberContext(token) : null;
  const member = ctx && ctx.state !== "invalid" ? ctx : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-ui text-chip uppercase tracking-kicker text-accent">{c.title}</p>
            <h1 className="mt-1 font-serif text-h2">{member ? c.hello(member.member.name) : c.title}</h1>
          </div>
          {member ? <AutoRefresh seconds={3} /> : null}
        </div>

        {member ? (
          <>
            <form action={voterLogout} className="mt-1.5">
              <button type="submit" className="font-sans text-caption text-accent hover:underline">
                {lb.logout}
              </button>
            </form>
            <MemberVoteView ctx={member} token={null} />
          </>
        ) : (
          <>
            <p className="mt-3 font-sans text-body text-ink">{lb.lead}</p>
            <VoterLoginForm />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
