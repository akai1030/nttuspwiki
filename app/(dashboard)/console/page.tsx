import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.console.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

const TOOLS = [copy.console.tools.meetings, copy.console.tools.check];

export default async function ConsolePage({
  searchParams,
}: {
  searchParams?: { denied?: string };
}) {
  const user = await requireUser();
  const displayName = user.name?.trim() || user.email;

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
        {copy.console.eyebrow}
      </div>
      <h1 className="mt-3 font-serif text-h2">{copy.console.greeting(displayName)}</h1>
      <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">{copy.console.lede}</p>

      {user.role === "admin" ? (
        <a
          href="/console/members"
          className="mt-4 inline-block font-sans text-body text-accent hover:underline"
        >
          {copy.members.nav} →
        </a>
      ) : null}

      {searchParams?.denied ? (
        <p
          role="alert"
          className="mt-6 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink"
        >
          {copy.console.denied}
        </p>
      ) : null}

      <div className="mt-10 grid gap-5 hero:grid-cols-2">
        {TOOLS.map((tool) => {
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
