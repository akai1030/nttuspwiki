import type { ReactNode } from "react";
import { copy } from "@/lib/copy";

/**
 * SiteHeader — 全站 sticky 頂列（DESIGN-SYSTEM §4）。
 * 品牌 serif 600、「·」靛藍；預設右側為導覽＋幹部登入 CTA。
 * 給 breadcrumb 時（閱讀器）改顯示麵包屑、收起導覽——對齊 reader 原型。
 */
export function SiteHeader({ breadcrumb }: { breadcrumb?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line-soft bg-paper-blur px-wrap-sm py-3.5 backdrop-blur hero:px-wrap">
      {/* 手機寬度品牌名可以換行（min-w-0）：放不下一行時，登入鈕才不會被擠成直排、條文頁才不會橫向捲動。
          hero 以上一行放得下，維持 shrink-0，讓長麵包屑自己截斷。 */}
      <a href="/" className="min-w-0 font-serif text-brand text-ink hero:shrink-0">
        {copy.home.org}
        <span className="text-accent"> · </span>
        {copy.home.sys}
      </a>

      {breadcrumb ? (
        <nav
          aria-label="麵包屑"
          className="hidden min-w-0 truncate font-sans text-caption text-meta tnum hero:block"
        >
          {breadcrumb}
        </nav>
      ) : (
        <nav aria-label="主要導覽" className="flex shrink-0 items-center gap-6">
          <a
            href="/law"
            className="hidden font-sans text-nav text-ink opacity-[.72] transition-opacity hover:text-accent hover:opacity-100 hero:inline"
          >
            {copy.nav.index}
          </a>
          <a
            href="/search"
            className="hidden font-sans text-nav text-ink opacity-[.72] transition-opacity hover:text-accent hover:opacity-100 hero:inline"
          >
            {copy.nav.search}
          </a>
          <a
            href="/meetings"
            className="hidden font-sans text-nav text-ink opacity-[.72] transition-opacity hover:text-accent hover:opacity-100 hero:inline"
          >
            {copy.publicMeetings.nav}
          </a>
          <a
            href="/login"
            className="shrink-0 whitespace-nowrap border border-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {copy.nav.login}
          </a>
        </nav>
      )}
    </header>
  );
}
