import type { EngineInputEvent } from "../input/input-port";
import type { EngineProtocolViewportSnapshot } from "../surface/viewport-port";

/**
 * Replay document operation payload used by protocol replay contracts.
 */
export interface EngineReplayDocumentOperation {
  /** Discriminant operation type used by replay consumers. */
  type: string;
  /** Optional node identifier used by node-scoped operations. */
  nodeId?: string;
  /** Optional opaque operation payload for contract compatibility. */
  payload?: Readonly<Record<string, unknown>>;
}

/**
 * Replay document change-set payload used by protocol replay boundaries.
 */
export interface EngineReplayDocumentChangeSet {
  /** Caller-defined deterministic change-set id. */
  id: string;
  /** Optional target revision expected after application. */
  targetRevision?: number;
  /** Ordered operations to apply for this change-set. */
  operations: readonly EngineReplayDocumentOperation[];
}

/**
 * Replay frame payload used by deterministic scenario/profile replays.
 */
export interface EngineReplayFrame {
  /** Frame timestamp in milliseconds relative to replay start. */
  atMs: number;
  /** Optional document change-set applied at this replay frame. */
  changeSet?: EngineReplayDocumentChangeSet;
  /** Optional viewport snapshot applied at this replay frame. */
  viewport?: EngineProtocolViewportSnapshot;
  /** Optional interaction input event applied at this replay frame. */
  input?: EngineInputEvent;
}

/**
 * Replay boundary contract for recorded deterministic runtime replays.
 */
export interface EngineReplayPort {
  /** Loads one ordered replay frame list into replay state. */
  loadFrames: (frames: readonly EngineReplayFrame[]) => void;
  /** Reads one ordered replay frame list from replay state. */
  getFrames: () => readonly EngineReplayFrame[];
}
