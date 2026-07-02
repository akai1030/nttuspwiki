import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

/**
 * Input — 基礎輸入框（外框、focus 轉 accent 邊；全域 :focus-visible 另加可見焦點框）。
 */
export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink",
        "placeholder:text-meta focus:border-accent",
        className
      )}
      {...rest}
    />
  );
}

/**
 * SearchBox — 全站搜尋框。用 <form method=get action=/search>：無 JS 也能送出（漸進增強）。
 * 零 token、公開可用（CLAUDE.md 免費優先：查詢不呼叫任何付費服務）。
 */
export function SearchBox({
  id = "site-search",
  defaultValue,
  className,
  action = "/search",
}: {
  id?: string;
  defaultValue?: string;
  className?: string;
  action?: string;
}) {
  return (
    <form
      role="search"
      method="get"
      action={action}
      className={cn("relative flex items-stretch gap-2", className)}
    >
      <label htmlFor={id} className="sr-only">
        {copy.search.label}
      </label>
      <div className="relative flex-1">
        {/* 放大鏡（手繪 SVG，不引入 icon 套件庫）。裝飾性，對輔助技術隱藏。 */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-meta"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" strokeLinecap="round" />
        </svg>
        <Input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={copy.search.placeholder}
          className="pl-11"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
      >
        {copy.search.submit}
      </button>
    </form>
  );
}
