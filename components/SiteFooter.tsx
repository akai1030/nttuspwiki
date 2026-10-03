import { copy } from "@/lib/copy";
import { versionLabel } from "@/lib/version";

/** SiteFooter — 全站頁尾：中文站名 + 建置版本 + EN 版權（mono, tnum）；下一行是網站使用分析的說明與更新紀錄連結。 */
export function SiteFooter() {
  const version = versionLabel();
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-3 px-wrap-sm hero:px-wrap">
        <span className="font-sans text-code text-meta">{copy.foot.zh}</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {version ? (
            <span
              title={copy.foot.versionHint}
              className="font-mono text-[11.5px] tracking-wide text-meta tnum"
            >
              {version}
            </span>
          ) : null}
          <span className="font-mono text-[11.5px] tracking-wide text-meta tnum">{copy.foot.en}</span>
        </div>
        <p className="w-full font-sans text-caption text-meta">
          {copy.foot.analytics}
          <a href="/updates" className="ml-2 whitespace-nowrap text-accent hover:underline">
            {copy.foot.updates}
          </a>
        </p>
      </div>
    </footer>
  );
}
