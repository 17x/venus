import * as React from "react";

import { cn } from "../../lib/utils";
import { controlSizeClassNames, type ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  controlSize?: ControlSize;
  validation?: ValidationTone;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, className, controlSize = "md", disabled, validation, ...props }, ref) => {
    const fieldState = useFieldState();
    const resolvedValidation = validation ?? fieldState.validation;
    const resolvedDisabled = disabled ?? fieldState.disabled;

    return (
      <select
        ref={ref}
        aria-describedby={[ariaDescribedBy, fieldState.describedBy].filter(Boolean).join(" ") || undefined}
        aria-invalid={ariaInvalid ?? (resolvedValidation === "error" ? true : undefined)}
        data-control-size={controlSize}
        data-slot="select"
        data-validation={resolvedValidation}
        disabled={resolvedDisabled}
        className={cn(
          "flex w-full cursor-[var(--cursor-action)] rounded-md border border-input bg-[hsl(var(--control-bg))] py-1.5 leading-4 shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--control-bg-hover))] active:border-ring/40 active:bg-background focus-visible:border-ring/45 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted disabled:opacity-[var(--state-disabled-opacity)]",
          controlSizeClassNames[controlSize],
          className
        )}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";

export { Select };
