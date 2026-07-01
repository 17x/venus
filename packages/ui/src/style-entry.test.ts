import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  exports: Record<string, string>;
};
const stylesUrl = new URL("./styles.css", import.meta.url);
const stylesSource = readFileSync(stylesUrl, "utf8");

describe("style entry", () => {
  it("keeps the aggregate style file resolvable", () => {
    assert.equal(existsSync(stylesUrl), true);
  });

  it("exports the style entry for consumers that import css explicitly", () => {
    assert.equal(packageJson.exports["./styles.css"], "./src/styles.css");
    assert.match(stylesSource, /@import "\.\/globals\.css"/);
    assert.match(stylesSource, /@import "\.\/vector\/styles\.css"/);
  });
});
