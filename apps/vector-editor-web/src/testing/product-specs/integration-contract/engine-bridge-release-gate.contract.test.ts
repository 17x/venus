import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

/**
 * Verifies the vector runtime governance check passes, confirming no direct @venus/engine
 * imports exist outside the engine-bridge boundary.
 */
test("vector runtime governance check keeps engine-bridge as only engine import surface", () => {
  const script = path.join(appRoot, "scripts", "runtime-governance-check.mjs");
  try {
    const output = execSync(`node ${script}`, {
      cwd: appRoot,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30000,
    });
    assert.equal(output.trim(), "[runtime-governance] ok");
  } catch (error) {
    assert.fail(`runtime-governance-check failed: ${error}`);
  }
});

function collectFilesRecursively(dir: string): string[] {
  const files: string[] = [];
  fs.readdirSync(dir, {withFileTypes: true}).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(fullPath));
      return;
    }
    files.push(fullPath);
  });
  return files;
}

function isProductionSourceFile(filePath: string): boolean {
  return /\/src\/.+\.(ts|tsx|d\.ts)$/.test(filePath) &&
    !/\/src\/testing\//.test(filePath) &&
    !/\/src\/.+\.test\.(ts|tsx)$/.test(filePath);
}

function isRuntimeSourceFile(filePath: string): boolean {
  return /\/src\/runtime\/.+\.(ts|tsx)$/.test(filePath);
}

function isEngineBridgeFile(filePath: string): boolean {
  return /\/src\/runtime\/engine-bridge\//.test(filePath);
}

test("vector production source imports engine only through public bridge-safe surfaces", () => {
  const srcRoot = path.join(appRoot, "src");
  const files = collectFilesRecursively(srcRoot).filter(isProductionSourceFile);
  const privateEngineImportViolations: string[] = [];
  const directRuntimeEngineImportViolations: string[] = [];
  const engineBridgeInternalViolations: string[] = [];

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const relPath = path.relative(appRoot, filePath);
    if (
      content.includes("@venus/engine/src") ||
      content.includes("packages/engine/src") ||
      content.includes("/packages/engine/") ||
      content.includes("engine/src/")
    ) {
      privateEngineImportViolations.push(relPath);
    }
    if (
      isRuntimeSourceFile(filePath) &&
      !isEngineBridgeFile(filePath) &&
      (content.includes("'@venus/engine'") || content.includes('"@venus/engine"'))
    ) {
      directRuntimeEngineImportViolations.push(relPath);
    }
    if (!isEngineBridgeFile(filePath) && content.includes("/engine-bridge/internal/")) {
      engineBridgeInternalViolations.push(relPath);
    }
  });

  assert.deepEqual(privateEngineImportViolations, []);
  assert.deepEqual(directRuntimeEngineImportViolations, []);
  assert.deepEqual(engineBridgeInternalViolations, []);
});
