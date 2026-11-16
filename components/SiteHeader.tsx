import type { ReactNode } from "react";
import { copy } from "@/lib/copy";

const navLink =
  "font-sans text-body text-ink opacity-70 transition-opacity hover:text-accent hover:opacity-100";

/**
 * SiteHeader — 全站 sticky 頂列（DESIGN-SYSTEM §4）。
 * 品牌 serif 600、「·」靛藍；預設右側為導覽＋幹部登入 CTA。
 * 給 breadcrumb 時（閱讀器）改顯示麵包屑、收起導覽——對齊 reader 原型。
 *
 * 手機寬度：站名只留「國立臺東大學學生議會」，導覽排在頂列下方（不跟著 sticky，頂列高度不變，錨點位移不受影響）。
 * 全名加登入鈕超過 375px，之前會把「議會登入」擠出畫面、整頁可左右滑（2026-11-15 量測）。
 */
export function SiteHeader({ breadcrumb }: { breadcrumb?: ReactNode }) {
  const links = [
    { href: "/law", label: copy.nav.index },
    { href: "/search", label: copy.nav.search },
    { href: "/meetings", label: copy.publicMeetings.nav },
  ];
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line-soft bg-paper-blur px-wrap-sm py-3.5 backdrop-blur hero:px-wrap">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="min-w-0 font-serif text-brand text-ink">
            {copy.home.org}
            <span className="hidden hero:inline">
              <span className="text-accent"> · </span>
              {copy.home.sys}
            </span>
          </a>

          {breadcrumb ? (
            <nav
              aria-label="麵包屑"
              className="hidden min-w-0 truncate font-sans text-caption text-meta tnum hero:block"
            >
              {breadcrumb}
            </nav>
          ) : (
            <div className="flex shrink-0 items-center gap-6">
              <nav aria-label="主要導覽" className="hidden items-center gap-6 hero:flex">
                {links.map((l) => (
                  <a key={l.href} href={l.href} className={navLink}>
                    {l.label}
                  </a>
                ))}
              </nav>
              <a
                href="/login"
                className="border border-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {copy.nav.login}
              </a>
            </div>
          )}
        </div>
      </header>
      {breadcrumb ? null : (
        <nav
          aria-label="主要導覽"
          className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line-soft px-wrap-sm py-2.5 hero:hidden"
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className={navLink}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
