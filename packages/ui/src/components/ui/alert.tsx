import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative grid w-full gap-1 rounded-lg border px-4 py-3 text-sm outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/25 focus-within:border-ring/35 focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus))] focus-within:ring-offset-1 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-transparent bg-[hsl(var(--state-info-bg))] text-[hsl(var(--state-info))]",
        success: "border-transparent bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success))]",
        warning: "border-transparent bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning))]",
        destructive: "border-transparent bg-[hsl(var(--state-invalid-bg))] text-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-medium leading-5", className)} data-slot="alert-title" {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs leading-5 opacity-85", className)}
      data-slot="alert-description"
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle, alertVariants };
