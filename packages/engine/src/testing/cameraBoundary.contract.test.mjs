import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute path under engine src folder from testing directory.
 * @param relativePath Relative path from src/testing to target source file.
 */
function resolveSourcePath(relativePath) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, relativePath);
}

/**
 * Reads UTF-8 source text for one engine file used by boundary contract assertions.
 * @param relativePath Relative path from src/testing to target source file.
 */
async function readSource(relativePath) {
  return fs.readFile(resolveSourcePath(relativePath), "utf8");
}

/**
 * Enforces that camera command protocol remains semantic and free of raw DOM modifier fields.
 */
test("camera command protocol excludes raw DOM modifier semantics", async () => {
  const protocolSource = await readSource(
    "../kernel/interaction/camera/cameraCommandProtocol.ts",
  );
  const forbiddenTokens = [
    "shiftKey",
    "ctrlKey",
    "metaKey",
    "altKey",
    "PointerEvent",
    "WheelEvent",
    "EngineCameraPointerPayload",
    "EngineCameraWheelPayload",
  ];

  for (const token of forbiddenTokens) {
    assert.equal(
      protocolSource.includes(token),
      false,
      `cameraCommandProtocol.ts must not contain token: ${token}`,
    );
  }
});

/**
 * Enforces that camera controller remains platform-agnostic by avoiding direct window bindings.
 */
test("camera controller uses injected scheduler instead of window globals", async () => {
  const controllerSource = await readSource(
    "../kernel/interaction/camera/engineCameraController.ts",
  );
  assert.equal(
    controllerSource.includes("window.requestAnimationFrame"),
    false,
    "engineCameraController.ts must not call window.requestAnimationFrame directly",
  );
  assert.equal(
    controllerSource.includes("window.cancelAnimationFrame"),
    false,
    "engineCameraController.ts must not call window.cancelAnimationFrame directly",
  );
  assert.equal(
    controllerSource.includes("EngineCameraControllerScheduler"),
    true,
    "engineCameraController.ts must define scheduler injection contract",
  );
});
