import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

/**
 * LawRow — 法規索引列：編號(mono) │ 法規名(serif) + meta(小字) │ 閱讀 →。
 * hover：整列右移 6px + paper2 底、編號轉 accent、「閱讀 →」浮現（group）。
 */
export function LawRow({
  number,
  name,
  meta,
  href,
  className,
}: {
  number: string;
  name: string;
  meta?: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group grid grid-cols-[82px_1fr_auto] items-center gap-[22px] border-b border-line-soft px-2.5 py-[19px] text-ink transition-[transform,background-color] duration-200 hover:translate-x-1.5 hover:bg-paper2",
        className
      )}
    >
      {/* 編號用 --meta（6.53:1）而非 --muted（3.85:1，未達 AA），hover 仍轉 accent。 */}
      <span className="font-mono text-row-num font-medium text-meta tnum group-hover:text-accent">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-row-name">{name}</span>
        {meta && (
          <span className="mt-[3px] block font-sans text-caption text-meta tnum">
            {meta}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="font-sans text-caption font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copy.list.read}
      </span>
    </a>
  );
}
