import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-[var(--cursor-action)] select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent text-xs font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-px active:translate-y-0 active:bg-[hsl(var(--state-active))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-expanded:bg-[hsl(var(--state-active))] aria-pressed:bg-[hsl(var(--state-active))] aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:text-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)] disabled:hover:translate-y-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground shadow-[0_1px_1px_hsl(var(--foreground)/0.08)] hover:bg-primary/90 hover:shadow-[0_6px_16px_hsl(var(--primary)/0.18)] active:bg-primary/80 active:shadow-[0_1px_1px_hsl(var(--foreground)/0.08)]",
        secondary: "border-input bg-secondary text-secondary-foreground shadow-[0_1px_1px_hsl(var(--foreground)/0.04)] hover:border-ring/30 hover:bg-[hsl(var(--state-hover))] hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
        ghost: "text-muted-foreground hover:bg-[hsl(var(--state-hover))] hover:text-foreground active:text-foreground",
        outline: "border-input bg-background text-foreground shadow-[0_1px_1px_hsl(var(--foreground)/0.04)] hover:border-ring/35 hover:bg-[hsl(var(--state-hover))] hover:text-accent-foreground hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
        destructive: "border-destructive bg-destructive text-destructive-foreground shadow-[0_1px_1px_hsl(var(--foreground)/0.08)] hover:bg-destructive/90 hover:shadow-[0_6px_16px_hsl(var(--destructive)/0.18)] active:bg-destructive/80 active:shadow-[0_1px_1px_hsl(var(--foreground)/0.08)]",
        link: "h-auto rounded-none border-0 px-0 text-primary underline-offset-4 hover:translate-y-0 hover:underline active:text-primary/80"
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-6 gap-1 rounded-md px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 rounded-md px-2.5",
        lg: "h-9 rounded-md px-4",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant, size, asChild = false, ...props }, ref) => {
    const resolvedVariant = variant ?? "default";
    const resolvedSize = size ?? "default";
    const composedClassName = cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize, className }));

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;

      return React.cloneElement(child, {
        ...props,
        className: cn(composedClassName, child.props.className),
        "data-as-child": true,
        "data-size": resolvedSize,
        "data-slot": "button",
        "data-variant": resolvedVariant,
        ref
      } as React.HTMLAttributes<HTMLElement> & { ref: typeof ref });
    }

    return (
      <button
        className={composedClassName}
        data-as-child={asChild || undefined}
        data-size={resolvedSize}
        data-slot="button"
        data-variant={resolvedVariant}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
