import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveCreateEngineFrame } from "../../orchestration/render-planning/createEngineFrameResolver";

/**
 * Resolves absolute path for engine test baseline configuration.
 */
function resolveEngineTestBaselinePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../ai/engine-test-baselines-2026-05-23.json");
}

/**
 * Reads benchmark baseline settings from versioned test baseline configuration.
 */
async function readBenchmarkBaseline(): Promise<{
  iterations: number;
  maxAverageMsPerIteration: number;
}> {
  const baselineSource = await fs.readFile(resolveEngineTestBaselinePath(), "utf8");
  const baseline = JSON.parse(baselineSource) as {
    performanceBenchmark: {
      framePlanning: {
        iterations: number;
        maxAverageMsPerIteration: number;
      };
    };
  };
  return baseline.performanceBenchmark.framePlanning;
}

/**
 * Runs one deterministic frame-planning benchmark loop and returns aggregated timing metrics.
 * @param iterations Number of benchmark iterations.
 */
function runFramePlanningBenchmark(iterations: number): {
  iterations: number;
  elapsedMs: number;
  averageMsPerIteration: number;
} {
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    resolveCreateEngineFrame({
      scene: { nodeCount: 12000 + (index % 200) },
      viewport: {
        width: 1920,
        height: 1080,
        offsetX: index % 500,
        offsetY: index % 500,
        scale: 1 + (index % 5) * 0.1,
      },
      performance: {
        culling: true,
        overscanBorderPx: 128,
      },
      policy: {
        profile: "interaction",
        preset: "high",
        budget: {
          drawBudgetMs: 6,
          uploadBudgetBytes: 3_000_000,
          frameBudgetMs: 16,
        },
      },
      interactionActive: index % 2 === 0,
      nowMs: index * 16,
      lastInteractionAtMs: index * 16 - 24,
      lastInteractionKind: index % 3 === 0 ? "pan" : "zoom",
      cameraAnimationActive: false,
      cameraCachePreviewOnly: true,
      settleDelayMs: 120,
      tileQueuePendingCount: index % 96,
      dirtyRegionCount: index % 16,
    });
  }

  const elapsedMs = Math.max(0, performance.now() - startedAt);
  return {
    iterations,
    elapsedMs,
    averageMsPerIteration: iterations > 0 ? elapsedMs / iterations : 0,
  };
}

/**
 * Verifies benchmark harness emits deterministic, finite metrics within configured baseline threshold.
 */
test("performance benchmark harness reports finite frame-planning metrics", async () => {
  const benchmarkBaseline = await readBenchmarkBaseline();
  const metrics = runFramePlanningBenchmark(benchmarkBaseline.iterations);

  assert.equal(metrics.iterations, benchmarkBaseline.iterations);
  assert.equal(Number.isFinite(metrics.elapsedMs), true);
  assert.equal(Number.isFinite(metrics.averageMsPerIteration), true);
  assert.equal(metrics.elapsedMs >= 0, true);
  assert.equal(metrics.averageMsPerIteration >= 0, true);
  assert.equal(
    metrics.averageMsPerIteration <= benchmarkBaseline.maxAverageMsPerIteration,
    true,
    `frame-planning benchmark average exceeded baseline threshold: ${metrics.averageMsPerIteration}`,
  );
});
