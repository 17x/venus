"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "../../lib/utils";

const checkboxVariants = cva(
  "pointer-events-none inline-flex size-4 shrink-0 items-center justify-center rounded border border-input bg-[hsl(var(--control-bg))] text-primary-foreground shadow-sm outline-none transition-[background-color,border-color,color,box-shadow,transform] peer-hover:scale-105 peer-hover:border-primary/55 peer-hover:bg-[hsl(var(--state-hover))] peer-hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.10)] peer-hover:data-[state=checked]:bg-primary/90 peer-hover:data-[state=indeterminate]:bg-primary/90 peer-focus-visible:ring-2 peer-focus-visible:ring-[hsl(var(--state-focus))] peer-focus-visible:ring-offset-2 peer-disabled:opacity-[var(--state-disabled-opacity)] data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
  {
    variants: {
      size: {
        default: "size-4",
        sm: "size-3.5",
        lg: "size-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type">,
    VariantProps<typeof checkboxVariants> {
  /** Renders an indeterminate (dash) state instead of a check. */
  indeterminate?: boolean;
}

function Checkbox({ className, size, indeterminate, checked, ...props }: CheckboxProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resolvedRef = ref || inputRef;

  React.useEffect(() => {
    if (typeof resolvedRef === "object" && resolvedRef?.current) {
      resolvedRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate, resolvedRef]);

  return (
    <span className={cn("relative inline-flex size-6 shrink-0 items-center justify-center", className)}>
      <input
        ref={resolvedRef}
        type="checkbox"
        checked={checked}
        className="peer absolute inset-0 z-10 size-full cursor-[var(--cursor-action)] opacity-0 disabled:cursor-[var(--cursor-disabled)]"
        data-slot="checkbox"
        {...props}
      />
      <span
        aria-hidden="true"
        data-state={indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"}
        data-size={size}
        className={checkboxVariants({ size })}
      >
        {indeterminate ? (
          <Minus className="size-3" />
        ) : checked ? (
          <Check className="size-3" />
        ) : null}
      </span>
    </span>
  );
}
Checkbox.displayName = "Checkbox";

const ForwardedCheckbox = React.forwardRef(Checkbox);

export { ForwardedCheckbox as Checkbox, checkboxVariants };
