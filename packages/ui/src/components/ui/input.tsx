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
          "flex w-full cursor-text appearance-none rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] leading-5 text-foreground caret-primary shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground/80 hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] active:border-ring/60 focus-visible:border-ring focus-visible:bg-[hsl(var(--control-bg))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus)/0.16)] focus-visible:ring-offset-0 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/15 disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-[var(--state-disabled-opacity)]",
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
