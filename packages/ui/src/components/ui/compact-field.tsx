import * as React from "react";

import { Field, FieldDescription, FieldLabel } from "./field";
import { Input, type InputProps } from "./input";
import { Select, type SelectProps } from "./select";
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
          data-invalid={Boolean(error) || undefined}
          className="flex h-8 min-w-0 cursor-text items-center rounded-md border border-input bg-background transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--state-hover))] active:border-ring/35 active:bg-[hsl(var(--state-active))] focus-within:border-ring/45 focus-within:bg-background focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus))] focus-within:ring-offset-1 data-[invalid=true]:border-destructive data-[invalid=true]:bg-[hsl(var(--state-invalid-bg))] data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/20"
        >
          <FieldLabel htmlFor={fieldId} className="max-w-[45%] shrink-0 truncate px-2 text-xs font-medium text-muted-foreground">
            {label}
          </FieldLabel>
          {prefix ? <span className="shrink-0 px-1 text-xs text-muted-foreground">{prefix}</span> : null}
          <Input
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
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

type CompactSelectFieldProps = CompactBaseProps & SelectProps;

const CompactSelectField = React.forwardRef<HTMLSelectElement, CompactSelectFieldProps>(
  ({ children, className, description, error, id, label, suffix, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <Field data-invalid={Boolean(error) || undefined} className="gap-1">
        <div
          data-invalid={Boolean(error) || undefined}
          className="flex h-8 min-w-0 cursor-[var(--cursor-action)] items-center rounded-md border border-input bg-background transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--state-hover))] active:border-ring/35 active:bg-[hsl(var(--state-active))] focus-within:border-ring/45 focus-within:bg-background focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus))] focus-within:ring-offset-1 data-[invalid=true]:border-destructive data-[invalid=true]:bg-[hsl(var(--state-invalid-bg))] data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/20"
        >
          <FieldLabel htmlFor={fieldId} className="max-w-[45%] shrink-0 truncate px-2 text-xs font-medium text-muted-foreground">
            {label}
          </FieldLabel>
          <Select
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            className={cn("h-7 min-w-0 flex-1 border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0", className)}
            {...props}
          >
            {children}
          </Select>
          {suffix ? <label htmlFor={fieldId} className="shrink-0 cursor-pointer px-2 text-xs text-muted-foreground">{suffix}</label> : null}
        </div>
        {error || description ? <FieldDescription className={cn(error && "text-destructive")}>{error ?? description}</FieldDescription> : null}
      </Field>
    );
  }
);
CompactSelectField.displayName = "CompactSelectField";

export { CompactInputField, CompactSelectField };
