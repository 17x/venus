import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute source path from testing folder.
 * @param {string} relativePath Relative file path from src/testing.
 */
function resolveSourcePath(relativePath) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, relativePath);
}

/**
 * Reads UTF-8 source file text for contract assertions.
 * @param {string} relativePath Relative file path from src/testing.
 */
async function readSource(relativePath) {
  return fs.readFile(resolveSourcePath(relativePath), "utf8");
}

/** Verifies lighting types declare all five canonical light entity tokens. */
test("lighting types declare five canonical light entity tokens", async () => {
  const source = await readSource(
    "../orchestration/api/public-types/lighting.types.ts",
  );
  const requiredTokens = [
    "EngineLightType",
    '"directional"',
    '"point"',
    '"spot"',
    '"ambient"',
    '"hemisphere"',
    "EngineDirectionalLight",
    "EnginePointLight",
    "EngineSpotLight",
    "EngineAmbientLight",
    "EngineHemisphereLight",
    "EngineLightEntity",
    "EngineLightCollection",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `lighting.types.ts must declare: ${token}`,
    );
  }
});

/** Verifies material types declare PBR, unlit, and custom material contracts. */
test("material types declare PBR metallic-roughness contract", async () => {
  const source = await readSource(
    "../orchestration/api/public-types/material.types.ts",
  );
  const requiredTokens = [
    "EngineMaterialType",
    '"pbr"',
    '"unlit"',
    '"custom"',
    "EnginePbrMaterial",
    "baseColor",
    "metallic",
    "roughness",
    "emissive",
    "normalScale",
    "aoStrength",
    "EngineUnlitMaterial",
    "EngineCustomMaterial",
    "EngineMaterialEntity",
    "EngineMaterialCollection",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `material.types.ts must declare: ${token}`,
    );
  }
});

/** Verifies animation types declare keyframe, channel, and clip contracts. */
test("animation types declare keyframe channel and clip contracts", async () => {
  const source = await readSource(
    "../orchestration/api/public-types/animation.types.ts",
  );
  const requiredTokens = [
    "EngineAnimationInterpolation",
    '"linear"',
    '"step"',
    '"cubicspline"',
    "EngineAnimationKeyframe",
    "EngineAnimationChannel",
    "EngineAnimationLoopMode",
    '"once"',
    '"loop"',
    '"pingpong"',
    "EngineAnimationClip",
    "EngineAnimationClipCollection",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `animation.types.ts must declare: ${token}`,
    );
  }
});

/** Verifies scene asset types declare canonical asset node and mesh contracts. */
test("scene asset types declare canonical asset abstraction", async () => {
  const source = await readSource(
    "../orchestration/api/public-types/scene-asset.types.ts",
  );
  const requiredTokens = [
    "EngineSceneAsset",
    "EngineSceneAssetMetadata",
    "EngineSceneAssetNode",
    "EngineSceneAssetMesh",
    "sourceFormat",
    "translation",
    "rotation",
    "scale",
    "positions",
    "normals",
    "uvs",
    "indices",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `scene-asset.types.ts must declare: ${token}`,
    );
  }
});

/** Verifies frustum types declare six-plane frustum and AABB intersection contracts. */
test("frustum types declare six-plane frustum and AABB intersection", async () => {
  const source = await readSource(
    "../kernel/interaction/camera/cameraFrustum.ts",
  );
  const requiredTokens = [
    "EngineCameraFrustumPlane",
    "EngineCameraFrustum",
    "EngineAABB3D",
    "deriveCameraFrustum",
    "frustumIntersectsAABB",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `cameraFrustum.ts must declare: ${token}`,
    );
  }
});

/** Verifies matrix4 types declare compose, invert, and multiply contracts. */
test("matrix4 types declare compose invert and multiply contracts", async () => {
  const source = await readSource("../../../lib/src/math/matrix4.ts");
  const requiredTokens = [
    "createIdentityMatrix4",
    "createTranslationMatrix4",
    "createScaleMatrix4",
    "composeMatrix4",
    "multiplyMatrices4",
    "invertMatrix4",
    "transformPoint3D",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `matrix4.ts must declare: ${token}`,
    );
  }
});

/** Verifies backend tier policy declares three-tier model and maturity matrix. */
test("backend tier policy declares three-tier model and maturity matrix", async () => {
  const source = await readSource("../../docs/backend-tier-policy.md");
  const requiredTokens = [
    "Tier 1",
    "Tier 2",
    "Tier 3",
    "WebGL",
    "WebGPU",
    "Stable",
    "Experimental",
    "Planned",
    "Blocked",
    "Capability Maturity Matrix",
  ];
  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `backend-tier-policy.md must include: ${token}`,
    );
  }
});
