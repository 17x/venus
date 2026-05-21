import assert from "node:assert/strict";
import test from "node:test";

import { createEnginePublicApiSurfaceModule } from "./publicApiSurface";

/**
 * Verifies public API surface module reports namespace violations for forbidden semantic prefixes.
 */
test("publicApiSurface module rejects forbidden semantic prefixes", () => {
  const module = createEnginePublicApiSurfaceModule();
  const violations = module.validateDescriptors([
    {
      name: "engine.medical.loadCase",
      level: "developer",
      stability: "beta",
    },
    {
      name: "engine.capability.render.renderFrame",
      level: "developer",
      stability: "stable",
    },
  ]);

  assert.deepEqual(
    violations.map((violation) => violation.name),
    ["engine.medical.loadCase"],
  );
});

/**
 * Verifies public API surface module returns deterministic catalog ordering.
 */
test("publicApiSurface module creates deterministic catalog ordering", () => {
  const module = createEnginePublicApiSurfaceModule();
  const catalog = module.createDeterministicCatalog([
    {
      name: "engine.runtime.submit",
      level: "advanced",
      stability: "beta",
    },
    {
      name: "engine.setGraph",
      level: "developer",
      stability: "stable",
    },
  ]);

  assert.deepEqual(
    catalog.map((entry) => entry.name),
    ["engine.runtime.submit", "engine.setGraph"],
  );
});
