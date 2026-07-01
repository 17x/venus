import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const alertSource = readFileSync(new URL("./alert.tsx", import.meta.url), "utf8");
const badgeSource = readFileSync(new URL("./badge.tsx", import.meta.url), "utf8");
const cardSource = readFileSync(new URL("./card.tsx", import.meta.url), "utf8");
const separatorSource = readFileSync(new URL("./separator.tsx", import.meta.url), "utf8");
const skeletonSource = readFileSync(new URL("./skeleton.tsx", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const themeMenuSource = readFileSync(new URL("../theme/theme-menu.tsx", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("commercial component surface", () => {
  it("exports a semantic alert primitive with production states", () => {
    assert.match(indexSource, /AlertDescription/);
    assert.match(alertSource, /role=\{variant === "destructive" \? "alert" : "status"\}/);
    assert.match(alertSource, /success:/);
    assert.match(alertSource, /warning:/);
    assert.match(alertSource, /destructive:/);
  });

  it("supports status badges and card density variants", () => {
    assert.match(badgeSource, /success:/);
    assert.match(badgeSource, /warning:/);
    assert.match(badgeSource, /amber:/);
    assert.match(badgeSource, /info:/);
    assert.match(cardSource, /interactive:/);
    assert.match(cardSource, /density:/);
    assert.match(indexSource, /type CardProps/);
  });

  it("makes utility primitives configurable instead of decorative-only", () => {
    assert.match(separatorSource, /orientation\?: "horizontal" \| "vertical"/);
    assert.match(separatorSource, /role=\{decorative \? "none" : "separator"\}/);
    assert.match(skeletonSource, /avatar:/);
    assert.match(skeletonSource, /card:/);
  });

  it("upgrades theme switching for click, keyboard, and touch workflows", () => {
    assert.match(themeMenuSource, /aria-expanded=\{open\}/);
    assert.match(themeMenuSource, /event\.key === "Escape"/);
    assert.match(themeMenuSource, /pointerdown/);
    assert.match(themeMenuSource, /shadow-\[var\(--shadow-popover\)\]/);
  });

  it("defines reusable commercial state and surface tokens", () => {
    assert.match(globalsSource, /--state-success/);
    assert.match(globalsSource, /--state-warning/);
    assert.match(globalsSource, /--state-info/);
    assert.match(globalsSource, /--shadow-popover/);
    assert.match(globalsSource, /\[data-ui-scroll\]/);
  });
});
