import type {
  EngineCapabilityId,
  EngineCoreModule,
  EngineModuleId,
} from "./module-contracts";

/**
 * Missing dependency reported when a module requires a capability no active module provides.
 */
export interface EngineModuleMissingRequirement {
  /**
   * Module with an unsatisfied requirement.
   */
  moduleId: EngineModuleId;
  /**
   * Required capability that is not present in the registry.
   */
  capabilityId: EngineCapabilityId;
}

/**
 * Duplicate module id detected while building a deterministic module registry.
 */
export interface EngineModuleDuplicateId {
  /**
   * Duplicate module id.
   */
  moduleId: EngineModuleId;
  /**
   * Number of times the id appears in the profile module list.
   */
  count: number;
}

/**
 * Resolved module registry data used by profile validation and runtime assembly.
 */
export interface EngineModuleRegistryResult {
  /**
   * Modules in deterministic profile order.
   */
  modules: readonly EngineCoreModule[];
  /**
   * Capabilities provided by the active module list.
   */
  capabilityIds: readonly EngineCapabilityId[];
  /**
   * Module requirements that are not satisfied by the active capability set.
   */
  missingRequirements: readonly EngineModuleMissingRequirement[];
  /**
   * Duplicate module ids that would make activation ambiguous.
   */
  duplicateModuleIds: readonly EngineModuleDuplicateId[];
}

/**
 * Builds a deterministic module registry from one ordered module list.
 * @param modules Ordered module list declared by a runtime profile.
 */
export function resolveEngineModuleRegistry(
  modules: readonly EngineCoreModule[],
): EngineModuleRegistryResult {
  const capabilityIds = collectCapabilityIds(modules);
  const capabilitySet = new Set(capabilityIds);
  const duplicateModuleIds = collectDuplicateModuleIds(modules);
  const missingRequirements = modules.flatMap((moduleDefinition) => {
    const requiredCapabilities = moduleDefinition.requires ?? [];
    return requiredCapabilities
      .filter((capabilityId) => !capabilitySet.has(capabilityId))
      .map((capabilityId) => ({
        moduleId: moduleDefinition.id,
        capabilityId,
      }));
  });

  return {
    modules,
    capabilityIds,
    missingRequirements,
    duplicateModuleIds,
  };
}

/**
 * Collects unique capability ids while preserving first-provider order.
 * @param modules Ordered module list declared by a runtime profile.
 */
function collectCapabilityIds(
  modules: readonly EngineCoreModule[],
): readonly EngineCapabilityId[] {
  const capabilityIds: EngineCapabilityId[] = [];
  const seenCapabilityIds = new Set<EngineCapabilityId>();

  for (const moduleDefinition of modules) {
    for (const capabilityId of moduleDefinition.provides) {
      if (!seenCapabilityIds.has(capabilityId)) {
        seenCapabilityIds.add(capabilityId);
        capabilityIds.push(capabilityId);
      }
    }
  }

  return capabilityIds;
}

/**
 * Collects duplicate module ids without changing profile module order.
 * @param modules Ordered module list declared by a runtime profile.
 */
function collectDuplicateModuleIds(
  modules: readonly EngineCoreModule[],
): readonly EngineModuleDuplicateId[] {
  const moduleIdCounts = new Map<EngineModuleId, number>();

  for (const moduleDefinition of modules) {
    moduleIdCounts.set(
      moduleDefinition.id,
      (moduleIdCounts.get(moduleDefinition.id) ?? 0) + 1,
    );
  }

  return Array.from(moduleIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([moduleId, count]) => ({ moduleId, count }));
}
