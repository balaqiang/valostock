import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 [&>svg]:h-3.5 [&>svg]:w-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-surface-elevated text-text-secondary",
        outline: "border border-border bg-background text-text",
        success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        destructive: "bg-red-500/10 text-red-600 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
