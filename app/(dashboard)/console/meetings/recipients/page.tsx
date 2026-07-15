import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { listRecipients } from "@/lib/meetings/queries";
import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";
import { addRecipient, toggleRecipient } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.recipients.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.recipients;

export default async function RecipientsPage() {
  await requireUser();
  const recipients = await listRecipients();

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {copy.meetings.title}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
      <p className="mt-2 max-w-reader font-sans text-caption text-meta">{c.placeholderNote}</p>

      {/* 新增 */}
      <form
        action={addRecipient}
        className="mt-6 grid gap-3 border border-line bg-paper2 p-card hero:grid-cols-[1fr_1.4fr_0.8fr_0.6fr_auto] hero:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-name" className="font-sans text-caption font-medium text-ink">
            {c.name}
          </label>
          <Input id="r-name" name="name" required placeholder="議員01" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-email" className="font-sans text-caption font-medium text-ink">
            {c.email}
          </label>
          <Input id="r-email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-role" className="font-sans text-caption font-medium text-ink">
            {c.roleTag}
          </label>
          <select
            id="r-role"
            name="roleTag"
            defaultValue="議員"
            className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
          >
            <option>議員</option>
            <option>列席</option>
            <option>旁聽</option>
            <option>祕書處</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-session" className="font-sans text-caption font-medium text-ink">
            {c.session}
          </label>
          <Input id="r-session" name="session" type="number" defaultValue={21} />
        </div>
        <button
          type="submit"
          className="h-[42px] border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
        >
          {c.add}
        </button>
      </form>

      {/* 清單 */}
      <div className="mt-8">
        {recipients.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">
            {c.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {recipients.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
                  {r.roleTag}
                </span>
                <span className="font-sans text-body text-ink">{r.name}</span>
                <span className="font-sans text-caption text-meta">{r.email}</span>
                <span className="font-sans text-caption text-meta">第{r.session}屆</span>
                <span
                  className={
                    "ml-auto font-ui text-chip " + (r.active ? "text-accent" : "text-meta")
                  }
                >
                  {r.active ? c.active : c.inactive}
                </span>
                <form action={toggleRecipient}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="border border-line px-2.5 py-1 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    {c.toggle}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
