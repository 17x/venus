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
          "field-sizing-content flex w-full resize-y cursor-text rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] leading-5 text-foreground caret-primary shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] focus-visible:border-ring focus-visible:bg-[hsl(var(--control-bg))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus)/0.16)] focus-visible:ring-offset-0 aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/15 disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-[var(--state-disabled-opacity)]",
          controlSize === "sm" && "min-h-16 px-2.5 py-2 text-xs",
          controlSize === "md" && "min-h-20 px-3 py-2.5 text-sm",
          controlSize === "lg" && "min-h-24 px-3.5 py-3 text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
