import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { FieldStateContext, type ValidationTone } from "./field-state";

const fieldGroupVariants = cva("grid gap-3", {
  variants: {
    columns: {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
    }
  },
  defaultVariants: { columns: 1 }
});

export interface FieldGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldGroupVariants> {}

const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, columns, ...props }, ref) => (
    <div ref={ref} data-slot="field-group" className={cn(fieldGroupVariants({ columns }), className)} {...props} />
  )
);
FieldGroup.displayName = "FieldGroup";

const fieldVariants = cva("group/field min-w-0 gap-1.5", {
  variants: {
    orientation: {
      vertical: "flex flex-col",
      horizontal: "grid grid-cols-[minmax(7rem,0.35fr)_minmax(0,1fr)] items-start gap-x-3 [&>[data-slot=field-label]]:pt-2",
      responsive: "flex flex-col sm:grid sm:grid-cols-[minmax(7rem,0.35fr)_minmax(0,1fr)] sm:items-start sm:gap-x-3 sm:[&>[data-slot=field-label]]:pt-2"
    }
  },
  defaultVariants: { orientation: "vertical" }
});

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldVariants> {
  disabled?: boolean;
  validation?: ValidationTone;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, disabled = false, orientation, validation = "default", ...props }, ref) => {
    const [descriptionIds, setDescriptionIds] = React.useState<string[]>([]);
    const registerDescription = React.useCallback((id: string) => {
      setDescriptionIds((current) => current.includes(id) ? current : [...current, id]);
      return () => setDescriptionIds((current) => current.filter((item) => item !== id));
    }, []);
    const state = React.useMemo(
      () => ({
        describedBy: descriptionIds.length > 0 ? descriptionIds.join(" ") : undefined,
        disabled,
        registerDescription,
        validation
      }),
      [descriptionIds, disabled, registerDescription, validation]
    );

    return (
      <FieldStateContext.Provider value={state}>
        <div
          ref={ref}
          data-disabled={disabled || undefined}
          data-slot="field"
          data-orientation={orientation ?? "vertical"}
          data-validation={validation}
          className={cn(fieldVariants({ orientation }), className)}
          {...props}
        />
      </FieldStateContext.Provider>
    );
  }
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} data-slot="field-label" className={cn("cursor-default text-xs font-medium leading-4 group-data-[disabled=true]/field:opacity-[var(--state-disabled-opacity)] group-data-[validation=error]/field:text-destructive group-data-[validation=warning]/field:text-[hsl(var(--state-warning))] group-data-[validation=success]/field:text-[hsl(var(--state-success))]", className)} {...props} />
  )
);
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? generatedId;
    const { registerDescription } = React.useContext(FieldStateContext);
    React.useEffect(() => registerDescription?.(resolvedId), [registerDescription, resolvedId]);

    return <p ref={ref} id={resolvedId} data-slot="field-description" className={cn("text-xs leading-4 text-muted-foreground", className)} {...props} />;
  }
);
FieldDescription.displayName = "FieldDescription";

const FieldMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, id, role, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? generatedId;
    const { registerDescription, validation } = React.useContext(FieldStateContext);
    React.useEffect(() => registerDescription?.(resolvedId), [registerDescription, resolvedId]);

    return (
      <p
        ref={ref}
        id={resolvedId}
        aria-live="polite"
        role={role ?? (validation === "error" ? "alert" : undefined)}
        data-slot="field-message"
        className={cn(
          "text-xs leading-4 text-muted-foreground group-data-[validation=error]/field:text-destructive group-data-[validation=warning]/field:text-[hsl(var(--state-warning))] group-data-[validation=success]/field:text-[hsl(var(--state-success))]",
          className
        )}
        {...props}
      />
    );
  }
);
FieldMessage.displayName = "FieldMessage";

const FieldContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="field-content" className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props} />
  )
);
FieldContent.displayName = "FieldContent";

const FieldTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="field-title" className={cn("text-xs font-medium leading-none", className)} {...props} />
  )
);
FieldTitle.displayName = "FieldTitle";

const FieldSet = React.forwardRef<HTMLFieldSetElement, React.FieldsetHTMLAttributes<HTMLFieldSetElement>>(
  ({ className, ...props }, ref) => (
    <fieldset ref={ref} data-slot="field-set" className={cn("flex min-w-0 flex-col gap-3", className)} {...props} />
  )
);
FieldSet.displayName = "FieldSet";

const FieldLegend = React.forwardRef<HTMLLegendElement, React.HTMLAttributes<HTMLLegendElement>>(
  ({ className, ...props }, ref) => (
    <legend ref={ref} data-slot="field-legend" className={cn("mb-1 text-sm font-semibold", className)} {...props} />
  )
);
FieldLegend.displayName = "FieldLegend";

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldMessage,
  FieldSet,
  FieldTitle,
  fieldGroupVariants,
  fieldVariants
};
