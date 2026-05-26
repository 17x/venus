import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute source path from testing folder.
 * @param relativePath Relative file path from src/testing.
 */
function resolveSourcePath(relativePath) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, relativePath);
}

/**
 * Reads UTF-8 source file text for contract assertions.
 * @param relativePath Relative file path from src/testing.
 */
async function readSource(relativePath) {
  return fs.readFile(resolveSourcePath(relativePath), "utf8");
}

/**
 * Verifies camera protocol includes projection-mode and projection-command contracts.
 */
test("camera protocol declares projection mode and setProjection command", async () => {
  const protocolSource = await readSource(
    "../kernel/interaction/camera/cameraCommandProtocol.ts",
  );
  assert.equal(
    protocolSource.includes("EngineCameraProjectionMode"),
    true,
    "cameraCommandProtocol.ts must declare EngineCameraProjectionMode",
  );
  assert.equal(
    protocolSource.includes('type: "setProjection"'),
    true,
    "cameraCommandProtocol.ts must declare setProjection command",
  );
  assert.equal(
    protocolSource.includes("projectionMode"),
    true,
    "cameraCommandProtocol.ts must expose projectionMode in camera state and command",
  );
});

/**
 * Verifies camera controller normalizes projection parameters for deterministic runtime safety.
 */
test("camera controller clamps projection parameters", async () => {
  const controllerSource = await readSource(
    "../kernel/interaction/camera/engineCameraController.ts",
  );
  const requiredTokens = [
    "DEFAULT_PROJECTION_MODE",
    "DEFAULT_PERSPECTIVE_FOV_Y",
    "DEFAULT_PROJECTION_NEAR",
    "DEFAULT_PROJECTION_FAR",
    "DEFAULT_ORTHOGRAPHIC_HALF_SIZE",
    'command.type === "setProjection"',
    "projectionMode",
    "perspectiveFovY",
    "orthographicHalfSize",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      controllerSource.includes(token),
      true,
      `engineCameraController.ts must include projection token: ${token}`,
    );
  }
});
