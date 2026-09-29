import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeetingByKey } from "@/lib/meetings/queries";
import { toTaipeiInputValue } from "@/lib/meetings/roc";
import { meetingKey } from "@/lib/meetings/slug";
import { copy } from "@/lib/copy";
import { MeetingFields } from "../../MeetingFields";
import { updateMeeting } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.detail.edit}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings;

export default async function EditMeetingPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  await requireUser();
  const m = await getMeetingByKey(params.slug);
  if (!m) notFound();
  if (m.slug && m.slug !== params.slug) redirect(`/console/meetings/${m.slug}/edit`);

  return (
    <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap">
      <a
        href={`/console/meetings/${meetingKey(m)}`}
        className="font-sans text-caption text-accent hover:underline"
      >
        ← {m.name}
      </a>
      <h1 className="mt-4 font-serif text-h2">
        {c.detail.edit}｜{m.name}
      </h1>
      {searchParams?.error === "slug" || searchParams?.error === "slugTaken" ? (
        <p className="mt-3 border border-warn-border bg-warn-surface px-3 py-2 font-sans text-caption text-warn-ink">
          {searchParams.error === "slugTaken" ? c.form.slugTaken : c.form.slugInvalid}
        </p>
      ) : null}

      <form action={updateMeeting} className="mt-6">
        <input type="hidden" name="id" value={m.id} />
        <MeetingFields
          d={{
            slug: m.slug ?? "",
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
