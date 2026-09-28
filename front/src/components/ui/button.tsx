import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "invert";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30",
  secondary:
    "border border-border-strong bg-background text-text hover:bg-surface-elevated",
  ghost: "text-text-secondary hover:bg-surface-elevated hover:text-text",
  invert: "bg-text text-background hover:opacity-90",
};

const sizes: Record<Size, string> = {
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-[0.95rem]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  href?: string;
  children: React.ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
