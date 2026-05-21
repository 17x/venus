import { resolveEngineModuleRegistry } from "../core/module/module-registry";
import type {
  EngineCapabilityId,
} from "../core/module/module-contracts";
import type {
  EngineCapabilityAccessInput,
  EngineCapabilityAccessResult,
  EngineRuntimeProfile,
} from "./profile-contracts";

/**
 * Severity for profile validation issues.
 */
export type EngineProfileValidationSeverity = "error" | "warning";

/**
 * One deterministic issue emitted by profile manifest validation.
 */
export interface EngineProfileValidationIssue {
  /**
   * Issue severity used by validation gates.
   */
  severity: EngineProfileValidationSeverity;
  /**
   * Machine-readable validation code.
   */
  code: string;
  /**
   * Human-readable validation message.
   */
  message: string;
  /**
   * Profile that produced the issue.
   */
  profileId: string;
  /**
   * Module related to the issue when applicable.
   */
  moduleId?: string;
  /**
   * Capability related to the issue when applicable.
   */
  capabilityId?: EngineCapabilityId;
}

/**
 * Full result for validating one runtime profile manifest.
 */
export interface EngineProfileValidationResult {
  /**
   * Whether the profile can assemble a runtime without blocking issues.
   */
  valid: boolean;
  /**
   * Profile that was validated.
   */
  profile: EngineRuntimeProfile;
  /**
   * Capability ids exposed by active modules.
   */
  activeCapabilityIds: readonly EngineCapabilityId[];
  /**
   * Validation issues in deterministic order.
   */
  issues: readonly EngineProfileValidationIssue[];
}

/**
 * Validates one runtime profile manifest before runtime assembly.
 * @param profile Runtime profile manifest to validate.
 */
export function validateEngineRuntimeProfile(
  profile: EngineRuntimeProfile,
): EngineProfileValidationResult {
  const registry = resolveEngineModuleRegistry(profile.modules);
  const activeCapabilitySet = new Set(registry.capabilityIds);
  const issues: EngineProfileValidationIssue[] = [];

  for (const duplicateModuleId of registry.duplicateModuleIds) {
    issues.push({
      severity: "error",
      code: "duplicate-module-id",
      message: `Profile ${profile.id} declares module ${duplicateModuleId.moduleId} ${duplicateModuleId.count} times.`,
      profileId: profile.id,
      moduleId: duplicateModuleId.moduleId,
    });
  }

  for (const missingRequirement of registry.missingRequirements) {
    issues.push({
      severity: "error",
      code: "missing-module-requirement",
      message: `Module ${missingRequirement.moduleId} requires missing capability ${missingRequirement.capabilityId}.`,
      profileId: profile.id,
      moduleId: missingRequirement.moduleId,
      capabilityId: missingRequirement.capabilityId,
    });
  }

  for (const capabilityId of profile.requiredCapabilities ?? []) {
    if (!activeCapabilitySet.has(capabilityId)) {
      issues.push({
        severity: "error",
        code: "missing-profile-capability",
        message: `Profile ${profile.id} requires missing capability ${capabilityId}.`,
        profileId: profile.id,
        capabilityId,
      });
    }
  }

  const duplicateBackendModes = collectDuplicateBackendModes(profile.backendPriority ?? []);
  for (const backendMode of duplicateBackendModes) {
    issues.push({
      severity: "warning",
      code: "duplicate-backend-priority",
      message: `Profile ${profile.id} repeats backend priority ${backendMode}.`,
      profileId: profile.id,
    });
  }

  const scenarioIssues = collectScenarioManifestIssues(profile);
  for (const issue of scenarioIssues) {
    issues.push(issue);
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    profile,
    activeCapabilityIds: registry.capabilityIds,
    issues,
  };
}

/**
 * Collects scenario-manifest issues so scenario profiles stay replay/diagnostics ready.
 * @param profile Runtime profile manifest to inspect.
 */
function collectScenarioManifestIssues(
  profile: EngineRuntimeProfile,
): readonly EngineProfileValidationIssue[] {
  const issues: EngineProfileValidationIssue[] = [];

  if (!profile.scenarioManifest) {
    return issues;
  }

  if (profile.scenarioManifest.replay.documentChangeSets.length === 0) {
    issues.push({
      severity: "warning",
      code: "empty-scenario-document-replay",
      message: `Scenario profile ${profile.id} has no recorded document change-sets.`,
      profileId: profile.id,
    });
  }

  if (profile.scenarioManifest.replay.viewportStates.length === 0) {
    issues.push({
      severity: "warning",
      code: "empty-scenario-viewport-replay",
      message: `Scenario profile ${profile.id} has no recorded viewport states.`,
      profileId: profile.id,
    });
  }

  return issues;
}

/**
 * Resolves missing-capability behavior for one API access against a profile.
 * @param input Profile and capability pair being checked.
 */
export function resolveEngineCapabilityAccess(
  input: EngineCapabilityAccessInput,
): EngineCapabilityAccessResult {
  const validation = validateEngineRuntimeProfile(input.profile);
  const activeCapabilitySet = new Set(validation.activeCapabilityIds);
  const available = activeCapabilitySet.has(input.capabilityId);

  if (available) {
    return {
      available: true,
      shouldThrow: false,
      shouldWarn: false,
      message: null,
    };
  }

  const message = `Profile ${input.profile.id} does not provide capability ${input.capabilityId}.`;
  return {
    available: false,
    shouldThrow: input.profile.strictness === "strict",
    shouldWarn: input.profile.strictness !== "strict",
    message,
  };
}

/**
 * Throws when a profile has blocking validation issues.
 * @param profile Runtime profile manifest to validate.
 */
export function assertEngineRuntimeProfile(profile: EngineRuntimeProfile): void {
  const validation = validateEngineRuntimeProfile(profile);
  if (validation.valid) {
    return;
  }

  const message = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message)
    .join("\n");
  throw new Error(message);
}

/**
 * Collects repeated backend modes so profiles can keep backend metadata deterministic.
 * @param backendPriority Ordered backend priority metadata from a profile.
 */
function collectDuplicateBackendModes(
  backendPriority: readonly string[],
): readonly string[] {
  const backendModeCounts = new Map<string, number>();

  for (const backendMode of backendPriority) {
    backendModeCounts.set(
      backendMode,
      (backendModeCounts.get(backendMode) ?? 0) + 1,
    );
  }

  return Array.from(backendModeCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([backendMode]) => backendMode);
}
