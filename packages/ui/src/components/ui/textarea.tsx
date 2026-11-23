import * as React from "react";

import { cn } from "../../lib/utils";
import type { ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  controlSize?: ControlSize;
  validation?: ValidationTone;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, className, controlSize = "md", disabled, validation, ...props }, ref) => {
    const fieldState = useFieldState();
    const resolvedValidation = validation ?? fieldState.validation;
    const resolvedDisabled = disabled ?? fieldState.disabled;

    return (
      <textarea
        ref={ref}
        aria-describedby={[ariaDescribedBy, fieldState.describedBy].filter(Boolean).join(" ") || undefined}
        aria-invalid={ariaInvalid ?? (resolvedValidation === "error" ? true : undefined)}
        data-control-size={controlSize}
        data-slot="textarea"
        data-validation={resolvedValidation}
        disabled={resolvedDisabled}
        className={cn(
          "field-sizing-content flex w-full resize-y cursor-text rounded-md border border-input bg-[hsl(var(--control-bg))] leading-4 shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground hover:border-ring/30 hover:bg-[hsl(var(--control-bg-hover))] focus-visible:border-ring/45 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-1 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted disabled:opacity-[var(--state-disabled-opacity)]",
          controlSize === "sm" && "min-h-16 px-2 py-1.5 text-xs",
          controlSize === "md" && "min-h-20 px-2.5 py-2 text-xs",
          controlSize === "lg" && "min-h-24 px-3 py-2.5 text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
