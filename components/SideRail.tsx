import { copy } from "@/lib/copy";

/**
 * SideRail — 首頁固定左側直排索引軌（DESIGN-SYSTEM §4 rail）。
 * mono 小字直排，hover/當前轉 accent。手機（<860px）隱藏（§5）。
 * 對比：用 --meta（≥4.5:1）而非原型的 --muted，守 WCAG AA（同 Phase 1 LawRow 決策）。
 */
export function SideRail() {
  return (
    <nav
      aria-label="頁面章節"
      className="fixed left-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 hero:flex"
    >
      {copy.rail.map((r) => (
        <a
          key={r.no}
          href={r.href}
          className="font-mono text-caption tracking-wide text-meta transition-colors [writing-mode:vertical-rl] tnum hover:text-accent"
        >
          {r.no} {r.label}
        </a>
      ))}
    </nav>
  );
}
