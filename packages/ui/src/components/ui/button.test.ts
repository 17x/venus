import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");

describe("button primitive", () => {
  it("keeps icon sizing local to the primitive", () => {
    assert.match(source, /\[&_svg\]:shrink-0/);
    assert.match(source, /\[&_svg:not\(\[class\*='size-'\]\)\]:size-4/);
  });

  it("supports destructive and invalid commercial states", () => {
    assert.match(source, /destructive:/);
    assert.match(source, /aria-invalid:border-destructive/);
  });

  it("implements asChild instead of only marking it as data", () => {
    assert.match(source, /React\.cloneElement/);
    assert.match(source, /data-as-child/);
  });
});
