/**
 * Interaction mutation kind contract used by protocol input boundaries.
 */
export type EngineProtocolInteractionMutationKind = "none" | "set" | "pan" | "zoom";

/**
 * Input event payload normalized for interaction module boundaries.
 */
export interface EngineInputEvent {
  /** Normalized interaction kind. */
  kind: EngineProtocolInteractionMutationKind;
  /** Event timestamp in milliseconds. */
  atMs: number;
  /** Optional horizontal delta for pan-like events. */
  deltaX?: number;
  /** Optional vertical delta for pan-like events. */
  deltaY?: number;
  /** Optional scale factor for zoom-like events. */
  scale?: number;
}

/**
 * Input boundary contract for runtime interaction routing.
 */
export interface EngineInputPort {
  /** Queues one normalized input event for interaction processing. */
  pushEvent: (event: EngineInputEvent) => void;
  /** Drains queued normalized input events in deterministic order. */
  drainEvents: () => readonly EngineInputEvent[];
}
