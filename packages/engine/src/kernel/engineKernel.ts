import type { EngineCapabilityId } from "./module-contracts";
import type { EngineRuntimeProfile } from "./profile-contracts";
import { createEngineRuntimeFromProfile } from "./runtime-builder";

/**
 * Declares one assembled kernel handle for capability-gated module execution.
 */
export interface EngineKernelHandle {
  /** Active profile id used to assemble this kernel instance. */
  profileId: string;
  /** Checks whether one capability is active inside this kernel. */
  hasCapability: (capabilityId: EngineCapabilityId) => boolean;
  /**
   * Requires one capability and throws when strict profile does not provide it.
   */
  requireCapability: (capabilityId: EngineCapabilityId) => void;
}

/**
 * Creates one kernel handle from the provided runtime profile.
 * @param profile Runtime profile used to activate modules and capability set.
 * @returns Assembled kernel handle for capability-gated module access.
 */
export function createEngineKernel(profile: EngineRuntimeProfile): EngineKernelHandle {
  const runtime = createEngineRuntimeFromProfile(profile);

  return {
    profileId: runtime.profileId,
    hasCapability: runtime.hasCapability,
    requireCapability: (capabilityId) => {
      const requirement = runtime.requireCapability(capabilityId);
      if (requirement.shouldThrow) {
        throw new Error(
          `Missing required capability ${capabilityId} for profile ${runtime.profileId}.`,
        );
      }
    },
  };
}
