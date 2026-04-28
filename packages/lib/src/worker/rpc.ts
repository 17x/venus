/**
 * Defines a generic RPC envelope used between host and worker surfaces.
 */
export interface WorkerRpcEnvelope<TPayload = unknown> {
  /** Stores the stable message identifier used for request/response matching. */
  readonly id: string
  /** Stores the message type identifier. */
  readonly type: string
  /** Stores the message payload. */
  readonly payload: TPayload
}

/**
 * Creates a typed RPC envelope from id, type, and payload values.
 */
export function createWorkerRpcEnvelope<TPayload>(
  id: string,
  type: string,
  payload: TPayload,
): WorkerRpcEnvelope<TPayload> {
  return {
    id,
    type,
    payload,
  }
}

