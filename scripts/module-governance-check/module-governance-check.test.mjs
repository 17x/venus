import test from "node:test";
import assert from "node:assert/strict";

import { runGovernanceChecks } from "./module-governance-check.mjs";

test("governance check passes vector scope", () => {
  const result = runGovernanceChecks("vector");
  assert.equal(result.issues.length, 0);
});

test("governance check passes lib scope", () => {
  const result = runGovernanceChecks("lib");
  assert.equal(result.issues.length, 0);
});

test("governance check passes primitive scope", () => {
  const result = runGovernanceChecks("primitive");
  assert.equal(result.issues.length, 0);
});

test("governance check passes all scope", () => {
  const result = runGovernanceChecks("all");
  assert.equal(result.issues.length, 0);
});
