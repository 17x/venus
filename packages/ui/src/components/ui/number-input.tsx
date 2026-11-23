"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import type { ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";
import { WithTooltip } from "./tooltip";

export interface NumberInputProps extends NumberFieldPrimitive.Root.Props {
  controlSize?: ControlSize;
  decrementLabel?: string;
  decrementTooltip?: React.ReactNode;
  incrementLabel?: string;
  incrementTooltip?: React.ReactNode;
  inputProps?: NumberFieldPrimitive.Input.Props;
  validation?: ValidationTone;
}

const NumberInput = React.forwardRef<HTMLDivElement, NumberInputProps>(
  (
    {
      className,
      controlSize = "md",
      decrementLabel = "Decrease value",
      decrementTooltip,
      disabled,
      incrementLabel = "Increase value",
      incrementTooltip,
      inputProps,
      validation,
      ...props
    },
    ref
  ) => {
    const fieldState = useFieldState();
    const resolvedValidation = validation ?? fieldState.validation;
    const resolvedDisabled = disabled ?? fieldState.disabled;

    return (
      <NumberFieldPrimitive.Root
        ref={ref}
        data-control-size={controlSize}
        data-disabled={resolvedDisabled || undefined}
        data-slot="number-input"
        data-validation={resolvedValidation}
        disabled={resolvedDisabled}
        className={cn("group/number-input w-full min-w-0", className)}
        {...props}
      >
      <NumberFieldPrimitive.Group
        data-slot="number-input-group"
        data-validation={resolvedValidation}
        className={cn(
          "flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-[hsl(var(--control-bg))] shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--control-bg-hover))] focus-within:border-ring/45 focus-within:bg-background focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus))] focus-within:ring-offset-1 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:bg-[hsl(var(--state-invalid-bg))] has-[[aria-invalid=true]]:ring-destructive/20 group-data-disabled/number-input:cursor-[var(--cursor-disabled)] group-data-disabled/number-input:bg-muted group-data-disabled/number-input:opacity-[var(--state-disabled-opacity)]",
          controlSize === "sm" && "h-7",
          controlSize === "md" && "h-8",
          controlSize === "lg" && "h-10"
        )}
      >
        <NumberFieldPrimitive.Input
          {...inputProps}
          aria-describedby={[inputProps?.["aria-describedby"], fieldState.describedBy].filter(Boolean).join(" ") || undefined}
          aria-invalid={inputProps?.["aria-invalid"] ?? (resolvedValidation === "error" ? true : undefined)}
          data-slot="number-input-control"
          className={cn(
            "min-w-0 flex-1 bg-transparent px-2.5 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)]",
            controlSize === "lg" && "px-3 text-sm",
            inputProps?.className
          )}
        />
        <WithTooltip content={decrementTooltip}>
          <NumberFieldPrimitive.Decrement
            aria-label={decrementLabel}
            data-slot="number-input-decrement"
            className="inline-flex min-w-7 cursor-[var(--cursor-action)] items-center justify-center border-l bg-transparent text-muted-foreground outline-none transition-colors hover:bg-[hsl(var(--state-hover))] hover:text-foreground focus-visible:bg-[hsl(var(--state-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--state-focus))] data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)]"
          >
            <ChevronDown aria-hidden="true" />
          </NumberFieldPrimitive.Decrement>
        </WithTooltip>
        <WithTooltip content={incrementTooltip}>
          <NumberFieldPrimitive.Increment
            aria-label={incrementLabel}
            data-slot="number-input-increment"
            className="inline-flex min-w-7 cursor-[var(--cursor-action)] items-center justify-center border-l bg-transparent text-muted-foreground outline-none transition-colors hover:bg-[hsl(var(--state-hover))] hover:text-foreground focus-visible:bg-[hsl(var(--state-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--state-focus))] data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)]"
          >
            <ChevronUp aria-hidden="true" />
          </NumberFieldPrimitive.Increment>
        </WithTooltip>
      </NumberFieldPrimitive.Group>
      </NumberFieldPrimitive.Root>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
