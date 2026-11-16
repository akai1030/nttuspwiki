import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { rocDateTimeFull } from "@/lib/meetings/roc";
import { meetingKey } from "@/lib/meetings/slug";
import { STEP_KEYS, suggestedStep } from "@/lib/meetings/steps";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.console.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

const TOOLS = [
  copy.console.tools.meetings,
  copy.console.tools.roster,
  copy.console.tools.voteGuide,
  copy.console.tools.check,
];
const st = copy.meetings.steps;

/** 下一場還沒開的會議；沒有就拿最近開過、還沒結案的那場。 */
async function nextMeeting() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const select = { id: true, slug: true, name: true, meetingAt: true, status: true, liveOpen: true, location: true } as const;
  return (
    (await prisma.meeting.findFirst({
      where: { meetingAt: { gte: since }, status: { not: "CLOSED" } },
      orderBy: { meetingAt: "asc" },
      select,
    })) ??
    (await prisma.meeting.findFirst({
      where: { status: { not: "CLOSED" } },
      orderBy: { meetingAt: "desc" },
      select,
    }))
  );
}

export default async function ConsolePage(
  props: {
    searchParams?: Promise<{ denied?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const displayName = user.name?.trim() || user.email;
  const next = await nextMeeting();
  const nextStep = next ? suggestedStep(next, new Date()) : null;
  // viewer 看不到名冊（含個資），卡片也不列。
  const tools = TOOLS.filter((t) => !(user.role === "viewer" && t === copy.console.tools.roster));

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <h1 className="font-serif text-h2">{copy.console.greeting(displayName)}</h1>
      <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">{copy.console.lede}</p>

      {searchParams?.denied ? (
        <p
          role="alert"
          className="mt-6 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink"
        >
          {copy.console.denied}
        </p>
      ) : null}

      <section className="mt-8 border border-line border-l-4 border-l-accent bg-paper p-card">
        <p className="font-sans text-caption font-medium text-accent">{copy.console.upcomingTitle}</p>
        {next && nextStep ? (
          <a href={`/console/meetings/${meetingKey(next)}`} className="group mt-2 block">
            <p className="font-serif text-h4 text-ink group-hover:text-accent">{next.name}</p>
            <p className="mt-1 font-sans text-caption text-meta">
              {rocDateTimeFull(next.meetingAt)}
              {next.location ? `・${next.location}` : ""}
            </p>
            <p className="mt-3 font-sans text-body text-ink">
              {copy.console.nextStep(st.numbered(STEP_KEYS.indexOf(nextStep) + 1, st.label[nextStep]), null)}
            </p>
            <span className="mt-3 inline-block font-sans text-caption font-medium text-accent">
              {copy.console.openMeeting}
            </span>
          </a>
        ) : (
          <p className="mt-2 font-sans text-body text-meta">{copy.console.upcomingNone}</p>
        )}
      </section>

      <div className="mt-8 grid gap-5 hero:grid-cols-2">
        {tools.map((tool) => {
          const href = "href" in tool ? tool.href : null;
          const live = Boolean(href);
          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-h4">{tool.title}</h2>
                <span
                  className={
                    "shrink-0 border px-2 py-1 font-ui text-chip leading-none " +
                    (live ? "border-accent text-accent" : "border-line-soft text-meta")
                  }
                >
                  {tool.status}
                </span>
              </div>
              <p className="mt-3 font-sans text-body text-body-ink">{tool.body}</p>
            </>
          );
          return live ? (
            <a
              key={tool.title}
              href={href!}
              className="group block border border-line bg-paper p-card transition-colors hover:border-accent"
            >
              {inner}
              <span className="mt-4 inline-block font-ui text-caption font-medium text-accent">
                {copy.meetings.list.open}
              </span>
            </a>
          ) : (
            <section key={tool.title} className="border border-line bg-paper p-card">
              {inner}
            </section>
          );
        })}
      </div>
    </main>
  );
}
