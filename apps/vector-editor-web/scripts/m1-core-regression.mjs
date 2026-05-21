#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Declares one core regression test entry for M1 key-path acceptance.
 */
const CORE_REGRESSION_TESTS = [
  {
    id: "R1",
    name: "pointer lifecycle state machine",
    file: "src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts",
  },
  {
    id: "R2",
    name: "editing mode transition guard",
    file: "src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts",
  },
  {
    id: "R3",
    name: "hit priority policy behavior",
    file: "src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts",
  },
  {
    id: "R4",
    name: "selection filter policy behavior",
    file: "src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts",
  },
  {
    id: "R5",
    name: "pointer release commit policy",
    file: "src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts",
  },
  {
    id: "R6",
    name: "snapping policy behavior",
    file: "src/product/runtime/__tests__/runtimeSnappingPolicyBehavior.test.ts",
  },
  {
    id: "R7",
    name: "interaction diagnostic policy",
    file: "src/product/runtime/__tests__/runtimeInteractionDiagnosticPolicy.test.ts",
  },
  {
    id: "R8",
    name: "shape style drag resolver behavior",
    file: "src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts",
  },
  {
    id: "R9",
    name: "runtime input normalization events",
    file: "src/runtime/events/index/index.test.ts",
  },
  {
    id: "R10",
    name: "transform session rotation behavior",
    file: "src/runtime/interaction/transformSessionRotation.test.ts",
  },
];

/**
 * Resolves script directory as absolute path for deterministic cwd selection.
 * @returns {string} Absolute script directory path.
 */
function resolveScriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * Executes one Node test file and returns pass/fail with execution metadata.
 * @param {{id: string, name: string, file: string}} entry Core regression test descriptor.
 * @param {string} cwd Working directory for command execution.
 * @returns {{id: string, name: string, file: string, passed: boolean, output: string}} Test result summary.
 */
function runCoreRegressionTest(entry, cwd) {
  const run = spawnSync("node", ["--test", entry.file], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
  return {
    id: entry.id,
    name: entry.name,
    file: entry.file,
    passed: run.status === 0,
    output,
  };
}

/**
 * Prints concise regression summary for CI and local execution.
 * @param {Array<{id: string, name: string, file: string, passed: boolean, output: string}>} results Regression run results.
 */
function printSummary(results) {
  for (const result of results) {
    const marker = result.passed ? "PASS" : "FAIL";
    console.log(`[${marker}] ${result.id} ${result.name}`);
    if (!result.passed && result.output.length > 0) {
      console.log(result.output);
    }
  }

  const passCount = results.filter((result) => result.passed).length;
  console.log(
    `M1 core regression summary: ${passCount}/${results.length} passed`,
  );
}

/**
 * Runs all M1 core regression tests and exits non-zero on any failure.
 */
function main() {
  const appRoot = path.resolve(resolveScriptDir(), "..");
  const results = CORE_REGRESSION_TESTS.map((entry) =>
    runCoreRegressionTest(entry, appRoot),
  );
  printSummary(results);

  const hasFailure = results.some((result) => !result.passed);
  if (hasFailure) {
    process.exit(1);
  }
}

main();
