import type { EngineRenderPass } from "./renderPassGraph";

/**
 * Declares the extensible pass registration API for governed render pass injection.
 * Allows pipeline extensions to register custom passes without modifying core engine code.
 */
export interface EnginePassRegistrationAPI {
  /** Registers one custom render pass with dependency ordering. */
  registerPass(pass: EngineRenderPass): void;
  /** Unregisters one previously registered pass by id. */
  unregisterPass(passId: string): boolean;
  /** Returns all registered passes including core passes. */
  getRegisteredPasses(): readonly EngineRenderPass[];
  /** Returns whether one pass id is already registered. */
  isPassRegistered(passId: string): boolean;
}

/**
 * Creates an extensible pass registration API backed by an internal registry.
 * Core passes are injected at construction and cannot be unregistered.
 * @param corePasses Immutable core render passes.
 */
export function createEnginePassRegistrationAPI(
  corePasses: readonly EngineRenderPass[],
): EnginePassRegistrationAPI {
  const corePassIds = new Set(corePasses.map((p) => p.id));
  const registered = new Map<string, EngineRenderPass>(
    corePasses.map((p) => [p.id, p]),
  );

  return {
    registerPass: (pass) => {
      if (corePassIds.has(pass.id)) {
        return; // Cannot override core passes.
      }
      registered.set(pass.id, pass);
    },
    unregisterPass: (passId) => {
      if (corePassIds.has(passId)) {
        return false; // Cannot unregister core passes.
      }
      return registered.delete(passId);
    },
    getRegisteredPasses: () => [...registered.values()],
    isPassRegistered: (id) => registered.has(id),
  };
}
