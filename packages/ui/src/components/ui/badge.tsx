import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full cursor-default select-none items-center gap-1 rounded-md border font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-input bg-secondary text-secondary-foreground hover:border-ring/30 hover:bg-[hsl(var(--state-hover))]",
        outline: "border-input bg-background text-foreground hover:border-ring/35 hover:bg-[hsl(var(--state-hover))]",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success: "border-[hsl(var(--state-success)/0.18)] bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success))] hover:border-[hsl(var(--state-success)/0.34)]",
        warning: "border-[hsl(var(--state-warning)/0.2)] bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning))] hover:border-[hsl(var(--state-warning)/0.38)]",
        amber: "border-[hsl(var(--state-warning)/0.2)] bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning))] hover:border-[hsl(var(--state-warning)/0.38)]",
        info: "border-[hsl(var(--state-info)/0.18)] bg-[hsl(var(--state-info-bg))] text-[hsl(var(--state-info))] hover:border-[hsl(var(--state-info)/0.34)]"
      },
      size: {
        sm: "h-5 px-1.5 text-[11px] leading-none",
        default: "h-6 px-2 text-xs",
        lg: "h-7 px-2.5 text-xs"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, size, variant, ...props }: BadgeProps) {
  const resolvedSize = size ?? "default";
  const resolvedVariant = variant ?? "default";

  return (
    <div
      className={cn(badgeVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
      data-size={resolvedSize}
      data-slot="badge"
      data-variant={resolvedVariant}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
