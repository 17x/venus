"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as React from "react";

import { cn } from "../../lib/utils";

export interface SwitchProps extends SwitchPrimitive.Root.Props {}

const Switch = React.forwardRef<HTMLElement, SwitchProps>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      "inline-flex h-6 w-10 shrink-0 cursor-[var(--cursor-action)] items-center rounded-full border border-input bg-muted p-0.5 outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/40 hover:bg-[hsl(var(--state-hover))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-2 data-checked:border-primary data-checked:bg-primary data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)]",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className="pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform data-checked:translate-x-4"
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
