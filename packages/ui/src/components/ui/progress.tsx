"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "../../lib/utils";

export interface ProgressProps extends Omit<ProgressPrimitive.Root.Props, "children"> {
  label: string;
  showLabel?: boolean;
  showValue?: boolean;
}

function Progress({
  className,
  label,
  max = 100,
  min = 0,
  showLabel = false,
  showValue = false,
  value,
  ...props
}: ProgressProps) {
  const range = Math.max(max - min, 1);
  const percentage = value === null ? null : Math.min(100, Math.max(0, ((value - min) / range) * 100));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={showLabel ? undefined : label}
      className={cn("grid gap-1.5", className)}
      max={max}
      min={min}
      value={value}
      {...props}
    >
      {showLabel || showValue ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          {showLabel ? <ProgressPrimitive.Label>{label}</ProgressPrimitive.Label> : <span />}
          {showValue && value !== null ? <ProgressPrimitive.Value className="text-muted-foreground" /> : null}
        </div>
      ) : null}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          data-indeterminate={value === null || undefined}
          className="h-full rounded-full bg-primary transition-[width] data-indeterminate:w-2/5 data-indeterminate:animate-pulse"
          style={percentage === null ? undefined : { width: `${percentage}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
