import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

export interface AmendmentItem {
  /** 民國日期，如 "113.09.19" */
  roc: string;
  /** 沿革敘述，如 "第十九屆九月常會修正第 4 條" */
  text: string;
}

/**
 * AmendmentTimeline — 修正沿革，收合式 <details>（原生可鍵盤操作、無障礙）。
 * 每列：民國日期(mono, ink) ＋ 敘述(小字 meta)。
 */
export function AmendmentTimeline({
  amendments,
  count,
  defaultOpen = false,
  className,
}: {
  amendments: AmendmentItem[];
  count?: number;
  defaultOpen?: boolean;
  className?: string;
}) {
  const n = count ?? amendments.length;
  return (
    <details className={cn("group my-4", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-sans text-code font-medium text-accent [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-180"
        >
          ▾
        </span>
        {copy.reader.history(n)}
      </summary>
      <div className="mt-2">
        {amendments.map((a, i) => (
          <div
            key={i}
            className="flex gap-3 border-b border-line-soft py-1.5 font-sans text-caption text-meta"
          >
            <span className="min-w-[78px] font-mono text-ink tnum">{a.roc}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
