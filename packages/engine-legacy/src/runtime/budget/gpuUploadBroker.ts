// Module responsibility: arbitrate per-lane GPU upload budget under one frame envelope.
// Non-responsibility: uploading resources to GPU.

/**
 * Describes one upload lane request payload.
 */
export interface EngineGpuUploadLaneRequest {
  /** Lane id (image/text/geometry/other). */
  lane: string
  /** Requested upload bytes for this frame. */
  requestedBytes: number
  /** Whether lane is critical and must keep minimum reservation. */
  critical: boolean
}

/**
 * Describes one upload broker decision output.
 */
export interface EngineGpuUploadBrokerDecision {
  /** Granted bytes by lane id. */
  grantedBytesByLane: Record<string, number>
  /** Unused budget after arbitration. */
  remainingBytes: number
}

const CRITICAL_LANE_FLOOR_BYTES = 256 * 1024

/**
 * Intent: arbitrate upload bytes across lanes while preserving critical floor.
 * @param totalBudgetBytes Total upload budget bytes for current frame.
 * @param requests Per-lane upload requests.
 * @returns Upload grant decision per lane.
 */
export function resolveEngineGpuUploadBrokerDecision(
  totalBudgetBytes: number,
  requests: readonly EngineGpuUploadLaneRequest[],
): EngineGpuUploadBrokerDecision {
  const grantedBytesByLane: Record<string, number> = {}
  let remainingBytes = Math.max(0, totalBudgetBytes)

  for (const request of requests) {
    if (!request.critical) {
      continue
    }

    const floor = Math.min(remainingBytes, Math.min(CRITICAL_LANE_FLOOR_BYTES, Math.max(0, request.requestedBytes)))
    grantedBytesByLane[request.lane] = floor
    remainingBytes -= floor
  }

  for (const request of requests) {
    const alreadyGranted = grantedBytesByLane[request.lane] ?? 0
    const additionalNeeded = Math.max(0, request.requestedBytes - alreadyGranted)
    if (additionalNeeded === 0 || remainingBytes === 0) {
      continue
    }

    const additionalGrant = Math.min(remainingBytes, additionalNeeded)
    grantedBytesByLane[request.lane] = alreadyGranted + additionalGrant
    remainingBytes -= additionalGrant
  }

  return {
    grantedBytesByLane,
    remainingBytes,
  }
}
