import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { listRecipients } from "@/lib/meetings/queries";
import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";
import { addRecipient, toggleRecipient, updateRecipient, deleteRecipient } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.recipients.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.recipients;

export default async function RecipientsPage() {
  await requireUser();
  const recipients = await listRecipients();
  const memberCount = recipients.filter((r) => r.studentId).length;

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {copy.meetings.title}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
      {memberCount > 0 && (
        <p className="mt-2 font-ui text-caption text-accent">{c.memberN(memberCount)}</p>
      )}
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
            {recipients.map((r) => {
              const roster = [
                r.studentId && `${c.studentId} ${r.studentId}`,
                [r.department, r.grade].filter(Boolean).join(" "),
                r.district && r.district !== r.department && `${c.district} ${r.district}`,
                r.phone && `${c.phone} ${r.phone}`,
              ].filter(Boolean);
              return (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-end gap-2">
                <form action={updateRecipient} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <Input name="name" defaultValue={r.name} aria-label={c.name} className="w-28 !py-1.5 text-caption" />
                  <Input name="email" type="email" defaultValue={r.email} aria-label={c.email} className="w-52 !py-1.5 text-caption" />
                  <select
                    name="roleTag"
                    defaultValue={r.roleTag}
                    aria-label={c.roleTag}
                    className="rounded-sm border border-line bg-paper px-2 py-1.5 font-sans text-caption text-ink focus:border-accent"
                  >
                    <option>議員</option>
                    <option>列席</option>
                    <option>旁聽</option>
                    <option>祕書處</option>
                  </select>
                  <Input name="session" type="number" defaultValue={r.session} aria-label={c.session} className="w-16 !py-1.5 text-caption" />
                  <button
                    type="submit"
                    className="border border-ink bg-ink px-2.5 py-1.5 font-ui text-chip leading-none text-white transition-colors hover:border-accent hover:bg-accent"
                  >
                    {c.save}
                  </button>
                </form>
                <span className={"font-ui text-chip " + (r.active ? "text-accent" : "text-meta")}>
                  {r.active ? c.active : c.inactive}
                </span>
                <form action={toggleRecipient}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="border border-line px-2.5 py-1.5 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    {c.toggle}
                  </button>
                </form>
                <form action={deleteRecipient}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                  >
                    {c.del}
                  </button>
                </form>
                </div>
                {roster.length > 0 && (
                  <p className="mt-1.5 font-sans text-caption text-meta">{roster.join("・")}</p>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
