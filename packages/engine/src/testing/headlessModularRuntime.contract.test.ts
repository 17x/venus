import assert from "node:assert/strict";
import test from "node:test";

import {
  baseRuntimeProfile,
  browserPlatformRuntimeProfile,
  createEngineRuntimeFromProfile,
  headlessReplayScenarioProfile,
  headlessRuntimeProfile,
  resolveEngineCapabilityAccess,
  resolveEngineModuleRegistry,
  validateEngineRuntimeProfile,
} from "../index";
import { resolveCreateEngineRuntimeProfile } from "../orchestration/api/createEngine.foundation";
import type {
  EngineCoreModule,
  EngineRuntimeProfile,
} from "../index";
import {
  vectorEditorRuntimeProfile,
} from "../kernel/profiles/vector-editor/vector-editor-profile";
import {
  vectorDenseSceneScenarioProfile,
} from "../kernel/profiles/scenario/vector-dense-scene-profile";

/**
 * Verifies baseline profiles validate before runtime assembly is wired to them.
 */
test("headless modular runtime baseline profiles validate", () => {
  const profiles = [
    baseRuntimeProfile,
    headlessRuntimeProfile,
    browserPlatformRuntimeProfile,
    vectorEditorRuntimeProfile,
    vectorDenseSceneScenarioProfile,
    headlessReplayScenarioProfile,
  ];

  for (const profile of profiles) {
    const validation = validateEngineRuntimeProfile(profile);
    assert.equal(validation.valid, true, profile.id);
    assert.deepEqual(
      validation.issues.filter((issue) => issue.severity === "error"),
      [],
    );
  }
});

/**
 * Verifies scenario-manifest replay payload emits warnings when empty.
 */
test("profile validator reports empty scenario replay payloads", () => {
  const validation = validateEngineRuntimeProfile({
    id: "scenario-empty-manifest",
    target: "scenario",
    strictness: "dev",
    scenario: "empty-manifest",
    modules: [
      {
        id: "test.module",
        provides: ["capability.one"],
      },
    ],
    scenarioManifest: {
      id: "scenario.empty.v1",
      description: "empty replay payload",
      replay: {
        documentChangeSets: [],
        viewportStates: [],
        inputEvents: [],
      },
      diagnostics: {
        moduleActivationOrder: ["test.module"],
        backendRequested: "headless",
        backendResolved: "headless",
        backendFallbackReason: null,
      },
    },
  });

  assert.equal(validation.valid, true);
  assert.equal(validation.issues.some((issue) => issue.code === "empty-scenario-document-replay"), true);
  assert.equal(validation.issues.some((issue) => issue.code === "empty-scenario-viewport-replay"), true);
});

/**
 * Verifies module registry keeps first-provider capability order deterministic.
 */
test("module registry resolves capabilities in deterministic first-provider order", () => {
  const firstModule: EngineCoreModule = {
    id: "test.first",
    provides: ["capability.alpha", "capability.shared"],
  };
  const secondModule: EngineCoreModule = {
    id: "test.second",
    provides: ["capability.beta", "capability.shared"],
    requires: ["capability.alpha"],
  };

  const registry = resolveEngineModuleRegistry([firstModule, secondModule]);

  assert.deepEqual(registry.capabilityIds, [
    "capability.alpha",
    "capability.shared",
    "capability.beta",
  ]);
  assert.deepEqual(registry.missingRequirements, []);
});

/**
 * Verifies missing module requirements block profile validation.
 */
test("profile validator reports missing module requirements", () => {
  const incompleteProfile: EngineRuntimeProfile = {
    id: "incomplete-profile",
    target: "test",
    strictness: "strict",
    modules: [
      {
        id: "test.consumer",
        provides: ["capability.consumer"],
        requires: ["capability.provider"],
      },
    ],
  };

  const validation = validateEngineRuntimeProfile(incompleteProfile);

  assert.equal(validation.valid, false);
  assert.equal(validation.issues[0]?.code, "missing-module-requirement");
  assert.equal(validation.issues[0]?.capabilityId, "capability.provider");
});

/**
 * Verifies duplicate module ids are validation errors because activation would be ambiguous.
 */
