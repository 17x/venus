import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const inputSource = readFileSync(new URL("./input.tsx", import.meta.url), "utf8");
const selectSource = readFileSync(new URL("./select.tsx", import.meta.url), "utf8");
const compactSource = readFileSync(new URL("./compact-field.tsx", import.meta.url), "utf8");

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
});
