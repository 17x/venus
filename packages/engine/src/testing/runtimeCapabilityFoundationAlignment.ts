import { ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API } from "../orchestration/runtime/document/document.foundation.contract";
import { ENGINE_RUNTIME_DIRTY_FOUNDATION_API } from "../orchestration/runtime/dirty/dirty.foundation.contract";
import { ENGINE_RUNTIME_WORLD_FOUNDATION_API } from "../orchestration/runtime/world/runtime-world.foundation.contract";
import { ENGINE_RUNTIME_COMMAND_FOUNDATION_API } from "../orchestration/runtime/command/command-buffer.foundation.contract";
import { ENGINE_RUNTIME_BACKEND_FOUNDATION_API } from "../orchestration/runtime/backend/backend.foundation.contract";
import { ENGINE_RUNTIME_PLAN_FOUNDATION_API } from "../orchestration/runtime/plan/runtime-plan.foundation.contract";
import { ENGINE_RUNTIME_RESOURCE_FOUNDATION_API } from "../orchestration/runtime/resource/runtime-resource.foundation.contract";
import { ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API } from "../orchestration/runtime/observability/runtime-observability.foundation.contract";
import { ENGINE_RUNTIME_VOLUME_FOUNDATION_API } from "../orchestration/runtime/volume/runtime-volume.foundation.contract";

/**
 * Capability entries that are intentionally outside current foundation descriptor families.
 */
export const NON_FOUNDATION_CAPABILITY_ENTRIES = [
  "EngineHandle.query",
  "EngineHandle.pick",
  "EngineHandle.raycast",
  "EngineHandle.getDiagnostics",
] as const;

/**
 * Converts one foundation descriptor method name to canonical capability-entry path.
 * @param foundationName Canonical foundation descriptor name starting with engine.
 */
export function resolveCapabilityEntryFromFoundationName(foundationName: string): string {
  return `EngineHandle.${foundationName.replace(/^engine\./, "")}`;
}

/**
 * Returns all landed runtime foundation descriptor names as one canonical list.
 */
export function resolveRuntimeFoundationDescriptorNames(): readonly string[] {
  return [
    ...Object.values(ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_DIRTY_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_WORLD_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_COMMAND_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_BACKEND_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_PLAN_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_VOLUME_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_RESOURCE_FOUNDATION_API),
    ...Object.values(ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API),
  ].map((descriptor) => descriptor.name);
}

/**
 * Returns all runtime foundation capability entries derived from descriptor names.
 */
export function resolveRuntimeFoundationCapabilityEntries(): readonly string[] {
  return resolveRuntimeFoundationDescriptorNames().map((name) =>
    resolveCapabilityEntryFromFoundationName(name),
  );
}

/**
 * Computes missing capability entries for current foundation descriptors.
 * @param capabilityEntries Current capability entry set.
 */
export function resolveMissingCapabilityEntries(
  capabilityEntries: ReadonlySet<string>,
): readonly string[] {
  const missingEntries: string[] = [];
  for (const foundationName of resolveRuntimeFoundationDescriptorNames()) {
    const expectedEntry = resolveCapabilityEntryFromFoundationName(foundationName);
    if (!capabilityEntries.has(expectedEntry)) {
      missingEntries.push(foundationName);
    }
  }
  return missingEntries;
}

/**
 * Computes capability entries that are neither foundation-derived nor explicitly whitelisted.
 * @param capabilityEntries Current capability entry set.
 */
export function resolveUnexpectedNonFoundationCapabilityEntries(
  capabilityEntries: ReadonlySet<string>,
): readonly string[] {
  const foundationEntrySet = new Set(resolveRuntimeFoundationCapabilityEntries());
  const nonFoundationWhitelistSet = new Set<string>(NON_FOUNDATION_CAPABILITY_ENTRIES);
  const unexpectedEntries: string[] = [];
  for (const entry of capabilityEntries) {
    if (!foundationEntrySet.has(entry) && !nonFoundationWhitelistSet.has(entry)) {
      unexpectedEntries.push(entry);
    }
  }
  return unexpectedEntries.sort();
}
