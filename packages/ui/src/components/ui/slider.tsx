"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "value" | "defaultValue"> {
  /** Controlled value. */
  value?: number;
  /** Default uncontrolled value. */
  defaultValue?: number;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Step increment. */
  step?: number;
  /** Called on value change. */
  onValueChange?: (value: number) => void;
  /** Optional label displayed above the slider. */
  label?: string;
  /** Shows the current numeric value next to the slider. */
  showValue?: boolean;
  /** Size variant. */
  size?: "default" | "sm";
}

function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  label,
  showValue,
  size = "default",
  className,
  disabled,
  ...props
}: SliderProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const resolvedValue = isControlled ? controlledValue : internalValue;

  const trackPercent = max > min
    ? ((resolvedValue - min) / (max - min)) * 100
    : 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  const generatedId = React.useId();

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || showValue) ? (
        <div className="flex items-center justify-between">
          {label ? (
            <label htmlFor={generatedId} className="text-xs font-medium text-muted-foreground">
              {label}
            </label>
          ) : <span />}
          {showValue ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {resolvedValue}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        data-slot="slider"
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          size === "sm" ? "h-4" : "h-5",
        )}
      >
        <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${trackPercent}%` }}
          />
        </div>
        <input
          ref={ref}
          id={generatedId}
          type="range"
          value={resolvedValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            "absolute inset-0 w-full cursor-[var(--cursor-action)] opacity-0",
            disabled && "cursor-not-allowed",
          )}
          {...props}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm transition-[left]",
            size === "sm" ? "size-3" : "size-4",
          )}
          style={{ left: `calc(${trackPercent}% - ${size === "sm" ? "6px" : "8px"})` }}
        />
      </div>
    </div>
  );
}
Slider.displayName = "Slider";

const ForwardedSlider = React.forwardRef(Slider);

export { ForwardedSlider as Slider };
