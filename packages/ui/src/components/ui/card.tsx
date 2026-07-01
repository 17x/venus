import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground outline-none transition-[background-color,border-color,box-shadow,transform]",
  {
  variants: {
    variant: {
      default: "shadow-[var(--shadow-card)]",
      muted: "bg-muted/35 shadow-[var(--shadow-card)]",
      elevated: "shadow-[var(--shadow-elevated)]",
      interactive: "cursor-[var(--cursor-action)] select-none shadow-[var(--shadow-card)] hover:-translate-y-px hover:border-ring/40 hover:bg-muted/25 hover:shadow-[var(--shadow-elevated)] active:translate-y-0 active:border-ring/50 active:bg-[hsl(var(--state-active))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 focus-within:border-ring/35 focus-within:shadow-[var(--shadow-elevated)]"
    },
    density: {
      compact: "text-xs",
      default: "text-sm",
      spacious: "text-sm"
    }
  },
  defaultVariants: {
    variant: "default",
    density: "default"
  }
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, density, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-density={density ?? "default"}
      data-slot="card"
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ density, variant }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-semibold leading-5 tracking-normal", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs leading-5 text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
