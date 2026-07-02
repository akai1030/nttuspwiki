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
      <a href="/" className="shrink-0 font-serif text-brand text-ink">
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
        <nav aria-label="主要導覽" className="flex items-center gap-6">
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
            href="/login"
            className="border border-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {copy.nav.login}
          </a>
        </nav>
      )}
    </header>
  );
}
