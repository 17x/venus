import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const inputSource = readFileSync(new URL("./input.tsx", import.meta.url), "utf8");
const selectSource = readFileSync(new URL("./select.tsx", import.meta.url), "utf8");
const nativeSelectSource = readFileSync(new URL("./native-select.tsx", import.meta.url), "utf8");
const compactSource = readFileSync(new URL("./compact-field.tsx", import.meta.url), "utf8");
const controlSizeSource = readFileSync(new URL("./control-size.ts", import.meta.url), "utf8");
const fieldSource = readFileSync(new URL("./field.tsx", import.meta.url), "utf8");
const fieldStateSource = readFileSync(new URL("./field-state.ts", import.meta.url), "utf8");
const inputGroupSource = readFileSync(new URL("./input-group.tsx", import.meta.url), "utf8");
const numberInputSource = readFileSync(new URL("./number-input.tsx", import.meta.url), "utf8");
const checkboxSource = readFileSync(new URL("./checkbox.tsx", import.meta.url), "utf8");
const sliderSource = readFileSync(new URL("./slider.tsx", import.meta.url), "utf8");
const tooltipSource = readFileSync(new URL("./tooltip.tsx", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("form controls", () => {
  it("share invalid state affordances across inputs and selects", () => {
    for (const source of [inputSource, selectSource, nativeSelectSource]) {
      assert.match(source, /aria-invalid:border-destructive/);
      assert.match(source, /aria-invalid:bg-\[hsl\(var\(--state-invalid-bg\)\)\]/);
      assert.match(source, /aria-invalid:ring-destructive\/15/);
    }
  });

  it("surfaces compact field errors with visual state and semantic aria-invalid", () => {
    assert.match(compactSource, /data-invalid=\{Boolean\(error\) \|\| undefined\}/);
    assert.match(compactSource, /data-\[invalid=true\]:border-destructive/);
    assert.match(compactSource, /aria-invalid=\{Boolean\(error\)\}/);
    assert.match(compactSource, /text-destructive/);
  });

  it("uses one explicit form-size scale with a coarse-pointer target fallback", () => {
    assert.match(controlSizeSource, /type ControlSize = "sm" \| "md" \| "lg"/);
    assert.match(controlSizeSource, /sm: "h-8/);
    assert.match(controlSizeSource, /md: "h-9/);
    assert.match(controlSizeSource, /lg: "h-10/);
    assert.match(globalsSource, /@media \(pointer: coarse\)/);
    assert.match(globalsSource, /min-block-size: 2\.75rem/);
  });

  it("provides responsive fields and composed text and number inputs", () => {
    assert.match(fieldSource, /md:grid-cols-2/);
    assert.match(fieldSource, /xl:grid-cols-3/);
    assert.match(fieldSource, /orientation:/);
    assert.match(inputGroupSource, /InputGroupAddon/);
    assert.match(inputGroupSource, /InputGroupButton/);
    assert.match(inputGroupSource, /items-center overflow-hidden rounded-\[var\(--radius-md\)\]/);
    assert.match(inputGroupSource, /\[&>\[data-slot=button\]\]:h-full/);
    assert.match(inputGroupSource, /\[&>\[data-slot=button\]\]:rounded-none/);
    assert.match(numberInputSource, /@base-ui\/react\/number-field/);
    assert.match(numberInputSource, /NumberFieldPrimitive\.Increment/);
    assert.match(numberInputSource, /NumberFieldPrimitive\.Decrement/);
    assert.match(numberInputSource, /data-slot="number-input-stepper"/);
    assert.match(numberInputSource, /grid-rows-2/);
    assert.match(indexSource, /type NumberInputProps/);
  });

  it("uses themed Base UI selects while retaining an explicit native fallback", () => {
    assert.match(selectSource, /@base-ui\/react\/select/);
    assert.match(selectSource, /SelectPrimitive\.Portal/);
    assert.match(selectSource, /SelectPrimitive\.Positioner/);
    assert.match(selectSource, /SelectPrimitive\.Group/);
    assert.match(selectSource, /data-highlighted:bg-/);
    assert.match(nativeSelectSource, /React\.SelectHTMLAttributes<HTMLSelectElement>/);
    assert.match(indexSource, /NativeSelect/);
  });

  it("gives selection controls direct pointer behavior and visible hover feedback", () => {
    assert.match(checkboxSource, /peer-hover:scale-105/);
    assert.match(checkboxSource, /peer-hover:border-primary/);
    assert.match(sliderSource, /@base-ui\/react\/slider/);
    assert.match(sliderSource, /SliderPrimitive\.Control/);
    assert.match(sliderSource, /SliderPrimitive\.Thumb/);
    assert.match(sliderSource, /group-hover\/slider:scale-110/);
    assert.doesNotMatch(sliderSource, /type="range"/);
    assert.doesNotMatch(sliderSource, /transition-\[left\]/);
  });

  it("propagates disabled and validation state from fields to controls", () => {
    assert.match(fieldStateSource, /"default" \| "success" \| "warning" \| "error"/);
    assert.match(fieldSource, /FieldStateContext\.Provider/);
    assert.match(fieldSource, /FieldMessage/);
    assert.match(fieldSource, /registerDescription/);
    assert.match(fieldSource, /aria-live="polite"/);
    for (const source of [inputSource, nativeSelectSource]) {
      assert.match(source, /useFieldState/);
      assert.match(source, /resolvedValidation === "error"/);
      assert.match(source, /disabled=\{resolvedDisabled\}/);
      assert.match(source, /fieldState\.describedBy/);
    }
    assert.match(selectSource, /useFieldState/);
    assert.match(selectSource, /validation: validation \?\? fieldState\.validation/);
    assert.match(selectSource, /aria-invalid=\{ariaInvalid \?\? \(state\.validation === "error"/);
    assert.match(selectSource, /disabled=\{state\.disabled\}/);
    assert.match(selectSource, /state\.describedBy/);
  });

  it("uses one optional tooltip composition contract for interactive triggers", () => {
    assert.match(tooltipSource, /function WithTooltip/);
    assert.match(tooltipSource, /content\?: React\.ReactNode/);
    assert.match(tooltipSource, /return children/);
    assert.match(tooltipSource, /TooltipTrigger delay=\{delay\} render=\{children\}/);
    assert.match(indexSource, /type WithTooltipProps/);
  });
});
