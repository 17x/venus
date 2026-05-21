import assert from "node:assert/strict";
import test from "node:test";

import {
  createEngine,
  createTestSurface,
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  ENGINE_RUNTIME_CAPABILITY_MAP,
  ENGINE_RUNTIME_CAPABILITY_REGISTRY,
  resolveEngineRuntimeCapabilityDescriptor,
} from "../index";
import {
  NON_FOUNDATION_CAPABILITY_ENTRIES,
  resolveMissingCapabilityEntries,
  resolveUnexpectedNonFoundationCapabilityEntries,
} from "./runtimeCapabilityFoundationAlignment";

/**
 * Resolves one callable method from engine handle by dotted capability entry path.
 * @param engine Canonical engine handle instance.
 * @param entry Dotted entry signature from capability descriptor.
 */
function resolveCapabilityHandleMethod(engine: ReturnType<typeof createEngine>, entry: string): unknown {
  const pathSegments = entry.replace("EngineHandle.", "").split(".");
  let current: unknown = engine;
  for (const segment of pathSegments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Verifies runtime capability map keeps canonical stable capability set.
 */
test("runtime capability map keeps canonical stable capability entries", () => {
  assert.equal(Object.keys(ENGINE_RUNTIME_CAPABILITY_MAP).length, 58);
  assert.equal(ENGINE_RUNTIME_CAPABILITY_REGISTRY.length, 58);
  assert.equal("runtimePlanCreateFramePlan" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeResourceCollectGarbage" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeObservabilityReplay" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeDocumentCreateSnapshot" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeWorldCompileFromDocument" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeDirtyFlush" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCommandReplay" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeBackendProbeHeadless" in ENGINE_RUNTIME_CAPABILITY_MAP, true);

  assert.deepEqual(ENGINE_RUNTIME_CAPABILITY_MAP.query, {
    name: "query",
    entry: "EngineHandle.query",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime scene query capability.",
  });
  assert.deepEqual(ENGINE_RUNTIME_CAPABILITY_MAP.pick, {
    name: "pick",
    entry: "EngineHandle.pick",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime point-hit capability.",
  });
  assert.deepEqual(ENGINE_RUNTIME_CAPABILITY_MAP.raycast, {
    name: "raycast",
    entry: "EngineHandle.raycast",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime ray-hit capability.",
  });
  assert.deepEqual(ENGINE_RUNTIME_CAPABILITY_MAP.getDiagnostics, {
    name: "getDiagnostics",
    entry: "EngineHandle.getDiagnostics",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime diagnostics capability.",
  });
  assert.equal(
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimePlanCreateFramePlan.entry,
    "EngineHandle.runtime.plan.createFramePlan",
  );
  assert.equal(
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeResourceCollectGarbage.entry,
    "EngineHandle.runtime.resource.collectGarbage",
  );
  assert.equal(
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeObservabilityReplay.entry,
    "EngineHandle.runtime.observability.replay",
  );
});

/**
 * Verifies single-source capability registry has unique names and map mirrors it exactly.
 */
test("runtime capability registry remains single-source of truth for map generation", () => {
  const registryNames = ENGINE_RUNTIME_CAPABILITY_REGISTRY.map((descriptor) => descriptor.name);
  const uniqueNames = new Set(registryNames);
  assert.equal(uniqueNames.size, registryNames.length);

  for (const descriptor of ENGINE_RUNTIME_CAPABILITY_REGISTRY) {
    assert.deepEqual(
      ENGINE_RUNTIME_CAPABILITY_MAP[descriptor.name],
      descriptor,
    );
  }
});

/**
 * Verifies runtime capability descriptors resolve by canonical key.
 */
test("runtime capability descriptors resolve from canonical key", () => {
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("query"),
    ENGINE_RUNTIME_CAPABILITY_MAP.query,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("pick"),
    ENGINE_RUNTIME_CAPABILITY_MAP.pick,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("raycast"),
    ENGINE_RUNTIME_CAPABILITY_MAP.raycast,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("getDiagnostics"),
    ENGINE_RUNTIME_CAPABILITY_MAP.getDiagnostics,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("runtimePlanInspect"),
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimePlanInspect,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("runtimeResourceRegister"),
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeResourceRegister,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("runtimeObservabilityStartTrace"),
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeObservabilityStartTrace,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("runtimeDocumentDiffSnapshots"),
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeDocumentDiffSnapshots,
  );
  assert.deepEqual(
    resolveEngineRuntimeCapabilityDescriptor("runtimeBackendProbeHeadless"),
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeBackendProbeHeadless,
  );
});

/**
 * Verifies declared runtime capabilities are callable on canonical engine handle.
 */
test("runtime capability map entries are executable on engine handle", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  for (const capability of Object.values(ENGINE_RUNTIME_CAPABILITY_MAP)) {
    const handleMethod = resolveCapabilityHandleMethod(engine, capability.entry);
    assert.equal(typeof handleMethod, "function", `Missing engine handle method: ${capability}`);
  }

  engine.dispose();
});

/**
 * Verifies capability-map runtime entries remain aligned with callable method input/output contracts.
 */
test("runtime capability map aligns with engine handle method contracts", () => {
  const engine = createEngine({
    surface: createTestSurface(400, 240),
    backend: "headless",
  });

  engine.setGraph({
    nodes: [
      {
        id: "node-alpha",
        x: 10,
        y: 10,
        width: 100,
        height: 80,
        depth: 4,
      },
      {
        id: "node-beta",
        x: 220,
        y: 120,
        width: 60,
        height: 40,
        depth: 2,
      },
    ],
  });

  const queryDescriptor = ENGINE_RUNTIME_CAPABILITY_MAP.query;
  assert.equal(queryDescriptor.entry, "EngineHandle.query");
  const queryOutput = engine.query({ x: 0, y: 0, width: 160, height: 120 });
  assert.equal(Array.isArray(queryOutput.nodeIds), true);
  assert.equal(queryOutput.nodeIds.includes("node-alpha"), true);
  assert.equal(queryOutput.nodeIds.includes("node-beta"), false);

  const pickDescriptor = ENGINE_RUNTIME_CAPABILITY_MAP.pick;
  assert.equal(pickDescriptor.entry, "EngineHandle.pick");
  const pickOutput = engine.pick({ x: 20, y: 20 }, { tolerance: 0 });
  assert.equal(Array.isArray(pickOutput.hits), true);
  assert.equal(pickOutput.hits.length > 0, true);
  assert.equal(typeof pickOutput.hits[0]?.id, "string");
  assert.equal(typeof pickOutput.hits[0]?.rank, "number");

  const raycastDescriptor = ENGINE_RUNTIME_CAPABILITY_MAP.raycast;
  assert.equal(raycastDescriptor.entry, "EngineHandle.raycast");
  const raycastOutput = engine.raycast(
    {
      originX: 0,
      originY: 0,
      originZ: 0,
      directionX: 1,
      directionY: 1,
      directionZ: 0,
    },
    { maxDistance: 1000 },
  );
  if (raycastOutput !== null) {
    assert.equal(typeof raycastOutput.id, "string");
    assert.equal(typeof raycastOutput.distance, "number");
  }

  const diagnosticsDescriptor = ENGINE_RUNTIME_CAPABILITY_MAP.getDiagnostics;
  assert.equal(diagnosticsDescriptor.entry, "EngineHandle.getDiagnostics");
  const diagnosticsOutput = engine.getDiagnostics();
  assert.equal(typeof diagnosticsOutput.pixelRatio, "number");
  assert.equal(typeof diagnosticsOutput.outputPixelRatio, "number");
  assert.equal(
    diagnosticsOutput.capabilities?.schemaVersion,
    ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  );
  assert.deepEqual(
    diagnosticsOutput.capabilities?.runtime,
    Object.values(ENGINE_RUNTIME_CAPABILITY_MAP),
  );

  const planOutput = engine.runtime.plan.createFramePlan({
    nodeCount: 3,
    viewportWidth: 400,
    viewportHeight: 240,
    interactionActive: false,
  });
  assert.equal(typeof planOutput.planId, "string");

  const resourceOutput = engine.runtime.resource.register({
    id: "capability-resource",
    kind: "buffer",
    sizeBytes: 512,
  });
  assert.equal(resourceOutput.id, "capability-resource");

  const traceOutput = engine.runtime.observability.startTrace({
    name: "capability-map-contract",
  });
  assert.equal(typeof traceOutput.traceId, "string");
  const replayToken = engine.runtime.observability.createReplayToken("contract");
  assert.equal(engine.runtime.observability.replay(replayToken.token).accepted, true);

  engine.dispose();
});

/**
 * Verifies runtime capability schema version remains a stable positive integer marker.
 */
test("runtime capability schema version is stable positive integer", () => {
  assert.equal(Number.isInteger(ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION), true);
  assert.equal(ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION > 0, true);
});

/**
 * Verifies runtime capability map covers every landed runtime foundation descriptor endpoint.
 */
test("runtime capability map covers all runtime foundation descriptor endpoints", () => {
  const capabilityEntries = new Set(
    Object.values(ENGINE_RUNTIME_CAPABILITY_MAP).map((descriptor) => descriptor.entry),
  );
  const missingEntries = resolveMissingCapabilityEntries(capabilityEntries);
  assert.deepEqual(
    missingEntries,
    [],
    `Missing capability-map entries for foundation endpoints: ${missingEntries.join(", ")}`,
  );
});

/**
 * Verifies every capability entry is either foundation-derived or explicitly non-foundation whitelisted.
 */
test("runtime capability entries require foundation mapping or non-foundation whitelist", () => {
  const capabilityEntries = new Set(
    Object.values(ENGINE_RUNTIME_CAPABILITY_MAP).map((descriptor) => descriptor.entry),
  );
  const unexpectedEntries = resolveUnexpectedNonFoundationCapabilityEntries(capabilityEntries);
  assert.deepEqual(
    unexpectedEntries,
    [],
    `Capability entries missing foundation mapping/whitelist: ${unexpectedEntries.join(", ")}`,
  );

  for (const entry of NON_FOUNDATION_CAPABILITY_ENTRIES) {
    assert.equal(
      capabilityEntries.has(entry),
      true,
      `Non-foundation whitelist entry missing from capability map: ${entry}`,
    );
  }
});
