import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveThemeName, themeNames } from "./config";

describe("theme config", () => {
  it("keeps a stable default and accepts known themes", () => {
    assert.equal(resolveThemeName("missing"), "classic-light");
    assert.equal(resolveThemeName("classic-dark"), "classic-dark");
    assert.deepEqual([...themeNames], ["classic-light", "classic-dark", "cartoon"]);
  });
});
