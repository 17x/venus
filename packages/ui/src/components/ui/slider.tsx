"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "../../lib/utils";
import { useFieldState } from "./field-state";

export interface SliderProps
  extends Omit<SliderPrimitive.Root.Props<number>, "defaultValue" | "onValueChange" | "value"> {
  /** Controlled value. */
  value?: number;
  /** Default uncontrolled value. */
  defaultValue?: number;
  /** Called continuously while pointer or keyboard interaction changes the value. */
  onValueChange?: (value: number) => void;
  /** Accessible and optionally visible control label. */
  label?: string;
  /** Shows the current numeric value next to the label. */
  showValue?: boolean;
  /** Visual density; interaction targets still expand for coarse pointers. */
  size?: "default" | "sm";
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      "aria-label": ariaLabel,
      className,
      defaultValue = 0,
      disabled,
      label,
      max = 100,
      min = 0,
      onValueChange,
      showValue,
      size = "default",
      step = 1,
      value,
      ...props
    },
    ref
  ) => {
    const fieldState = useFieldState();
    const resolvedDisabled = disabled ?? fieldState.disabled;
    const accessibleLabel = label ?? ariaLabel ?? "Value";

    return (
      <SliderPrimitive.Root
        ref={ref}
        aria-label={ariaLabel}
        className={cn("flex w-full flex-col gap-1.5", className)}
        data-disabled={resolvedDisabled || undefined}
        data-size={size}
        data-slot="slider"
        defaultValue={defaultValue}
        disabled={resolvedDisabled}
        max={max}
        min={min}
        onValueChange={onValueChange}
        step={step}
        value={value}
        {...props}
      >
        {label || showValue ? (
          <div className="flex items-center justify-between gap-3">
            {label ? (
              <SliderPrimitive.Label className="text-xs font-medium text-muted-foreground">
                {label}
              </SliderPrimitive.Label>
            ) : <span />}
            {showValue ? (
              <SliderPrimitive.Value className="font-mono text-xs tabular-nums text-muted-foreground">
                {(formattedValues) => formattedValues[0]}
              </SliderPrimitive.Value>
            ) : null}
          </div>
        ) : null}
        <SliderPrimitive.Control
          data-slot="slider-control"
          className={cn(
            "group/slider relative flex w-full touch-none select-none items-center py-1.5 data-disabled:cursor-[var(--cursor-disabled)] data-dragging:cursor-grabbing",
            size === "sm" ? "min-h-4" : "min-h-5"
          )}
        >
          <SliderPrimitive.Track
            data-slot="slider-track"
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary transition-[background-color,box-shadow] group-hover/slider:bg-[hsl(var(--state-hover))] group-hover/slider:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] group-data-disabled/slider:opacity-[var(--state-disabled-opacity)]"
          >
            <SliderPrimitive.Indicator data-slot="slider-indicator" className="rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            getAriaLabel={() => accessibleLabel}
            className={cn(
              "rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-[box-shadow,transform] group-hover/slider:scale-110 focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-2 data-dragging:scale-110 data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)]",
              size === "sm" ? "size-3" : "size-4"
            )}
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
