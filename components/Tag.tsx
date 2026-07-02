import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { categoryConfig } from "@/lib/categories";
import { copy } from "@/lib/copy";

/**
 * CategoryTag — 五類分類的實色標籤（serif、白字、依 --cat-* 底色）。
 * 顏色是全站唯一允許「非靛藍」的著色處（DESIGN-SYSTEM §7），只用於分類。
 */
export function CategoryTag({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const cfg = categoryConfig(category);
  return (
    <span
      className={cn(
        "inline-block px-3.5 pb-[5px] pt-[3px] font-serif text-cat-label",
        cfg.labelClass,
        className
      )}
    >
      {cfg.zh}
    </span>
  );
}

/**
 * CategoryRow — 索引分類列：實色標籤 ＋ EN 小標 ＋ 右側「N 部」。
 */
export function CategoryRow({
  category,
  count,
  className,
}: {
  category: string;
  count: number;
  className?: string;
}) {
  const cfg = categoryConfig(category);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CategoryTag category={category} />
      <span className="font-ui text-cat-en uppercase text-meta">{cfg.en}</span>
      <span className="ml-auto font-sans text-caption tabular-nums text-meta tnum">
        {count} {copy.list.partsSuffix}
      </span>
    </div>
  );
}

/**
 * Tag（狀態）— 小型狀態 pill；tone 對應語意色。當前態走 accent 實色白字。
 * neutral=細框；accent/ink=實色；warn/ok=語意表面色。
 */
type Tone = "neutral" | "accent" | "ink" | "warn" | "ok";

const TONE: Record<Tone, string> = {
  neutral: "border border-line text-meta",
  accent: "border border-accent bg-accent text-white",
  ink: "border border-ink bg-ink text-white",
  warn: "border border-warn-border bg-warn-surface text-warn-ink",
  ok: "border border-line text-ok",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-[5px] font-sans text-caption font-medium leading-none tnum",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Chip — 等寬細框籤（版本 chips：第20/19/18屆）。active → accent 實色白字。
 */
export function Chip({
  children,
  active = false,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-[9px] py-[3px] font-mono text-chip leading-none tnum",
        active
          ? "border border-accent bg-accent text-white"
          : "border border-line text-meta",
        className
      )}
    >
      {children}
    </span>
  );
}