test("profile validator reports duplicate module ids", () => {
  const duplicateProfile: EngineRuntimeProfile = {
    id: "duplicate-profile",
    target: "test",
    strictness: "strict",
    modules: [
      { id: "test.duplicate", provides: ["capability.one"] },
      { id: "test.duplicate", provides: ["capability.two"] },
    ],
  };

  const validation = validateEngineRuntimeProfile(duplicateProfile);

  assert.equal(validation.valid, false);
  assert.equal(validation.issues[0]?.code, "duplicate-module-id");
  assert.equal(validation.issues[0]?.moduleId, "test.duplicate");
});

/**
 * Verifies backend priority metadata preserves the architecture route.
 */
test("browser and vector profiles preserve backend architecture priority", () => {
  const expectedPriority = ["webgpu", "webgl", "canvas2d", "headless"];

  assert.deepEqual(browserPlatformRuntimeProfile.backendPriority, expectedPriority);
  assert.deepEqual(vectorEditorRuntimeProfile.backendPriority, expectedPriority);
});

/**
 * Verifies base and headless profiles keep strict non-2D backend baseline by default.
 */
test("base and headless profiles keep non-2d backend baseline", () => {
  assert.deepEqual(baseRuntimeProfile.backendPriority, ["headless"]);
  assert.deepEqual(headlessRuntimeProfile.backendPriority, ["headless"]);
  assert.equal(
    (baseRuntimeProfile.optionalCapabilities ?? []).includes("backend.canvas2d"),
    false,
  );
  assert.equal(
    (headlessRuntimeProfile.optionalCapabilities ?? []).includes("backend.canvas2d"),
    false,
  );
});

/**
 * Verifies browser profile keeps canvas2d as fallback and does not require 2D capability.
 */
test("browser profile keeps canvas2d fallback as non-required capability", () => {
  const canvas2dIndex = browserPlatformRuntimeProfile.backendPriority.indexOf("canvas2d");
  const webglIndex = browserPlatformRuntimeProfile.backendPriority.indexOf("webgl");

  assert.equal(canvas2dIndex > webglIndex, true);
  assert.equal(
    browserPlatformRuntimeProfile.requiredCapabilities.includes("backend.canvas2d"),
    false,
  );
});

/**
 * Verifies vector profile exposes canvas2d only as scenario-scoped optional capability.
 */
test("vector profile keeps canvas2d as explicit scenario optional", () => {
  assert.equal(vectorEditorRuntimeProfile.scenario, "vector-editor");
  assert.equal(
    (vectorEditorRuntimeProfile.optionalCapabilities ?? []).includes("backend.canvas2d"),
    true,
  );
  assert.equal(
    vectorEditorRuntimeProfile.requiredCapabilities.includes("backend.canvas2d"),
    false,
  );
});

/**
 * Verifies runtime profile selection stays backend-driven and never creates implicit 2D-only profile path.
 */
test("createEngine runtime profile selection keeps 2d fallback inside browser profile", () => {
  assert.equal(
    resolveCreateEngineRuntimeProfile({ resolved: "headless" }).id,
    headlessRuntimeProfile.id,
  );
  assert.equal(
    resolveCreateEngineRuntimeProfile({ resolved: "webgpu" }).id,
    browserPlatformRuntimeProfile.id,
  );
  assert.equal(
    resolveCreateEngineRuntimeProfile({ resolved: "webgl" }).id,
    browserPlatformRuntimeProfile.id,
  );
  assert.equal(
    resolveCreateEngineRuntimeProfile({ resolved: "canvas2d" }).id,
    browserPlatformRuntimeProfile.id,
  );
});

/**
 * Verifies missing capability access resolves strict throw semantics.
 */
test("capability access throws in strict profiles", () => {
  const access = resolveEngineCapabilityAccess({
    profile: headlessRuntimeProfile,
    capabilityId: "composition.hover-layer",
  });

  assert.equal(access.available, false);
  assert.equal(access.shouldThrow, true);
  assert.equal(access.shouldWarn, false);
  assert.match(access.message ?? "", /composition\.hover-layer/);
});

/**
 * Verifies missing capability access resolves dev warning semantics.
 */
