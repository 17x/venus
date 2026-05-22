#!/usr/bin/env node

import { spawnSync } from "node:child_process";

/**
 * Intent: run one shell command and fail fast when the command exits non-zero.
 * @param {string} command Command binary to execute.
 * @param {string[]} args Command arguments.
 * @param {string} label Human-readable gate label used in logs.
 */
function runStep(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      `CUTOVER_PARITY_FAIL ${label} (exit=${result.status ?? "unknown"})`,
    );
  }
}

/**
 * Intent: execute canonical and legacy parity suites for R5 cutover readiness.
 */
function main() {
  runStep(
    "pnpm",
    [
      "--filter",
      "@venus/engine",
      "exec",
      "node",
      "--import",
      "tsx",
      "--test",
      "src/testing/*.parity.test.ts",
      "src/testing/canonicalVnext.parity-smoke.test.mjs",
    ],
    "canonical-engine-parity",
  );

  runStep(
    "pnpm",
    [
      "--filter",
      "@venus/engine-legacy",
      "exec",
      "node",
      "--import",
      "tsx",
      "--test",
      "src/runtime/release/runtimeRelease.parity.test.ts",
    ],
    "legacy-engine-parity",
  );

  console.log(
    "[cutover-parity] PASS: canonical and legacy parity gates succeeded.",
  );
}

main();
