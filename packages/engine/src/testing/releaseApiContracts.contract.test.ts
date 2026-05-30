import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves the engine docs root from this test location.
 */
function resolveDocsRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(testDir, "../../docs");
}

/**
 * Reads one docs file from the engine docs root.
 * @param relativePath Relative docs path using forward slashes.
 */
async function readDocs(relativePath: string): Promise<string> {
  return fs.readFile(path.resolve(resolveDocsRoot(), relativePath), "utf8");
}

/**
 * Asserts all markers exist in a docs file.
 * @param content Docs content.
 * @param markers Required release markers.
 */
function assertMarkers(content: string, markers: readonly string[]): void {
  const missingMarkers = markers.filter((marker) => !content.includes(marker));
  assert.deepEqual(missingMarkers, []);
}

test("resource and asset release docs keep generic ingestion contract", async () => {
  const [enContent, cnContent] = await Promise.all([
    readDocs("en/api/resource-asset-ingestion.md"),
    readDocs("cn/api/resource-asset-ingestion.md"),
  ]);
  const markers = ["Geometry resources", "Material resources", "Texture resources", "Animation resources", "Volume resources"];

  assertMarkers(enContent, markers);
  assertMarkers(enContent, ["decode failure", "fallback backend", "residency pressure", "S1", "S11"]);
  assertMarkers(cnContent, ["Geometry resources", "Material resources", "Texture resources", "Animation resources", "Volume resources"]);
});

test("spatial query release docs keep deterministic public adapter contract", async () => {
  const [enContent, cnContent] = await Promise.all([
    readDocs("en/api/spatial-query-baseline.md"),
    readDocs("cn/api/spatial-query-baseline.md"),
  ]);

  assertMarkers(enContent, ["Point pick", "frustum query", "Measurement", "Clearance", "public query APIs"]);
  assertMarkers(cnContent, ["point pick", "frustum query", "measurement", "clearance", "public query APIs"]);
});

test("timeline and replay release docs keep app-owned product semantics", async () => {
  const [enContent, cnContent] = await Promise.all([
    readDocs("en/api/timeline-replay-baseline.md"),
    readDocs("cn/api/timeline-replay-baseline.md"),
  ]);

  assertMarkers(enContent, ["Track", "Clip", "Replay", "Capture", "App Ownership"]);
  assertMarkers(cnContent, ["Track", "Clip", "Replay", "Capture", "App 归属"]);
});

test("backend release matrix keeps fallback and headless diagnostics contract", async () => {
  const [enContent, cnContent] = await Promise.all([
    readDocs("en/backends/release-backend-matrix.md"),
    readDocs("cn/backends/release-backend-matrix.md"),
  ]);

  assertMarkers(enContent, ["WebGL", "WebGPU", "Canvas2D", "Headless", "fallback reason", "capture/readback"]);
  assertMarkers(cnContent, ["WebGL", "WebGPU", "Canvas2D", "Headless", "fallback reason", "capture/readback"]);
});

test("scenario adapter cookbook keeps domain leakage outside engine API names", async () => {
  const [enContent, cnContent] = await Promise.all([
    readDocs("en/editor-integration/scenario-adapter-boundary-cookbook.md"),
    readDocs("cn/editor-integration/scenario-adapter-boundary-cookbook.md"),
  ]);

  assertMarkers(enContent, ["Parse app-owned source data", "Submit through public engine APIs", "Forbidden Leakage"]);
  assertMarkers(cnContent, ["解析 app-owned source data", "通过 public engine APIs 提交", "禁止泄漏"]);
});
