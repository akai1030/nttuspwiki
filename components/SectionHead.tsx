import { cn } from "@/lib/cn";

/**
 * SectionHead — 編號標頭：`01`（mono accent）＋ serif h2 ＋ 拉長 1px 線 ＋ 右側 EN eyebrow。
 * 對應 DESIGN-SYSTEM §4 區塊標頭 sh。預設渲染 <h2>（可用 id 供錨點/目錄）。
 */
export function SectionHead({
  no,
  title,
  en,
  id,
  className,
}: {
  no: string;
  title: string;
  en?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-[42px] flex items-end gap-4", className)}>
      <span className="font-mono text-code font-medium text-accent tnum">{no}</span>
      <h2 id={id} className="font-serif text-h2 scroll-mt-[70px]">
        {title}
      </h2>
      <div className="mb-3 h-px flex-1 bg-line" aria-hidden="true" />
      {en && (
        <span className="mb-2.5 hidden font-ui text-eyebrow font-medium uppercase tracking-eyebrow text-meta hero:inline-block">
          {en}
        </span>
      )}
    </div>
  );
}
