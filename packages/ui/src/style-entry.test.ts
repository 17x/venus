import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  exports: Record<string, string>;
};
const stylesUrl = new URL("./styles.css", import.meta.url);
const stylesSource = readFileSync(stylesUrl, "utf8");
const vectorStylesUrl = new URL("./vector/styles.css", import.meta.url);
const vectorStylesSource = readFileSync(vectorStylesUrl, "utf8");

describe("style entry", () => {
  it("keeps the aggregate style file resolvable", () => {
    assert.equal(existsSync(stylesUrl), true);
  });

  it("exports only app-neutral styles from the default entry", () => {
    assert.equal(packageJson.exports["./styles.css"], "./src/styles.css");
    assert.match(stylesSource, /@import "\.\/globals\.css"/);
    assert.doesNotMatch(stylesSource, /vector\/styles\.css/);
  });

  it("keeps vector dependencies in the vector style entry", () => {
    assert.equal(packageJson.exports["./vector/styles.css"], "./src/vector/styles.css");
    assert.match(vectorStylesSource, /@import "tailwindcss"/);
    assert.match(vectorStylesSource, /@import "shadcn\/tailwind\.css"/);
  });
});
