import { copy } from "@/lib/copy";

/** SiteFooter — 全站頁尾：中文站名 + EN 版權（mono, tnum）。 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-3 px-wrap-sm hero:px-wrap">
        <span className="font-sans text-code text-meta">{copy.foot.zh}</span>
        <span className="font-mono text-[11.5px] tracking-wide text-meta tnum">{copy.foot.en}</span>
      </div>
    </footer>
  );
}
