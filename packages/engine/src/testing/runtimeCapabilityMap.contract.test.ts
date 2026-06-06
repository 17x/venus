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
 * Resolves whether one capability token keeps lower-camel runtime naming shape.
 * @param value Capability map name token.
 */
function isLowerCamelToken(value: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(value);
}

/**
 * Resolves lowercase token segments from one capability identifier.
 * @param value Capability identifier in lower-camel shape.
 */
function resolveIdentifierTokens(value: string): string[] {
  return value
    .split(/(?=[A-Z])|[^A-Za-z0-9]+/)
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);
}

/**
 * Resolves lowercase token segments from one free-form notes string.
 * @param value Capability notes text.
 */
function resolveNotesTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

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
  assert.equal(Object.keys(ENGINE_RUNTIME_CAPABILITY_MAP).length, 103);
  assert.equal(ENGINE_RUNTIME_CAPABILITY_REGISTRY.length, 103);
  assert.equal("runtimePlanCreateFramePlan" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeResourceCollectGarbage" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeObservabilityReplay" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeDocumentCreateSnapshot" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeDocumentPreflightApplyChangeSet" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeWorldCompileFromDocument" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeWorldStepAgents" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeWorldResolveCollision" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeNavigationStepAgents" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeNavigationRegisterPath" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeNavigationStepPathAgents" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCollisionResolve" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCollisionRegisterCollider" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCollisionQueryAabb" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCollisionEvaluateTriggers" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeCollisionSweepCircle" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeConstraintsRegister" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeConstraintsResolve" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeLightingResolveEnvironment" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeLightingApplyEnvironment" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeAuthoringCreateGraphSnapshot" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeAuthoringCompareGraphSnapshots" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeAuthoringGetDiagnostics" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeModelRegisterAsset" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeModelSetInstances" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
  assert.equal("runtimeModelGetDiagnostics" in ENGINE_RUNTIME_CAPABILITY_MAP, true);
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
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeVolumeCreateSlicePlan.entry,
    "EngineHandle.runtime.volume.createSlicePlan",
  );
  assert.equal(
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeVolumeResolveTransferFunction.entry,
    "EngineHandle.runtime.volume.resolveTransferFunction",
  );
  assert.equal(
    ENGINE_RUNTIME_CAPABILITY_MAP.runtimeVolumeResolveResidencyBudget.entry,
    "EngineHandle.runtime.volume.resolveResidencyBudget",
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

  const slicePlanOutput = engine.runtime.volume.createSlicePlan({
    volumeResourceId: "volume-resource",
    axis: "axial",
    sliceIndex: 12,
    slabThicknessVoxels: 3,
    spacingMm: {
      x: 0.8,
      y: 0.8,
      z: 1.2,
    },
  });
  assert.equal(slicePlanOutput.axis, "axial");
  assert.equal(slicePlanOutput.sliceIndex, 12);

  const transferOutput = engine.runtime.volume.resolveTransferFunction({
    windowCenter: 40,
    windowWidth: 400,
    opacityStops: [
      { position: 0, opacity: 0 },
      { position: 1, opacity: 1 },
    ],
  });
  assert.equal(transferOutput.windowMin, -160);
  assert.equal(transferOutput.windowMax, 240);

  const budgetOutput = engine.runtime.volume.resolveResidencyBudget({
    volumeResourceIds: ["capability-resource", "missing-volume"],
    target: "interaction",
  });
  assert.equal(Array.isArray(budgetOutput.missingResourceIds), true);
  assert.equal(budgetOutput.missingResourceIds.includes("missing-volume"), true);

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

/**
 * Verifies capability names and notes stay concise and scenario-neutral.
 */
test("runtime capability naming remains concise and scenario-neutral", () => {
  const forbiddenScenarioTokens = [
    "medical",
    "surgical",
    "bim",
    "cad",
    "gis",
    "ecommerce",
    "commerce",
    "molecular",
    "game",
    "video",
    "business",
    "workflow",
  ];

  for (const descriptor of ENGINE_RUNTIME_CAPABILITY_REGISTRY) {
    // Keep top-level capability identifiers concise and stable for API-first governance.
    assert.equal(
      descriptor.name.length <= 48,
      true,
      `Capability name exceeds concise-length guard: ${descriptor.name}`,
    );
    assert.equal(
      isLowerCamelToken(descriptor.name),
      true,
      `Capability name must use lower-camel token format: ${descriptor.name}`,
    );

    const nameTokens = new Set(resolveIdentifierTokens(descriptor.name));
    const notesTokens = new Set(resolveNotesTokens(descriptor.notes));

    for (const token of forbiddenScenarioTokens) {
      assert.equal(
        nameTokens.has(token),
        false,
        `Capability name must stay scenario-neutral and avoid token '${token}': ${descriptor.name}`,
      );
      assert.equal(
        notesTokens.has(token),
        false,
        `Capability notes must stay scenario-neutral and avoid token '${token}': ${descriptor.name}`,
      );
    }
  }
});