test("capability access warns in dev profiles", () => {
  const access = resolveEngineCapabilityAccess({
    profile: browserPlatformRuntimeProfile,
    capabilityId: "picking.hit-test",
  });

  assert.equal(access.available, false);
  assert.equal(access.shouldThrow, false);
  assert.equal(access.shouldWarn, true);
});

/**
 * Verifies current vector runtime profile exposes interaction and composition capabilities.
 */
test("vector profile exposes current app parity capabilities", () => {
  const validation = validateEngineRuntimeProfile(vectorEditorRuntimeProfile);

  assert.equal(validation.activeCapabilityIds.includes("picking.hit-test"), true);
  assert.equal(validation.activeCapabilityIds.includes("composition.hover-layer"), true);
  assert.equal(validation.activeCapabilityIds.includes("interaction.command-buffer"), true);
});

/**
 * Verifies profile runtime builder exposes deterministic module activation metadata.
 */
test("runtime builder assembles base runtime capability map", () => {
  const runtime = createEngineRuntimeFromProfile(baseRuntimeProfile);

  assert.equal(runtime.profileId, "base-runtime");
  assert.deepEqual(runtime.moduleIds, ["core.scheduler", "core.observability"]);
  assert.equal(runtime.hasCapability("scheduler.frame-phases"), true);
  assert.equal(runtime.hasCapability("observability.diagnostics"), true);
  assert.equal(runtime.hasCapability("document.graph"), false);
});

/**
 * Verifies runtime builder executes module activation hooks in profile order.
 */
test("runtime builder records module activation results", () => {
  const activationOrder: string[] = [];
  const firstModule: EngineCoreModule = {
    id: "test.first-activating",
    provides: ["capability.first"],
    initialize: () => {
      activationOrder.push("first");
      return {
        moduleId: "test.first-activating",
        active: true,
        providedCapabilities: ["capability.first", "capability.from-activation"],
      };
    },
  };
  const secondModule: EngineCoreModule = {
    id: "test.second-activating",
    provides: ["capability.second"],
    requires: ["capability.first"],
    initialize: () => {
      activationOrder.push("second");
      return {
        moduleId: "test.second-activating",
        active: true,
        providedCapabilities: ["capability.second"],
      };
    },
  };

  const runtime = createEngineRuntimeFromProfile({
    id: "activation-profile",
    target: "test",
    strictness: "strict",
    modules: [firstModule, secondModule],
  });

  assert.deepEqual(activationOrder, ["first", "second"]);
  assert.equal(runtime.activationResults.length, 2);
  assert.equal(runtime.hasCapability("capability.from-activation"), true);
});

/**
 * Verifies invalid profiles stop assembly before any runtime is produced.
 */
test("runtime builder throws on invalid profiles", () => {
  const invalidProfile: EngineRuntimeProfile = {
    id: "invalid-runtime-profile",
    target: "test",
    strictness: "strict",
    modules: [
      {
        id: "test.invalid-consumer",
        provides: ["capability.consumer"],
        requires: ["capability.missing"],
      },
    ],
  };

  assert.throws(
    () => createEngineRuntimeFromProfile(invalidProfile),
    /capability\.missing/,
  );
});

/**
 * Verifies strict assembled runtimes report missing capabilities as blocking.
 */
test("runtime capability requirement blocks in strict mode", () => {
  const runtime = createEngineRuntimeFromProfile(headlessRuntimeProfile);
  const requirement = runtime.requireCapability("composition.hover-layer");

  assert.equal(requirement.available, false);
  assert.equal(requirement.shouldThrow, true);
  assert.equal(runtime.warnings.length, 0);
});

/**
 * Verifies dev assembled runtimes emit deterministic warnings for missing capabilities.
 */
test("runtime capability requirement warns in dev mode", () => {
  const emittedWarnings: string[] = [];
  const runtime = createEngineRuntimeFromProfile(browserPlatformRuntimeProfile, {
    onWarning: (warning) => emittedWarnings.push(warning.code),
  });
  const requirement = runtime.requireCapability("picking.hit-test");

  assert.equal(requirement.available, false);
  assert.equal(requirement.shouldThrow, false);
  assert.equal(runtime.warnings.length, 1);
  assert.deepEqual(emittedWarnings, ["missing-runtime-capability"]);
});
