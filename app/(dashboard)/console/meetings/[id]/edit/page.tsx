import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeeting } from "@/lib/meetings/queries";
import { toTaipeiInputValue } from "@/lib/meetings/roc";
import { copy } from "@/lib/copy";
import { MeetingFields } from "../../MeetingFields";
import { updateMeeting } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.detail.edit}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;

export default async function EditMeetingPage({ params }: { params: { id: string } }) {
  await requireUser();
  const m = await getMeeting(params.id);
  if (!m) notFound();

  return (
    <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
      <a
        href={`/console/meetings/${m.id}`}
        className="font-sans text-caption text-accent hover:underline"
      >
        ← {m.name}
      </a>
      <h1 className="mt-4 font-serif text-h2">
        {c.detail.edit}｜{m.name}
      </h1>

      <form action={updateMeeting} className="mt-6">
        <input type="hidden" name="id" value={m.id} />
        <MeetingFields
          d={{
            session: m.session,
            academicYear: m.academicYear,
            name: m.name,
            kind: m.kind,
            meetingAt: toTaipeiInputValue(m.meetingAt),
            location: m.location,
            meetingUrl: m.meetingUrl,
            docNumber: m.docNumber,
            proposalDeadline: m.proposalDeadline ? toTaipeiInputValue(m.proposalDeadline) : "",
            notes: m.notes,
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
