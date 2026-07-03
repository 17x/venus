"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "../../lib/utils";

const checkboxVariants = cva(
  "peer inline-flex size-4 shrink-0 cursor-[var(--cursor-action)] items-center justify-center rounded border border-input text-primary-foreground shadow-sm outline-none transition-[background-color,border-color,color,box-shadow] hover:border-ring/40 focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
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
    <span className={cn("relative inline-flex items-center", className)}>
      <input
        ref={resolvedRef}
        type="checkbox"
        checked={checked}
        className="sr-only"
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
