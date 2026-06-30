import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");

describe("button primitive", () => {
  it("keeps icon sizing local to the primitive", () => {
    assert.match(source, /\[&_svg\]:shrink-0/);
    assert.match(source, /\[&_svg:not\(\[class\*='size-'\]\)\]:size-4/);
  });
});
