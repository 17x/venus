"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { type ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";

interface SelectState {
  controlSize: ControlSize;
  describedBy?: string;
  disabled: boolean;
  validation: ValidationTone;
}

const SelectStateContext = React.createContext<SelectState>({
  controlSize: "md",
  disabled: false,
  validation: "default"
});

export type SelectProps<Value, Multiple extends boolean | undefined = false> =
  SelectPrimitive.Root.Props<Value, Multiple> & {
    controlSize?: ControlSize;
    validation?: ValidationTone;
  };

function Select<Value, Multiple extends boolean | undefined = false>({
  controlSize = "md",
  disabled,
  validation,
  ...props
}: SelectProps<Value, Multiple>) {
  const fieldState = useFieldState();
  const state = React.useMemo<SelectState>(
    () => ({
      controlSize,
      describedBy: fieldState.describedBy,
      disabled: disabled ?? fieldState.disabled,
      validation: validation ?? fieldState.validation
    }),
    [controlSize, disabled, fieldState.describedBy, fieldState.disabled, fieldState.validation, validation]
  );

  return (
    <SelectStateContext.Provider value={state}>
      <SelectPrimitive.Root disabled={state.disabled} {...props} />
    </SelectStateContext.Provider>
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("min-w-0 flex-1 truncate text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  children,
  className,
  disabled,
  ...props
}: SelectPrimitive.Trigger.Props) {
  const state = React.useContext(SelectStateContext);

  return (
    <SelectPrimitive.Trigger
      aria-describedby={[ariaDescribedBy, state.describedBy].filter(Boolean).join(" ") || undefined}
      aria-invalid={ariaInvalid ?? (state.validation === "error" ? true : undefined)}
      data-control-size={state.controlSize}
      data-slot="select-trigger"
      data-validation={state.validation}
      disabled={disabled ?? state.disabled}
      className={cn(
        "flex w-full cursor-[var(--cursor-action)] items-center justify-between gap-2 rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] px-3 text-sm leading-5 text-foreground shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] active:border-ring/60 focus-visible:border-ring focus-visible:bg-[hsl(var(--control-bg))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus)/0.16)] focus-visible:ring-offset-0 aria-expanded:border-ring aria-expanded:bg-[hsl(var(--control-bg))] aria-invalid:border-destructive aria-invalid:bg-[hsl(var(--state-invalid-bg))] aria-invalid:ring-2 aria-invalid:ring-destructive/15 data-placeholder:text-muted-foreground disabled:cursor-[var(--cursor-disabled)] disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-[var(--state-disabled-opacity)] data-[control-size=sm]:h-8 data-[control-size=sm]:px-2.5 data-[control-size=sm]:text-xs data-[control-size=md]:h-9 data-[control-size=lg]:h-10 data-[control-size=lg]:px-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDown aria-hidden="true" className="text-muted-foreground" />} />
    </SelectPrimitive.Trigger>
  );
}

export interface SelectContentProps
  extends SelectPrimitive.Popup.Props,
    Pick<SelectPrimitive.Positioner.Props, "align" | "alignItemWithTrigger" | "alignOffset" | "side" | "sideOffset"> {}

function SelectContent({
  align = "start",
  alignItemWithTrigger = false,
  alignOffset = 0,
  children,
  className,
  side = "bottom",
  sideOffset = 6,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        alignOffset={alignOffset}
        className="isolate outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-40 origin-(--transform-origin) overflow-hidden rounded-lg border bg-card text-card-foreground shadow-[var(--shadow-popover)] outline-none",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="max-h-72 overflow-y-auto p-1">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />;
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({ children, className, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-8 w-full cursor-[var(--cursor-action)] select-none items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-xs outline-none transition-colors data-disabled:pointer-events-none data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)] data-highlighted:bg-[hsl(var(--state-hover))] data-highlighted:text-foreground",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="pointer-events-none absolute right-2 inline-flex [&_svg:not([class*='size-'])]:size-4">
        <Check aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: SelectPrimitive.ScrollUpArrow.Props) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn("flex min-h-7 w-full cursor-[var(--cursor-action)] items-center justify-center bg-card text-muted-foreground transition-colors hover:bg-[hsl(var(--state-hover))] hover:text-foreground [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      <ChevronUp aria-hidden="true" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({ className, ...props }: SelectPrimitive.ScrollDownArrow.Props) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn("flex min-h-7 w-full cursor-[var(--cursor-action)] items-center justify-center bg-card text-muted-foreground transition-colors hover:bg-[hsl(var(--state-hover))] hover:text-foreground [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      <ChevronDown aria-hidden="true" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
};
