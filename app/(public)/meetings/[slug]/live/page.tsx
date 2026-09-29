import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { getLiveMeetingByKey } from "@/lib/meetings/queries";
import { rocDateTimeFull } from "@/lib/meetings/roc";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LiveAgendaBoard } from "@/components/LiveAgendaBoard";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

const c = copy.meetings.live;

export const metadata: Metadata = {
  title: `${c.title}｜${copy.home.org}${copy.home.sys}`,
  // 現場頁只在會議進行中有意義，不希望被搜尋引擎收錄成常設頁。
  robots: { index: false, follow: false },
};

/**
 * 現場議事頁（與會人，免登入）。
 *
 * 存取控制：只在祕書處按下「開啟現場議事」期間查得到，關掉即刻 404 化。
 * 刻意不做登入：與會人是被邀請來開會的人，會議連結本來就發給他們了，
 * 再擋一層登入只會讓現場多一個卡點。也因此這頁不露任何個資與 Meet 連結。
 *
 * 畫面只跟隨伺服器狀態，議程進度由主席／祕書在中控台推進。
 */
export default async function LiveMeetingPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const m = await getLiveMeetingByKey(params.slug);

  if (!m) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
          <h1 className="font-serif text-h2">{c.title}</h1>
          <p className="mt-3 font-sans text-body text-ink">{c.notOpen}</p>
          <p className="mt-1.5 font-sans text-caption text-meta">{c.notOpenHint}</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-ui text-chip uppercase tracking-kicker text-accent">{c.title}</p>
            <h1 className="mt-1 font-serif text-h2">{m.name}</h1>
            <p className="mt-1 font-sans text-caption text-meta">
              {rocDateTimeFull(m.meetingAt)}
              {m.location ? `　${m.location}` : ""}
            </p>
          </div>
          <AutoRefresh seconds={5} />
        </div>

        <LiveAgendaBoard m={m} />
      </main>
      <SiteFooter />
    </>
  );
}
