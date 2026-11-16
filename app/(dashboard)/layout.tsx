import { requireUser } from "@/lib/auth/guard";
import { LogoutButton } from "@/components/LogoutButton";
import { SiteFooter } from "@/components/SiteFooter";
import { copy } from "@/lib/copy";

// 幹部後台外殼：所有 (dashboard) 路由共用。proxy.ts 已擋一層，這裡再 requireUser（縱深防禦）+ 取身分。
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = copy.console.roles;
const n = copy.console.nav;

const link = "font-sans text-body text-ink opacity-70 transition-opacity hover:text-accent hover:opacity-100";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const displayName = user.name?.trim() || user.email;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  // 名冊含個資，viewer 看不到（recipients/page.tsx 的 requireRole），導覽也不列。
  const items = [
    { href: "/console/meetings", label: n.meetings },
    ...(user.role === "viewer" ? [] : [{ href: "/console/meetings/recipients", label: n.roster }]),
    { href: "/console/meetings/guide", label: n.guide },
    ...(user.role === "admin" ? [{ href: "/console/members", label: n.accounts }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line-soft bg-paper-blur px-wrap-sm py-3.5 backdrop-blur hero:px-wrap">
        <div className="flex items-center justify-between gap-4">
          <a href="/console" className="min-w-0 font-serif text-brand text-ink">
            <span className="hidden hero:inline">
              {copy.home.org}
              <span className="text-accent"> · </span>
            </span>
            {copy.console.title}
          </a>
          <div className="flex items-center gap-5">
            <nav aria-label={copy.console.title} className="hidden items-center gap-5 hero:flex">
              {items.map((it) => (
                <a key={it.href} href={it.href} className={link}>
                  {it.label}
                </a>
              ))}
            </nav>
            <span className="hidden font-sans text-caption text-meta hero:inline">
              {displayName}
              <span className="mx-1.5 text-line">·</span>
              {copy.console.roleLabel} {roleLabel}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {/* 手機：導覽排在頂列下方，不藏起來；不跟著 sticky，頂列高度不變。 */}
      <nav
        aria-label={copy.console.title}
        className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line-soft px-wrap-sm py-2.5 hero:hidden"
      >
        {items.map((it) => (
          <a key={it.href} href={it.href} className={link}>
            {it.label}
          </a>
        ))}
      </nav>

      {/* ph-no-capture：PostHog 不錄這一塊（lib/posthog.ts） */}
      <div className="ph-no-capture min-h-[60vh]">{children}</div>

      <SiteFooter />
    </>
  );
}
