import { requireUser } from "@/lib/auth/guard";
import { LogoutButton } from "@/components/LogoutButton";
import { SiteFooter } from "@/components/SiteFooter";
import { copy } from "@/lib/copy";

// 幹部後台外殼：所有 (dashboard) 路由共用。middleware 已擋一層，這裡再 requireUser（縱深防禦）+ 取身分。
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = copy.console.roles;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const displayName = user.name?.trim() || user.email;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line-soft bg-paper-blur px-wrap-sm py-3.5 backdrop-blur hero:px-wrap">
        <a href="/console" className="shrink-0 font-serif text-brand text-ink">
          {copy.home.org}
          <span className="text-accent"> · </span>
          {copy.console.title}
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/console/meetings"
            className="hidden font-sans text-nav text-ink opacity-[.72] transition-opacity hover:text-accent hover:opacity-100 hero:inline"
          >
            {copy.meetings.nav}
          </a>
          <span className="hidden font-sans text-caption text-meta hero:inline">
            {displayName}
            <span className="mx-1.5 text-line">·</span>
            {copy.console.roleLabel} {roleLabel}
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="min-h-[60vh]">{children}</div>

      <SiteFooter />
    </>
  );
}
