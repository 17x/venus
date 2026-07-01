import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const buttonSource = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");
const badgeSource = readFileSync(new URL("./badge.tsx", import.meta.url), "utf8");
const cardSource = readFileSync(new URL("./card.tsx", import.meta.url), "utf8");
const inputSource = readFileSync(new URL("./input.tsx", import.meta.url), "utf8");
const selectSource = readFileSync(new URL("./select.tsx", import.meta.url), "utf8");
const navSource = readFileSync(new URL("./collapsible-nav.tsx", import.meta.url), "utf8");
const globalsSource = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");
const vectorButtonSource = readFileSync(new URL("../../vector/primitives/button.tsx", import.meta.url), "utf8");
const vectorSelectSource = readFileSync(new URL("../../vector/primitives/select.tsx", import.meta.url), "utf8");
const vectorTabsSource = readFileSync(new URL("../../vector/primitives/tabs.tsx", import.meta.url), "utf8");

describe("commercial interaction states", () => {
  it("gives primary primitives explicit cursor, hover, active, and focus states", () => {
    for (const source of [buttonSource, badgeSource, cardSource, inputSource, selectSource, navSource]) {
      assert.match(source, /cursor-/);
      assert.match(source, /hover:/);
      assert.match(source, /active:/);
      assert.match(source, /focus/);
    }
  });

  it("keeps CSS fallbacks for consumers that import styles without Tailwind scanning sources", () => {
    assert.match(globalsSource, /\[data-slot="button"\]:hover/);
    assert.match(globalsSource, /\[data-slot="button"\]:active/);
    assert.match(globalsSource, /\[data-slot="button"\]:focus-visible/);
    assert.match(globalsSource, /\[data-slot="badge"\]:hover/);
    assert.match(globalsSource, /\[data-slot="card"\]\[data-variant="interactive"\]:active/);
    assert.match(globalsSource, /\[data-slot="input"\]:focus-visible/);
    assert.match(globalsSource, /input,\ntextarea \{\n  cursor: text;/);
  });

  it("keeps the vector primitive entry aligned with the main UI entry", () => {
    for (const source of [vectorButtonSource, vectorSelectSource, vectorTabsSource]) {
      assert.match(source, /cursor-pointer/);
      assert.match(source, /hover:/);
      assert.match(source, /active:/);
      assert.match(source, /focus/);
    }
  });
});
