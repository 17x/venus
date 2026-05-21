/**
 * Frame callback signature used by protocol runtime scheduler contracts.
 */
export type EngineProtocolFrameCallback = (timestampMs: number) => void;

/**
 * Frame scheduling boundary used by runtime shell and host adapters.
 */
export interface EngineFrameSchedulerPort {
  /** Requests one frame callback from host scheduler. */
  requestFrame: (callback: EngineProtocolFrameCallback) => number;
  /** Cancels one frame callback previously requested from host scheduler. */
  cancelFrame: (handle: number) => void;
}

/**
 * Clock boundary used by runtime shell for deterministic timestamp sampling.
 */
export interface EngineRuntimeClockPort {
  /** Returns monotonic runtime timestamp in milliseconds. */
  now: () => number;
}

/**
 * Runtime host boundary that combines frame scheduler and clock contracts.
 */
export interface EngineRuntimeHostPort {
  /** Frame scheduler boundary. */
  scheduler: EngineFrameSchedulerPort;
  /** Clock boundary. */
  clock: EngineRuntimeClockPort;
}
