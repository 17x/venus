"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import type { ControlSize } from "./control-size";
import { useFieldState, type ValidationTone } from "./field-state";
import { Input, type InputProps } from "./input";
import { Textarea, type TextareaProps } from "./textarea";

const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 items-center rounded-md border border-input bg-[hsl(var(--control-bg))] shadow-[var(--shadow-control)] outline-none transition-[background-color,border-color,box-shadow] hover:border-ring/30 hover:bg-[hsl(var(--control-bg-hover))] focus-within:border-ring/45 focus-within:bg-background focus-within:ring-2 focus-within:ring-[hsl(var(--state-focus))] focus-within:ring-offset-1 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:bg-[hsl(var(--state-invalid-bg))] has-[[aria-invalid=true]]:ring-2 has-[[aria-invalid=true]]:ring-destructive/20 has-[[data-align=block-start]]:h-auto has-[[data-align=block-end]]:h-auto has-[[data-align=block-start]]:flex-col has-[[data-align=block-end]]:flex-col has-[textarea]:h-auto data-disabled:cursor-[var(--cursor-disabled)] data-disabled:bg-muted data-disabled:opacity-[var(--state-disabled-opacity)]",
  {
    variants: {
      controlSize: {
        sm: "h-7",
        md: "h-8",
        lg: "h-10"
      }
    },
    defaultVariants: { controlSize: "md" }
  }
);

export interface InputGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof inputGroupVariants>, "controlSize"> {
  controlSize?: ControlSize;
  disabled?: boolean;
  validation?: ValidationTone;
}

const InputGroupStateContext = React.createContext({
  disabled: false,
  validation: "default" as ValidationTone
});

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, controlSize = "md", disabled, validation, ...props }, ref) => {
    const fieldState = useFieldState();
    const resolvedDisabled = disabled ?? fieldState.disabled;
    const resolvedValidation = validation ?? fieldState.validation;

    return (
      <InputGroupStateContext.Provider value={{ disabled: resolvedDisabled, validation: resolvedValidation }}>
        <div
          ref={ref}
          data-control-size={controlSize}
          data-disabled={resolvedDisabled || undefined}
          data-slot="input-group"
          data-validation={resolvedValidation}
          className={cn(inputGroupVariants({ controlSize }), className)}
          {...props}
        />
      </InputGroupStateContext.Provider>
    );
  }
);
InputGroup.displayName = "InputGroup";

const inputGroupAddonVariants = cva(
  "flex shrink-0 cursor-text items-center justify-center gap-1.5 text-xs text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-2",
        "inline-end": "order-last pr-2",
        "block-start": "order-first w-full justify-start px-2.5 pt-2",
        "block-end": "order-last w-full justify-start px-2.5 pb-2"
      }
    },
    defaultVariants: { align: "inline-start" }
  }
);

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupAddonVariants> {}

function InputGroupAddon({ className, align = "inline-start", onClick, ...props }: InputGroupAddonProps) {
  return (
    <div
      data-align={align}
      data-slot="input-group-addon"
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !(event.target as HTMLElement).closest("button")) {
          event.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus();
        }
      }}
      {...props}
    />
  );
}

export interface InputGroupButtonProps extends Omit<ButtonProps, "size"> {
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
}

function InputGroupButton({ className, disabled, size = "icon-sm", type = "button", variant = "ghost", ...props }: InputGroupButtonProps) {
  const buttonSize = size === "sm" ? "sm" : size;
  const groupState = React.useContext(InputGroupStateContext);

  return (
    <Button
      type={type}
      size={buttonSize}
      variant={variant}
      className={cn("shrink-0 shadow-none", className)}
      disabled={disabled ?? groupState.disabled}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="input-group-text" className={cn("flex items-center gap-1.5 whitespace-nowrap", className)} {...props} />;
}

export interface InputGroupInputProps extends Omit<InputProps, "controlSize"> {}

const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(({ className, disabled, validation, ...props }, ref) => {
  const groupState = React.useContext(InputGroupStateContext);

  return (
    <Input
      ref={ref}
      data-slot="input-group-control"
      disabled={disabled ?? groupState.disabled}
      validation={validation ?? groupState.validation}
      className={cn("h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent", className)}
      {...props}
    />
  );
});
InputGroupInput.displayName = "InputGroupInput";

export interface InputGroupTextareaProps extends Omit<TextareaProps, "controlSize"> {}

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(({ className, disabled, validation, ...props }, ref) => {
  const groupState = React.useContext(InputGroupStateContext);

  return (
    <Textarea
      ref={ref}
      data-slot="input-group-control"
      disabled={disabled ?? groupState.disabled}
      validation={validation ?? groupState.validation}
      className={cn("min-h-20 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent", className)}
      {...props}
    />
  );
});
InputGroupTextarea.displayName = "InputGroupTextarea";

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  inputGroupAddonVariants,
  inputGroupVariants
};
