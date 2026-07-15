import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";
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
        <MeetingFields />
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
