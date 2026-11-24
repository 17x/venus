import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const buttonSource = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");
const comboboxSource = readFileSync(new URL("./combobox.tsx", import.meta.url), "utf8");
const dropdownMenuSource = readFileSync(new URL("./dropdown-menu.tsx", import.meta.url), "utf8");
const errorSummarySource = readFileSync(new URL("./form-error-summary.tsx", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const popoverSource = readFileSync(new URL("./popover.tsx", import.meta.url), "utf8");
const sonnerSource = readFileSync(new URL("./sonner.tsx", import.meta.url), "utf8");

describe("P0 interaction components", () => {
  it("uses Base UI behavior for searchable selection and propagates field semantics", () => {
    assert.match(comboboxSource, /@base-ui\/react\/combobox/);
    assert.match(comboboxSource, /fieldState\.describedBy/);
    assert.match(comboboxSource, /aria-invalid/);
    assert.match(comboboxSource, /ComboboxPrimitive\.Empty/);
    assert.match(globalsSource, /\[data-slot="combobox-input"\]/);
    assert.match(globalsSource, /Form controls and composites render one semantic focus halo/);
    assert.match(globalsSource, /\[data-slot="combobox-input-group"\]/);
    assert.match(indexSource, /type ComboboxProps/);
  });

  it("composes menus and popovers without a parallel overlay stack", () => {
    assert.match(dropdownMenuSource, /@base-ui\/react\/menu/);
    assert.match(dropdownMenuSource, /CheckboxItem/);
    assert.match(dropdownMenuSource, /RadioItem/);
    assert.match(dropdownMenuSource, /SubmenuTrigger/);
    assert.match(popoverSource, /@base-ui\/react\/popover/);
    assert.doesNotMatch(dropdownMenuSource, /z-\d/);
    assert.doesNotMatch(popoverSource, /z-\d/);
  });

  it("provides actionable submission errors and semantic transient feedback", () => {
    assert.match(errorSummarySource, /tabIndex=\{-1\}/);
    assert.match(errorSummarySource, /href=\{error\.href \?\? `#\$\{error\.id\}`\}/);
    assert.match(sonnerSource, /from "sonner"/);
    assert.match(sonnerSource, /unstyled: true/);
    assert.match(indexSource, /FormErrorSummary/);
    assert.match(indexSource, /Toaster, toast/);
  });

  it("keeps loading state composable instead of adding a button-only API", () => {
    assert.doesNotMatch(buttonSource, /isLoading/);
  });
});
