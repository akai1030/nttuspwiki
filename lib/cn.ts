/**
 * 極簡 className 合併器（不引入 clsx/tailwind-merge 等相依，維持精簡）。
 * 用法：cn("base", cond && "extra", isOn ? "on" : "off")
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
