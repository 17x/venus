import * as React from "react";

import { Field, FieldDescription, FieldLabel } from "./field";
import { Input, type InputProps } from "./input";
import { NativeSelect, type NativeSelectProps } from "./native-select";
import { cn } from "../../lib/utils";

type CompactBaseProps = {
  description?: React.ReactNode;
  error?: React.ReactNode;
  label: React.ReactNode;
  suffix?: React.ReactNode;
};

type CompactInputFieldProps = CompactBaseProps &
  InputProps & {
    prefix?: React.ReactNode;
  };

const CompactInputField = React.forwardRef<HTMLInputElement, CompactInputFieldProps>(
  ({ className, description, error, id, label, prefix, suffix, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <Field data-invalid={Boolean(error) || undefined} className="gap-1">
        <div
          data-slot="compact-field-control"
          data-invalid={Boolean(error) || undefined}
          className="flex h-8 min-w-0 cursor-text items-center rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] shadow-[var(--shadow-control)] transition-[background-color,border-color,box-shadow] hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] focus-within:border-ring focus-within:bg-[hsl(var(--control-bg))] focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus)/0.16)] focus-within:ring-offset-0 data-[invalid=true]:border-destructive data-[invalid=true]:bg-[hsl(var(--state-invalid-bg))] data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/15"
        >
          <FieldLabel htmlFor={fieldId} className="max-w-[45%] shrink-0 truncate px-2 text-xs font-medium text-muted-foreground">
            {label}
          </FieldLabel>
          {prefix ? <span className="shrink-0 px-1 text-xs text-muted-foreground">{prefix}</span> : null}
          <Input
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            data-slot="compact-input-control"
            className={cn("h-7 min-w-0 flex-1 border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0", className)}
            {...props}
          />
          {suffix ? <label htmlFor={fieldId} className="shrink-0 cursor-pointer px-2 text-xs text-muted-foreground">{suffix}</label> : null}
        </div>
        {error || description ? <FieldDescription className={cn(error && "text-destructive")}>{error ?? description}</FieldDescription> : null}
      </Field>
    );
  }
);
CompactInputField.displayName = "CompactInputField";

type CompactSelectFieldProps = CompactBaseProps & NativeSelectProps;

const CompactSelectField = React.forwardRef<HTMLSelectElement, CompactSelectFieldProps>(
  ({ children, className, description, error, id, label, suffix, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <Field data-invalid={Boolean(error) || undefined} className="gap-1">
        <div
          data-slot="compact-field-control"
          data-invalid={Boolean(error) || undefined}
          className="flex h-8 min-w-0 cursor-[var(--cursor-action)] items-center rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] shadow-[var(--shadow-control)] transition-[background-color,border-color,box-shadow] hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] focus-within:border-ring focus-within:bg-[hsl(var(--control-bg))] focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus)/0.16)] focus-within:ring-offset-0 data-[invalid=true]:border-destructive data-[invalid=true]:bg-[hsl(var(--state-invalid-bg))] data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/15"
        >
          <FieldLabel htmlFor={fieldId} className="max-w-[45%] shrink-0 truncate px-2 text-xs font-medium text-muted-foreground">
            {label}
          </FieldLabel>
          <NativeSelect
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            data-slot="compact-select-control"
            className={cn("h-7 min-w-0 flex-1 border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0", className)}
            {...props}
          >
            {children}
          </NativeSelect>
          {suffix ? <label htmlFor={fieldId} className="shrink-0 cursor-pointer px-2 text-xs text-muted-foreground">{suffix}</label> : null}
        </div>
        {error || description ? <FieldDescription className={cn(error && "text-destructive")}>{error ?? description}</FieldDescription> : null}
      </Field>
    );
  }
);
CompactSelectField.displayName = "CompactSelectField";

export { CompactInputField, CompactSelectField };
