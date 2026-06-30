import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./collapsible-nav.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

describe("collapsible nav primitive", () => {
  it("uses a controlled tree structure with default-open branches", () => {
    assert.match(source, /collectOpenState/);
    assert.match(source, /aria-expanded/);
    assert.match(source, /item\.defaultOpen \?\? true/);
    assert.match(source, /depth \* 14/);
    assert.match(source, /paddingLeft: rowIndent/);
    assert.match(source, /role=\{depth === 0 \? "tree" : "group"\}/);
    assert.match(source, /role="treeitem"/);
    assert.match(source, /type="button"/);
    assert.match(source, /CollapsibleNavItem/);
  });

  it("sets action cursors for common interactive elements", () => {
    assert.match(globals, /summary,/);
    assert.match(globals, /\[role="button"\]/);
    assert.match(globals, /textarea:disabled/);
  });
});
