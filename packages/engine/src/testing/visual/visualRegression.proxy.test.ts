import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { vectorDenseSceneScenarioProfile } from "../../kernel/profiles/scenario/vector-dense-scene-profile";

/**
 * Resolves absolute path for engine test baseline configuration.
 */
function resolveEngineTestBaselinePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../ai/engine-test-baselines-2026-05-23.json");
}

/**
 * Reads visual regression proxy baseline from versioned test baseline configuration.
 */
async function readVisualRegressionProxyBaseline(): Promise<{
  vectorDenseSceneSignature: string;
}> {
  const baselineSource = await fs.readFile(resolveEngineTestBaselinePath(), "utf8");
  const baseline = JSON.parse(baselineSource) as {
    visualRegression: {
      proxy: {
        vectorDenseSceneSignature: string;
      };
    };
  };
  return baseline.visualRegression.proxy;
}

/**
 * Creates deterministic visual-regression proxy signature from scenario manifest fields.
 * @param profile Scenario profile with manifest payload.
 */
function resolveVisualProxySignature(profile: {
  scenarioManifest?: {
    replay: {
      viewportStates: readonly Array<{
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
        scale: number;
      }>;
      documentChangeSets: readonly Array<{
        id: string;
      }>;
    };
  };
}): string {
  const manifest = profile.scenarioManifest;
  assert.ok(manifest);

  const viewportSignature = manifest.replay.viewportStates
    .map((viewport) => `${viewport.width}x${viewport.height}@${viewport.offsetX},${viewport.offsetY},${viewport.scale}`)
    .join("|");
  const changeSetSignature = manifest.replay.documentChangeSets
    .map((changeSet) => changeSet.id)
    .join("|");

  return `${viewportSignature}::${changeSetSignature}`;
}

/**
 * Verifies visual-regression proxy signature is stable for vector dense scene scenario profile.
 */
test("visual regression proxy signature stays deterministic", () => {
  const firstSignature = resolveVisualProxySignature(vectorDenseSceneScenarioProfile);
  const secondSignature = resolveVisualProxySignature(vectorDenseSceneScenarioProfile);

  assert.equal(firstSignature, secondSignature);
  assert.equal(firstSignature.length > 0, true);
});

/**
 * Verifies visual regression proxy signature matches versioned baseline value.
 */
test("visual regression proxy signature matches baseline", async () => {
  const baseline = await readVisualRegressionProxyBaseline();
  const signature = resolveVisualProxySignature(vectorDenseSceneScenarioProfile);

  assert.equal(signature, baseline.vectorDenseSceneSignature);
});
