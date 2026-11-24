"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { type ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";

interface ComboboxState {
  controlSize: ControlSize;
  describedBy?: string;
  disabled: boolean;
  validation: ValidationTone;
}

const ComboboxStateContext = React.createContext<ComboboxState>({
  controlSize: "md",
  disabled: false,
  validation: "default"
});

export type ComboboxProps<Value, Multiple extends boolean | undefined = false> =
  ComboboxPrimitive.Root.Props<Value, Multiple> & {
    controlSize?: ControlSize;
    validation?: ValidationTone;
  };

function Combobox<Value, Multiple extends boolean | undefined = false>({
  controlSize = "md",
  disabled,
  validation,
  ...props
}: ComboboxProps<Value, Multiple>) {
  const fieldState = useFieldState();
  const state = React.useMemo<ComboboxState>(
    () => ({
      controlSize,
      describedBy: fieldState.describedBy,
      disabled: disabled ?? fieldState.disabled,
      validation: validation ?? fieldState.validation
    }),
    [controlSize, disabled, fieldState.describedBy, fieldState.disabled, fieldState.validation, validation]
  );

  return (
    <ComboboxStateContext.Provider value={state}>
      <ComboboxPrimitive.Root data-slot="combobox" disabled={state.disabled} {...props} />
    </ComboboxStateContext.Provider>
  );
}

function ComboboxInputGroup({ className, ...props }: ComboboxPrimitive.InputGroup.Props) {
  const state = React.useContext(ComboboxStateContext);

  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      data-control-size={state.controlSize}
      data-validation={state.validation}
      className={cn(
        "flex w-full items-center rounded-[var(--radius-md)] border border-input bg-[hsl(var(--control-bg))] shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/45 hover:bg-[hsl(var(--control-bg-hover))] focus-within:border-ring focus-within:bg-[hsl(var(--control-bg))] focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus)/0.16)] focus-within:ring-offset-0 data-disabled:cursor-[var(--cursor-disabled)] data-disabled:bg-muted/70 data-disabled:opacity-[var(--state-disabled-opacity)] data-[validation=error]:border-destructive data-[validation=error]:bg-[hsl(var(--state-invalid-bg))] data-[validation=error]:ring-2 data-[validation=error]:ring-destructive/15 data-[control-size=sm]:h-8 data-[control-size=md]:h-9 data-[control-size=lg]:h-10",
        className
      )}
      {...props}
    />
  );
}

function ComboboxInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  disabled,
  ...props
}: ComboboxPrimitive.Input.Props) {
  const state = React.useContext(ComboboxStateContext);

  return (
    <ComboboxPrimitive.Input
      aria-describedby={[ariaDescribedBy, state.describedBy].filter(Boolean).join(" ") || undefined}
      aria-invalid={ariaInvalid ?? (state.validation === "error" ? true : undefined)}
      data-slot="combobox-input"
      disabled={disabled ?? state.disabled}
      className={cn(
        "min-w-0 flex-1 cursor-text bg-transparent px-3 text-sm leading-5 text-foreground caret-primary outline-none placeholder:text-muted-foreground/80 disabled:cursor-[var(--cursor-disabled)] disabled:text-muted-foreground",
        state.controlSize === "sm" && "px-2.5 text-xs",
        state.controlSize === "lg" && "px-3.5",
        className
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      aria-label={props["aria-label"] ?? "Show options"}
      data-slot="combobox-trigger"
      className={cn(
        "inline-flex h-full shrink-0 cursor-[var(--cursor-action)] items-center justify-center px-2 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)] [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {props.children ?? <ChevronsUpDown aria-hidden="true" />}
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      aria-label={props["aria-label"] ?? "Clear selection"}
      data-slot="combobox-clear"
      className={cn(
        "inline-flex h-full shrink-0 cursor-[var(--cursor-action)] items-center justify-center px-2 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground disabled:cursor-[var(--cursor-disabled)] disabled:opacity-[var(--state-disabled-opacity)] [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {props.children ?? <X aria-hidden="true" />}
    </ComboboxPrimitive.Clear>
  );
}

export interface ComboboxContentProps
  extends ComboboxPrimitive.Popup.Props,
    Pick<ComboboxPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> {}

function ComboboxContent({
  align = "start",
  alignOffset = 0,
  className,
  side = "bottom",
  sideOffset = 6,
  ...props
}: ComboboxContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="isolate outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-44 origin-(--transform-origin) overflow-hidden rounded-lg border bg-card p-1 text-card-foreground shadow-[var(--shadow-popover)] outline-none",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("max-h-72 overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-2 py-6 text-center text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function ComboboxGroup(props: ComboboxPrimitive.Group.Props) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" {...props} />;
}

function ComboboxGroupLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function ComboboxItem({ children, className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex min-h-8 cursor-[var(--cursor-action)] select-none items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-xs outline-none transition-colors data-disabled:pointer-events-none data-disabled:cursor-[var(--cursor-disabled)] data-disabled:opacity-[var(--state-disabled-opacity)] data-highlighted:bg-[hsl(var(--state-hover))] data-highlighted:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 inline-flex [&_svg:not([class*='size-'])]:size-4">
        <Check aria-hidden="true" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger
};
