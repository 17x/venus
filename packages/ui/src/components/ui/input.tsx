import * as React from "react";

import { cn } from "../../lib/utils";
import { controlSizeClassNames, type ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  controlSize?: ControlSize;
  validation?: ValidationTone;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, className, controlSize = "md", disabled, type, validation, ...props }, ref) => {
    const fieldState = useFieldState();
    const resolvedValidation = validation ?? fieldState.validation;
    const resolvedDisabled = disabled ?? fieldState.disabled;

    return (
      <input
        ref={ref}
        type={type}
        aria-describedby={[ariaDescribedBy, fieldState.describedBy].filter(Boolean).join(" ") || undefined}
        aria-invalid={ariaInvalid ?? (resolvedValidation === "error" ? true : undefined)}
        data-control-size={controlSize}
        data-slot="input"
        data-validation={resolvedValidation}
        disabled={resolvedDisabled}
        className={cn(
          "flex w-full cursor-text rounded-md border border-input bg-[hsl(var(--control-bg))] py-1.5 leading-4 shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground hover:border-ring/30 hover:bg-[hsl(var(--control-bg-hover))] active:border-ring/40 active:bg-background focus-visible:border-ring/45 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted disabled:opacity-[var(--state-disabled-opacity)]",
          controlSizeClassNames[controlSize],
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
