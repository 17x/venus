import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const avatarSource = readFileSync(new URL("./avatar.tsx", import.meta.url), "utf8");
const checkboxSource = readFileSync(new URL("./checkbox.tsx", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("./dialog.tsx", import.meta.url), "utf8");
const progressSource = readFileSync(new URL("./progress.tsx", import.meta.url), "utf8");
const switchSource = readFileSync(new URL("./switch.tsx", import.meta.url), "utf8");
const tabsSource = readFileSync(new URL("./tabs.tsx", import.meta.url), "utf8");
const tooltipSource = readFileSync(new URL("./tooltip.tsx", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("UI foundation contracts", () => {
  it("uses behavior primitives for composite widgets", () => {
    assert.match(dialogSource, /@base-ui\/react\/dialog/);
    assert.match(dialogSource, /DialogPrimitive\.Title/);
    assert.match(dialogSource, /aria-label="Close dialog"/);
    assert.match(tabsSource, /@base-ui\/react\/tabs/);
    assert.match(tooltipSource, /@base-ui\/react\/tooltip/);
    assert.match(tooltipSource, /aria-describedby=\{ariaDescribedBy \?\? tooltipId\}/);
    assert.match(tooltipSource, /role="tooltip"/);
    assert.match(switchSource, /@base-ui\/react\/switch/);
  });

  it("provides named pending states and image fallbacks", () => {
    assert.match(avatarSource, /AvatarPrimitive\.Fallback/);
    assert.match(progressSource, /label: string/);
    assert.match(progressSource, /aria-label=\{showLabel \? undefined : label\}/);
    assert.match(indexSource, /EmptyDescription/);
    assert.match(indexSource, /type SpinnerProps/);
  });

  it("defines input, focus, motion, contrast, and forced-color fallbacks", () => {
    assert.match(checkboxSource, /inline-flex size-6/);
    assert.match(checkboxSource, /peer-focus-visible:ring-2/);
    assert.match(globalsSource, /--target-min-size: 2rem/);
    assert.match(globalsSource, /:focus-visible/);
    assert.match(globalsSource, /@media \(hover: none\)/);
    assert.match(globalsSource, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(globalsSource, /@media \(prefers-contrast: more\)/);
    assert.match(globalsSource, /@media \(forced-colors: active\)/);
  });
});
