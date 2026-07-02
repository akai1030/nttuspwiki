import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Button — DESIGN-SYSTEM §4：主＝ink/accent 實色白字；次＝外框。避免用到停用態。
 * 有 href 時渲染 <a>（供導覽/CTA，如「幹部登入」），否則渲染 <button>。
 */
type Variant = "primary" | "ink" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 font-ui text-caption font-medium leading-none tracking-snug transition-colors";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border border-accent bg-accent text-white hover:border-accent-soft hover:bg-accent-soft",
  ink: "border border-ink bg-ink text-white hover:border-accent hover:bg-accent",
  outline: "border border-ink text-ink hover:border-accent hover:text-accent",
};

const PAD = "px-4 py-[9px]";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
  };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", className, children, ...rest } = props;
  const classes = cn(base, PAD, VARIANTS[variant], className);

  if ("href" in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
