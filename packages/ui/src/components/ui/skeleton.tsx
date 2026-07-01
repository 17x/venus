import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import type * as React from "react";

const skeletonVariants = cva("animate-pulse bg-muted", {
  variants: {
    variant: {
      block: "rounded-md",
      text: "h-4 rounded-sm",
      avatar: "aspect-square rounded-full",
      button: "h-8 rounded-md",
      card: "min-h-28 rounded-lg border border-border/60"
    }
  },
  defaultVariants: {
    variant: "block"
  }
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(skeletonVariants({ variant }), className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton, skeletonVariants };
