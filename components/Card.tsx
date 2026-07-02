import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Card — 外框卡（檢核對照報告、時程排定等）。
 * 選填標頭：左側小標（accent 粗體小字）＋ 右側 serif 標題（h4）。
 */
export function Card({
  label,
  title,
  children,
  className,
}: {
  label?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = label != null || title != null;
  return (
    <section className={cn("border border-line bg-paper p-card", className)}>
      {hasHeader && (
        <div className="mb-[18px] flex items-baseline gap-2.5 border-b border-line-soft pb-3.5">
          {label != null && (
            <span className="font-sans text-caption font-bold leading-none text-accent">
              {label}
            </span>
          )}
          {title != null && (
            <h4 className="ml-auto font-serif text-h4">{title}</h4>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
