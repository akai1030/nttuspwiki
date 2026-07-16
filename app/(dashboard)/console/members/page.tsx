import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { rocDateTime } from "@/lib/meetings/roc";
import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";
import { createMember, resetMemberPassword, setMemberRole, deleteMember } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.members.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.members;
const ROLE_OPTIONS = ["officer", "admin", "viewer"] as const;
const roleName = (r: string) => (c.roleNames as Record<string, string>)[r] ?? r;

const selectCls =
  "rounded-sm border border-line bg-paper px-3 py-2 font-sans text-body text-ink focus:border-accent";

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { err?: string; ok?: string };
}) {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console" className="font-sans text-caption text-accent hover:underline">
        {c.backToConsole}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>

      {searchParams?.ok ? (
        <p className="mt-4 border border-line bg-paper2 px-4 py-3 font-sans text-caption text-ink">
          {c.add.okPrefix} {searchParams.ok}{c.add.okSuffix}
        </p>
      ) : null}
      {searchParams?.err ? (
        <p
          role="alert"
          className="mt-4 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink"
        >
          {searchParams.err === "dup" ? c.add.errDup : c.add.errInput}
        </p>
      ) : null}

      {/* 新增成員 */}
      <form
        action={createMember}
        className="mt-6 grid gap-3 border border-line bg-paper2 p-card hero:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] hero:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-email" className="font-sans text-caption font-medium text-ink">
            {c.add.email}
          </label>
          <Input id="m-email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-name" className="font-sans text-caption font-medium text-ink">
            {c.add.name}
          </label>
          <Input id="m-name" name="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-role" className="font-sans text-caption font-medium text-ink">
            {c.add.role}
          </label>
          <select id="m-role" name="role" defaultValue="officer" className={`${selectCls} w-full`}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-pw" className="font-sans text-caption font-medium text-ink">
            {c.add.password}
          </label>
          <Input id="m-pw" name="password" type="text" required minLength={8} />
        </div>
        <button
          type="submit"
          className="h-[42px] border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
        >
          {c.add.submit}
        </button>
      </form>
      <p className="mt-2 font-sans text-caption text-meta">{c.add.hint}</p>

      {/* 成員清單 */}
      <div className="mt-8">
        {users.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">
            {c.list.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {users.map((u) => {
              const isMe = u.id === me.sub;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                  <span className="shrink-0 border border-line-soft px-2 py-0.5 font-ui text-chip leading-none text-meta">
                    {roleName(u.role)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-sans text-body text-ink">
                      {u.name || "—"}
                      {isMe ? <span className="ml-2 font-ui text-chip text-accent">{c.list.you}</span> : null}
                    </div>
                    <div className="font-sans text-caption text-meta">{u.email}</div>
                  </div>
                  <span className="font-sans text-caption text-meta">
                    {u.lastLoginAt ? rocDateTime(u.lastLoginAt) : c.list.never}
                    {!u.passwordHash ? `・${c.list.noPassword}` : ""}
                  </span>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {/* 重設密碼 */}
                    <form action={resetMemberPassword} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <Input
                        name="password"
                        type="text"
                        minLength={8}
                        placeholder={c.list.resetPlaceholder}
                        className="w-40 !py-1.5 text-caption"
                      />
                      <button
                        type="submit"
                        className="border border-line px-2.5 py-1.5 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        {c.list.reset}
                      </button>
                    </form>
                    {/* 變更角色 */}
                    <form action={setMemberRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className={`${selectCls} !py-1.5 text-caption`}>
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {roleName(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="border border-line px-2.5 py-1.5 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        {c.list.roleChange}
                      </button>
                    </form>
                    {/* 刪除（不可刪自己） */}
                    {isMe ? null : (
                      <form action={deleteMember}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                        >
                          {c.list.del}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
