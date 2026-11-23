import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const inputSource = readFileSync(new URL("./input.tsx", import.meta.url), "utf8");
const selectSource = readFileSync(new URL("./select.tsx", import.meta.url), "utf8");
const compactSource = readFileSync(new URL("./compact-field.tsx", import.meta.url), "utf8");
const controlSizeSource = readFileSync(new URL("./control-size.ts", import.meta.url), "utf8");
const fieldSource = readFileSync(new URL("./field.tsx", import.meta.url), "utf8");
const fieldStateSource = readFileSync(new URL("./field-state.ts", import.meta.url), "utf8");
const inputGroupSource = readFileSync(new URL("./input-group.tsx", import.meta.url), "utf8");
const numberInputSource = readFileSync(new URL("./number-input.tsx", import.meta.url), "utf8");
const tooltipSource = readFileSync(new URL("./tooltip.tsx", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("form controls", () => {
  it("share invalid state affordances across inputs and selects", () => {
    for (const source of [inputSource, selectSource]) {
      assert.match(source, /aria-invalid:border-destructive/);
      assert.match(source, /aria-invalid:bg-\[hsl\(var\(--state-invalid-bg\)\)\]/);
      assert.match(source, /aria-invalid:ring-destructive\/20/);
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
    assert.match(controlSizeSource, /sm: "h-7/);
    assert.match(controlSizeSource, /md: "h-8/);
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
    assert.match(numberInputSource, /@base-ui\/react\/number-field/);
    assert.match(numberInputSource, /NumberFieldPrimitive\.Increment/);
    assert.match(numberInputSource, /NumberFieldPrimitive\.Decrement/);
    assert.match(indexSource, /type NumberInputProps/);
  });

  it("propagates disabled and validation state from fields to controls", () => {
    assert.match(fieldStateSource, /"default" \| "success" \| "warning" \| "error"/);
    assert.match(fieldSource, /FieldStateContext\.Provider/);
    assert.match(fieldSource, /FieldMessage/);
    assert.match(fieldSource, /registerDescription/);
    assert.match(fieldSource, /aria-live="polite"/);
    for (const source of [inputSource, selectSource]) {
      assert.match(source, /useFieldState/);
      assert.match(source, /resolvedValidation === "error"/);
      assert.match(source, /disabled=\{resolvedDisabled\}/);
      assert.match(source, /fieldState\.describedBy/);
    }
  });

  it("uses one optional tooltip composition contract for interactive triggers", () => {
    assert.match(tooltipSource, /function WithTooltip/);
    assert.match(tooltipSource, /content\?: React\.ReactNode/);
    assert.match(tooltipSource, /return children/);
    assert.match(tooltipSource, /TooltipTrigger delay=\{delay\} render=\{children\}/);
    assert.match(indexSource, /type WithTooltipProps/);
  });
});
