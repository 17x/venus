import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createEngine, createTestSurface } from "../../index";

/**
 * Resolves absolute path for engine test baseline configuration.
 */
function resolveEngineTestBaselinePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../ai/engine-test-baselines-2026-05-23.json");
}

/**
 * Reads rendering snapshot proxy baseline from versioned test baseline configuration.
 */
async function readRenderingSnapshotProxyBaseline(): Promise<{
  drawCount: number;
  visibleCount: number;
  imageMimeType: string;
  imageDataUrl: string;
}> {
  const baselineSource = await fs.readFile(resolveEngineTestBaselinePath(), "utf8");
  const baseline = JSON.parse(baselineSource) as {
    renderingSnapshot: {
      proxy: {
        drawCount: number;
        visibleCount: number;
        imageMimeType: string;
        imageDataUrl: string;
      };
    };
  };
  return baseline.renderingSnapshot.proxy;
}

/**
 * Captures one deterministic rendering snapshot proxy from engine runtime outputs.
 */
async function captureRenderingSnapshotProxy(): Promise<{
  drawCount: number;
  visibleCount: number;
  imageMimeType: string;
  imageDataUrl: string;
}> {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter: {
      requestFrame: () => 1,
      cancelFrame: () => {},
      now: () => 64,
    },
  });

  await engine.ready();
  engine.setGraph({
    revision: 1,
    nodes: [
      { id: "snapshot-a", kind: "shape", x: 0, y: 0, z: 0, width: 120, height: 60, depth: 10 },
      { id: "snapshot-b", kind: "shape", x: 260, y: 220, z: 0, width: 90, height: 90, depth: 10 },
    ],
  });
  const renderOutput = await engine.render();
  const imageOutput = engine.captureImage();

  engine.dispose();

  return {
    drawCount: renderOutput.drawCount,
    visibleCount: renderOutput.visibleCount,
    imageMimeType: imageOutput.mimeType,
    imageDataUrl: imageOutput.dataUrl,
  };
}

/**
 * Verifies rendering snapshot proxy remains deterministic across repeated runs.
 */
test("rendering snapshot proxy remains deterministic", async () => {
  const baseline = await readRenderingSnapshotProxyBaseline();
  const firstSnapshot = await captureRenderingSnapshotProxy();
  const secondSnapshot = await captureRenderingSnapshotProxy();

  assert.deepEqual(firstSnapshot, secondSnapshot);
  assert.deepEqual(firstSnapshot, baseline);
});
