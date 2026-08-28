import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";
import { latestMeetingDefaults } from "@/lib/meetings/queries";
import { academicTermOf } from "@/lib/meetings/roc";
import { MeetingFields } from "../MeetingFields";
import { createMeeting } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.form.createTitle}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  await requireUser();

  // 每學期只變一次的欄位（學年度學期）用日期推算；屆別與地點沿用上一場。
  // 其餘（會議名稱／連結／文號／時間）每場都不同，維持空白只給 placeholder 提示。
  const last = await latestMeetingDefaults();

  return (
    <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {c.title}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.form.createTitle}</h1>

      {searchParams?.error ? (
        <p
          role="alert"
          className="mt-4 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink"
        >
          {c.form.required}
        </p>
      ) : null}

      <form action={createMeeting} className="mt-6">
        <MeetingFields
          d={{
            session: last?.session ?? 21,
            academicYear: academicTermOf(new Date()),
            location: last?.location ?? "線上視訊會議",
          }}
        />
        <div className="mt-6">
          <button
            type="submit"
            className="border border-ink bg-ink px-5 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
          >
            {c.form.submit}
          </button>
        </div>
      </form>
    </main>
  );
}
