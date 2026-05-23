import type {
  EngineCapabilityId,
  EngineModuleActivationResult,
  EngineModuleWarning,
} from "./module-contracts";
import { resolveEngineModuleRegistry } from "./module-registry";
import type { EngineRuntimeProfile } from "./profile-contracts";
import { validateEngineRuntimeProfile } from "./profile-validator";

/**
 * Options used while assembling a profile-backed runtime.
 */
export interface EngineRuntimeBuilderOptions {
  /**
   * Optional external warning sink used by host integrations and tests.
   */
  onWarning?: (warning: EngineModuleWarning) => void;
}

/**
 * Result returned by one runtime capability requirement check.
 */
export interface EngineRuntimeCapabilityRequirement {
  /**
   * Whether the requested capability exists in the assembled runtime.
   */
  available: boolean;
  /**
   * Whether the active strictness policy requires callers to stop execution.
   */
  shouldThrow: boolean;
  /**
    * Warning emitted for non-strict mode when capability is missing.
   */
  warning: EngineModuleWarning | null;
}

/**
 * Profile-assembled runtime shell before concrete engine behavior is routed into it.
 */
export interface EngineProfileRuntime {
  /**
   * Runtime profile id used to assemble this shell.
   */
  profileId: string;
  /**
   * Runtime target inherited from the active profile.
   */
  target: EngineRuntimeProfile["target"];
  /**
   * Missing-capability policy inherited from the active profile.
   */
  strictness: EngineRuntimeProfile["strictness"];
  /**
   * Deterministic module activation order.
   */
  moduleIds: readonly string[];
  /**
   * Active capabilities provided by activated modules.
   */
  capabilityIds: readonly EngineCapabilityId[];
  /**
   * Module activation results in deterministic profile order.
   */
  activationResults: readonly EngineModuleActivationResult[];
  /**
   * Warnings emitted during assembly or capability checks.
   */
  warnings: readonly EngineModuleWarning[];
  /**
   * Checks whether a capability exists without emitting warnings.
   */
  hasCapability: (capabilityId: EngineCapabilityId) => boolean;
  /**
    * Checks a required capability and applies strict/non-strict behavior.
   */
  requireCapability: (capabilityId: EngineCapabilityId) => EngineRuntimeCapabilityRequirement;
}

/**
 * Creates a profile-assembled runtime shell with active capability metadata.
 * @param profile Runtime profile manifest to assemble.
 * @param options Optional warning sink used by tests and host integrations.
 */
export function createEngineRuntimeFromProfile(
  profile: EngineRuntimeProfile,
  options: EngineRuntimeBuilderOptions = {},
): EngineProfileRuntime {
  const validation = validateEngineRuntimeProfile(profile);
  if (!validation.valid) {
    const message = validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message)
      .join("\n");
    throw new Error(message);
  }

  const registry = resolveEngineModuleRegistry(profile.modules);
  const warnings: EngineModuleWarning[] = [];
  const diagnostics = {
    warn: (warning: EngineModuleWarning) => {
      warnings.push(warning);
      options.onWarning?.(warning);
    },
  };
  const activationResults = profile.modules.map((moduleDefinition) => {
    if (moduleDefinition.initialize) {
      return moduleDefinition.initialize({
        strictness: profile.strictness,
        diagnostics,
      });
    }

    return {
      moduleId: moduleDefinition.id,
      active: true,
      providedCapabilities: moduleDefinition.provides,
    };
  });
  const runtimeCapabilityIds = collectRuntimeCapabilityIds(
    registry.capabilityIds,
    activationResults,
  );
  const runtimeCapabilitySet = new Set(runtimeCapabilityIds);

  /**
   * Checks whether the assembled runtime exposes one capability.
   * @param capabilityId Capability id requested by caller.
   */
  function hasCapability(capabilityId: EngineCapabilityId): boolean {
    return runtimeCapabilitySet.has(capabilityId);
  }

  /**
   * Applies active strictness policy to one required capability check.
   * @param capabilityId Capability id required by caller.
   */
  function requireCapability(
    capabilityId: EngineCapabilityId,
  ): EngineRuntimeCapabilityRequirement {
    if (hasCapability(capabilityId)) {
      return {
        available: true,
        shouldThrow: false,
        warning: null,
      };
    }

    const warning = createMissingCapabilityWarning(profile.id, capabilityId);
    if (profile.strictness === "strict") {
      return {
        available: false,
        shouldThrow: true,
        warning,
      };
    }

    diagnostics.warn(warning);
    return {
      available: false,
      shouldThrow: false,
      warning,
    };
  }

  return {
    profileId: profile.id,
    target: profile.target,
    strictness: profile.strictness,
    moduleIds: profile.modules.map((moduleDefinition) => moduleDefinition.id),
    capabilityIds: runtimeCapabilityIds,
    activationResults,
    warnings,
    hasCapability,
    requireCapability,
  };
}

/**
 * Collects active capability ids from registry and module activation results.
 * @param registryCapabilityIds Capability ids declared by module manifests.
 * @param activationResults Results returned by module activation hooks.
 */
function collectRuntimeCapabilityIds(
  registryCapabilityIds: readonly EngineCapabilityId[],
  activationResults: readonly EngineModuleActivationResult[],
): readonly EngineCapabilityId[] {
  const capabilityIds: EngineCapabilityId[] = [];
  const seenCapabilityIds = new Set<EngineCapabilityId>();

  for (const capabilityId of registryCapabilityIds) {
    if (!seenCapabilityIds.has(capabilityId)) {
      seenCapabilityIds.add(capabilityId);
      capabilityIds.push(capabilityId);
    }
  }

  for (const activationResult of activationResults) {
    if (!activationResult.active) {
      continue;
    }

    for (const capabilityId of activationResult.providedCapabilities) {
      if (!seenCapabilityIds.has(capabilityId)) {
        seenCapabilityIds.add(capabilityId);
        capabilityIds.push(capabilityId);
      }
    }
  }

  return capabilityIds;
}

/**
 * Builds the canonical missing-capability warning payload for runtime checks.
 * @param profileId Runtime profile id being checked.
 * @param capabilityId Capability id missing from the assembled runtime.
 */
function createMissingCapabilityWarning(
  profileId: string,
  capabilityId: EngineCapabilityId,
): EngineModuleWarning {
  return {
    code: "missing-runtime-capability",
    message: `Profile ${profileId} does not provide capability ${capabilityId}.`,
    capabilityId,
  };
}
