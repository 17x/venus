import assert from "node:assert/strict";
import test from "node:test";

import { ENGINE_RUNTIME_CAPABILITY_REGISTRY } from "../orchestration/api/runtimeCapabilityMap";
import { ENGINE_RUNTIME_BACKEND_FOUNDATION_API } from "../orchestration/runtime/backend/backend.foundation.contract";
import {
  resolveCreateEnginePolicyBootstrap,
  type EnginePolicyProfile,
} from "../optimization/createEnginePolicyBootstrap";

/**
 * Resolves lowercase tokens from one identifier value.
 * @param value Identifier value in lower-camel or dotted format.
 */
function resolveIdentifierTokens(value: string): string[] {
  return value
    .split(/(?=[A-Z])|[^A-Za-z0-9]+/)
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);
}

/**
 * Resolves lowercase tokens from one descriptive text value.
 * @param value Free-form text value used by API notes and determinism descriptions.
 */
function resolveTextTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/**
 * Verifies runtime capability map descriptors avoid product and industry semantic tokens.
 */
test("runtime capability descriptors remain semantic-neutral", () => {
  const forbiddenTokens = [
    "medical",
    "surgical",
    "bim",
    "cad",
    "gis",
    "commerce",
    "molecular",
    "game",
    "editor",
    "video",
    "business",
    "workflow",
  ];

  for (const descriptor of ENGINE_RUNTIME_CAPABILITY_REGISTRY) {
    const nameTokens = new Set(resolveIdentifierTokens(descriptor.name));
    const entryTokens = new Set(resolveIdentifierTokens(descriptor.entry));
    const notesTokens = new Set(resolveTextTokens(descriptor.notes));

    for (const token of forbiddenTokens) {
      assert.equal(nameTokens.has(token), false, `Capability name contains forbidden token '${token}'`);
      assert.equal(entryTokens.has(token), false, `Capability entry contains forbidden token '${token}'`);
      assert.equal(notesTokens.has(token), false, `Capability notes contain forbidden token '${token}'`);
    }
  }
});

/**
 * Verifies runtime backend foundation descriptors avoid product and industry semantic tokens.
 */
test("runtime backend foundation descriptors remain semantic-neutral", () => {
  const forbiddenTokens = [
    "medical",
    "surgical",
    "bim",
    "cad",
    "gis",
    "commerce",
    "molecular",
    "game",
    "editor",
    "video",
    "business",
    "workflow",
  ];

  for (const descriptor of Object.values(ENGINE_RUNTIME_BACKEND_FOUNDATION_API)) {
    const nameTokens = new Set(resolveIdentifierTokens(descriptor.name));
    const determinismTokens = new Set(resolveTextTokens(descriptor.determinism));

    for (const token of forbiddenTokens) {
      assert.equal(nameTokens.has(token), false, `Backend foundation name contains forbidden token '${token}'`);
      assert.equal(
        determinismTokens.has(token),
        false,
        `Backend foundation determinism text contains forbidden token '${token}'`,
      );
    }
  }
});

/**
 * Verifies optimization policy bootstrap profiles stay capability-oriented and avoid product semantics.
 */
test("optimization policy bootstrap profiles remain semantic-neutral", () => {
  const forbiddenTokens = ["game", "editor", "video", "commerce", "medical", "bim", "cad", "gis"];
  const profileCandidates: readonly EnginePolicyProfile[] = [
    "interaction",
    "throughput",
    "latency",
    "balanced",
  ];
  const defaultProfile = resolveCreateEnginePolicyBootstrap({ debug: false }).profile;

  for (const profile of profileCandidates) {
    const tokens = new Set(resolveIdentifierTokens(profile));
    for (const forbiddenToken of forbiddenTokens) {
      assert.equal(
        tokens.has(forbiddenToken),
        false,
        `Optimization profile token must stay capability-neutral and avoid '${forbiddenToken}': ${profile}`,
      );
    }
  }

  assert.equal(defaultProfile, "interaction");
});
