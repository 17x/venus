#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Declares one executable M2 validation step.
 */
const M2_STEPS = [
  {
    id: "M2-01",
    title: "M1 baseline guard",
    command: "pnpm",
    args: ["regression:m1-core"],
  },
  {
    id: "M2-02",
    title: "Path transform session regression",
    command: "node",
    args: [
      "--test",
      "src/runtime/interaction/transformSessionRotation.test.ts",
    ],
  },
  {
    id: "M2-02B",
    title: "Path anchor edit policy regression",
    command: "node",
    args: [
      "--test",
      "src/product/runtime/pathAnchorEditPolicy/pathAnchorEditPolicy.test.ts",
    ],
  },
  {
    id: "M2-02C",
    title: "Path topology policy regression",
    command: "node",
    args: [
      "--test",
      "src/product/runtime/pathAnchorEditPolicy/pathAnchorEditTopologyPolicy.test.ts",
    ],
  },
  {
    id: "M2-03",
    title: "Path preview commit policy regression",
    command: "node",
    args: [
      "--test",
      "src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts",
    ],
  },
  {
    id: "M2-04",
    title: "Style drag resolver regression",
    command: "node",
    args: [
      "--test",
      "src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts",
    ],
  },
  {
    id: "M2-04B",
    title: "Selection mixed-style policy regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/product/runtime/__tests__/selectionMixedStylePolicy.test.ts",
    ],
  },
  {
    id: "M2-04C",
    title: "Text-runs modify policy regression",
    command: "node",
    args: [
      "--test",
      "src/product/useEditorRuntime/__tests__/elementModifyTextRunsPolicy.test.ts",
    ],
  },
  {
    id: "M2-04D",
    title: "Engine text paragraph projection regression",
    command: "node",
    args: [
      "--test",
      "src/runtime/presets/engineSceneAdapter/engineSceneAdapter.text/engineSceneAdapter.text.test.ts",
    ],
  },
  {
    id: "M2-05",
    title: "Snapping policy regression",
    command: "node",
    args: [
      "--test",
      "src/product/runtime/__tests__/runtimeSnappingPolicyBehavior.test.ts",
    ],
  },
  {
    id: "M2-06",
    title: "Normalized document runtime regression",
    command: "node",
    args: [
      "--test",
      "src/runtime/model/document-runtime/__tests__/normalizedDocumentRuntime.test.ts",
    ],
  },
  {
    id: "M2-07",
    title: "Normalized history patches regression",
    command: "node",
    args: [
      "--test",
      "src/runtime/model/document-runtime/__tests__/normalizedHistoryPatches.test.ts",
    ],
  },
  {
    id: "M2-07B",
    title: "Document governance product-spec regression",
    command: "node",
    args: [
      "--test",
      "src/testing/product-specs/document-structure/document-governance.contract.test.ts",
    ],
  },
  {
    id: "M2-08",
    title: "Worker scope binding regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/runtime/worker/scope/__tests__/bindEditorWorkerScope.test.ts",
    ],
  },
  {
    id: "M2-09",
    title: "Remote normalized apply regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/runtime/worker/scope/operations/operations.remoteNormalizedApply.test.ts",
    ],
  },
  {
    id: "M2-10",
    title: "Remote patches normalized order regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/runtime/worker/scope/remotePatches/remotePatches.normalizedOrder.test.ts",
    ],
  },
  {
    id: "M2-11",
    title: "Scene patches normalized apply regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/runtime/worker/scope/scenePatches/scenePatches.normalizedApply.test.ts",
    ],
  },
  {
    id: "M2-11B",
    title: "Boolean path-editability regression",
    command: "pnpm",
    args: [
      "dlx",
      "tsx",
      "--test",
      "src/runtime/worker/scope/shapeCommandHelpers/shapeCommandHelpers.booleanPathEdit.test.ts",
    ],
  },
  {
    id: "M2-12",
    title: "TypeScript gate",
    command: "pnpm",
    args: ["exec", "tsc", "-p", "tsconfig.app.json", "--noEmit"],
  },
  {
    id: "M2-13",
    title: "Performance baseline gate",
    command: "pnpm",
    args: ["perf:baseline:check"],
  },
];

/**
 * Resolves script directory path.
 * @returns {string} Absolute directory path of this script file.
 */
function resolveScriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * Executes one validation step.
 * @param {{id: string, title: string, command: string, args: string[]}} step One M2 run-all step.
 * @param {string} cwd Working directory for command execution.
 * @returns {{id: string, title: string, passed: boolean, output: string}} Step result.
 */
function runStep(step, cwd) {
  const result = spawnSync(step.command, step.args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  return {
    id: step.id,
    title: step.title,
    passed: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

/**
 * Prints one concise step summary.
 * @param {{id: string, title: string, passed: boolean, output: string}} stepResult Step result payload.
 */
function printStepSummary(stepResult) {
  const marker = stepResult.passed ? "PASS" : "FAIL";
  console.log(`[${marker}] ${stepResult.id} ${stepResult.title}`);
  if (!stepResult.passed && stepResult.output.length > 0) {
    console.log(stepResult.output);
  }
}

/**
 * Executes M2 run-all validation pipeline.
 */
function main() {
  const appRoot = path.resolve(resolveScriptDir(), "..");
  const results = [];

  for (const step of M2_STEPS) {
    const stepResult = runStep(step, appRoot);
    results.push(stepResult);
    printStepSummary(stepResult);
    if (!stepResult.passed) {
      break;
    }
  }

  const passedCount = results.filter((result) => result.passed).length;
  console.log(`M2 run-all summary: ${passedCount}/${M2_STEPS.length} passed`);

  if (passedCount !== M2_STEPS.length) {
    process.exit(1);
  }
}

main();
