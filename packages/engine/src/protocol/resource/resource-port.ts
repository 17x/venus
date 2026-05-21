/**
 * Opaque resource-handle identifier used by runtime/resource boundaries.
 */
export type EngineResourceHandle = string;

/**
 * Resource descriptor payload managed by resource adapters.
 */
export interface EngineResourceDescriptor {
  /** Stable resource identifier. */
  id: string;
  /** Resource kind used for adapter-specific ownership. */
  kind: "image" | "texture" | "font" | "buffer" | "custom";
  /** Optional version for deterministic cache invalidation. */
  version?: number;
}

/**
 * Resource boundary contract used by core/runtime module orchestration.
 */
export interface EngineResourcePort {
  /** Acquires one resource handle from descriptor metadata. */
  acquire: (descriptor: EngineResourceDescriptor) => EngineResourceHandle;
  /** Releases one previously acquired resource handle. */
  release: (handle: EngineResourceHandle) => void;
}
