"use client";

import * as React from "react";
import { Circle } from "lucide-react";

import { cn } from "../../lib/utils";

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled value of the selected radio item. */
  value?: string;
  /** Default uncontrolled value. */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onValueChange?: (value: string) => void;
  /** Label for the radio group (rendered as a fieldset legend). */
  label?: string;
  /** Disables all radio items in the group. */
  disabled?: boolean;
  /** Layout direction. */
  orientation?: "horizontal" | "vertical";
}

export interface RadioItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** The value this radio represents. */
  value: string;
  /** Optional label text rendered next to the radio. */
  label?: string;
}

function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  label,
  disabled,
  orientation = "vertical",
  className,
  children,
  ...props
}: RadioGroupProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const selectedValue = isControlled ? controlledValue : internalValue;

  const contextValue = React.useMemo(
    () => ({
      selectedValue,
      disabled: disabled ?? false,
      onSelect: (nextValue: string) => {
        if (!isControlled) {
          setInternalValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
    }),
    [selectedValue, disabled, isControlled, onValueChange],
  );

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        ref={ref}
        role="radiogroup"
        aria-label={label}
        data-orientation={orientation}
        className={cn(
          "flex gap-2",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
          className,
        )}
        {...props}
      >
        {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
RadioGroup.displayName = "RadioGroup";

const ForwardedRadioGroup = React.forwardRef(RadioGroup);

interface RadioGroupContextValue {
  selectedValue: string;
  disabled: boolean;
  onSelect: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({
  selectedValue: "",
  disabled: false,
  onSelect: () => {},
});

function RadioItem({ value, label, className, disabled, id, ...props }: RadioItemProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const generatedId = React.useId();
  const itemId = id ?? generatedId;
  const { selectedValue, disabled: groupDisabled, onSelect } = React.useContext(RadioGroupContext);
  const isSelected = selectedValue === value;
  const isDisabled = groupDisabled || disabled;

  return (
    <label
      htmlFor={itemId}
      className={cn(
        "inline-flex cursor-[var(--cursor-action)] items-center gap-2 rounded-md py-0.5 text-sm outline-none transition-colors",
        isDisabled ? "cursor-not-allowed opacity-50" : "hover:text-foreground",
        className,
      )}
    >
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={itemId}
          type="radio"
          value={value}
          checked={isSelected}
          disabled={isDisabled}
          className="sr-only"
          data-slot="radio"
          onChange={() => {
            if (!isDisabled) {
              onSelect(value);
            }
          }}
          {...props}
        />
        <span
          aria-hidden="true"
          data-state={isSelected ? "checked" : "unchecked"}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border border-input transition-[background-color,border-color,color,box-shadow]",
            isSelected && "border-primary",
          )}
        >
          {isSelected ? (
            <Circle className="size-2 fill-primary text-primary" />
          ) : null}
        </span>
      </span>
      {label ? <span className="select-none">{label}</span> : null}
    </label>
  );
}
RadioItem.displayName = "RadioItem";

const ForwardedRadioItem = React.forwardRef(RadioItem);

export { ForwardedRadioGroup as RadioGroup, ForwardedRadioItem as RadioItem };
