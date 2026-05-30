import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

/**
 * Verifies the vector runtime governance check passes, confirming no direct @venus/engine
 * imports exist outside the engine-bridge boundary.
 */
test("vector runtime governance check keeps engine-bridge as only engine import surface", () => {
  const script = path.join(appRoot, "scripts", "runtime-governance-check.mjs");
  try {
    const output = execSync(`node ${script}`, {
      cwd: appRoot,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30000,
    });
    assert.equal(output.trim(), "[runtime-governance] ok");
  } catch (error) {
    assert.fail(`runtime-governance-check failed: ${error}`);
  }
});
