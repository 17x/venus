// Runtime-facing engine facade for app shells.
// Keep app imports on `@vector/runtime/engine` so `@venus/engine` remains an
// implementation detail behind runtime package boundaries.
import {
  createEngine as createRawEngine,
} from '@venus/engine'
import {
  applyAffineMatrixToPoint,
  type AffineMatrix,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  invertAffineMatrix,
} from '@venus/lib'
import type {
  EngineHandle as InternalEngine,
  CreateEngineOptions,
} from '@venus/engine'
import {createSingleFlightScheduler} from '@venus/lib/scheduler'
import type {SchedulerMode} from '@venus/lib/scheduler'

/**
 * Runtime-facing engine contract for vector bridge consumers.
 * Performance-tuning mutators stay engine-internal during the debug stage.
 */
export type RuntimeEngine = Omit<
  InternalEngine,
  | 'setDpr'
  | 'setQuality'
  | 'setInteractionPreview'
>

export type {
} from '@venus/engine'

/**
 * Declares scheduler diagnostics emitted by vector bridge scheduler facade.
 */
export interface EngineRenderSchedulerDiagnostics {
  /** Stores request-to-flush wait time in milliseconds. */
  lastQueueWaitMs: number
  /** Stores current interactive throttle delay in milliseconds. */
  lastInteractiveThrottleDelayMs: number
  /** Stores count of coalesced requests while one frame is pending. */
  coalescedRequestCount: number
  /** Stores whether render execution is currently in flight. */
  inFlight: boolean
  /** Stores whether one frame callback is pending. */
  pendingRaf: boolean
}

/**
 * Declares scheduler lifecycle operations exposed to vector renderer runtime.
 */
export interface EngineRenderScheduler {
  /** Requests one scheduled render in interactive or normal mode. */
  request: (mode?: SchedulerMode) => void
  /** Returns latest diagnostics snapshot. */
  getDiagnostics: () => EngineRenderSchedulerDiagnostics
  /** Cancels queued work. */
  cancel: () => void
  /** Cancels queued work and disposes scheduler state. */
  dispose: () => void
}

/**
 * Declares one resolved geometry payload emitted by runtime geometry adapters.
 */
export type EngineGeometryPayload = ReturnType<InternalEngine['runtime']['plan']['createHitGeometryPayload']>

/**
 * Declares geometry payload options accepted by runtime geometry adapters.
 */
export type ResolveEngineGeometryPayloadOptions = Parameters<InternalEngine['runtime']['plan']['createHitGeometryPayload']>[0]

/**
 * Declares adaptive hit-tolerance options accepted by runtime adapters.
 */
export type ResolveEngineAdaptiveHitToleranceOptions = Parameters<InternalEngine['runtime']['plan']['resolveHitTolerance']>[0]

/**
 * Declares normalized source transform fields used by vector transform adapters.
 */
export interface BoxTransformSource {
  /** Stores node x in world coordinates. */
  x: number
  /** Stores node y in world coordinates. */
  y: number
  /** Stores node width in world coordinates. */
  width: number
  /** Stores node height in world coordinates. */
  height: number
  /** Stores optional rotation in degrees. */
  rotation?: number
  /** Stores optional flip flag on x axis. */
  flipX?: boolean
  /** Stores optional flip flag on y axis. */
  flipY?: boolean
}

/**
 * Declares resolved matrix-based node transform payload used by scene adapters.
 */
export interface ResolvedNodeTransform {
  /** Stores normalized node bounds. */
  bounds: {
    /** Stores minimum x in world coordinates. */
    minX: number
    /** Stores minimum y in world coordinates. */
    minY: number
    /** Stores maximum x in world coordinates. */
    maxX: number
    /** Stores maximum y in world coordinates. */
    maxY: number
    /** Stores normalized bounds width. */
    width: number
    /** Stores normalized bounds height. */
    height: number
  }
  /** Stores transform center in world coordinates. */
  center: {
    /** Stores center x. */
    x: number
    /** Stores center y. */
    y: number
  }
  /** Stores rotation in degrees. */
  rotation: number
  /** Stores whether x axis is flipped. */
  flipX: boolean
  /** Stores whether y axis is flipped. */
  flipY: boolean
  /** Stores forward affine matrix [a,b,c,d,e,f]. */
  matrix: AffineMatrix
  /** Stores inverse affine matrix [a,b,c,d,e,f]. */
  inverseMatrix: AffineMatrix
}

/**
 * Stores one lazily-created bridge helper engine used for stateless runtime/capability wrappers.
 */
let bridgeHelperEngine: InternalEngine | null = null

/**
 * Resolves one lazily-created helper engine exposing formal runtime/capability APIs.
 */
function resolveBridgeHelperEngine(): InternalEngine {
  if (bridgeHelperEngine) {
    return bridgeHelperEngine
  }

  bridgeHelperEngine = createRawEngine({
    backend: 'headless',
    surface: {
      width: 1,
      height: 1,
    },
  })
  return bridgeHelperEngine
}

/**
 * Creates render scheduler facade backed by shared lib single-flight scheduler.
 * @param options Scheduler creation options.
 */
export function createEngineRenderScheduler(options: {
  render: () => Promise<unknown>
  interactiveIntervalMs?: number
  onError?: (error: unknown) => void
  now?: () => number
  scheduleFrame?: (callback: () => void) => number
  cancelFrame?: (handle: number) => void
}): EngineRenderScheduler {
  const scheduler = createSingleFlightScheduler({
    run: options.render,
    interactiveIntervalMs: options.interactiveIntervalMs,
    onError: options.onError,
    now: options.now,
    scheduleFrame: options.scheduleFrame,
    cancelFrame: options.cancelFrame,
  })

  return {
    request: scheduler.request,
    getDiagnostics: () => {
      const diagnostics = scheduler.getDiagnostics()
      return {
        lastQueueWaitMs: diagnostics.lastQueueWaitMs,
        lastInteractiveThrottleDelayMs: diagnostics.lastInteractiveThrottleDelayMs,
        coalescedRequestCount: diagnostics.coalescedRequestCount,
        inFlight: diagnostics.inFlight,
        pendingRaf: diagnostics.pendingFrame,
      }
    },
    cancel: scheduler.cancel,
    dispose: scheduler.dispose,
  }
}

/**
 * Resolves unified geometry payload through formal runtime plan API.
 * @param options Unified geometry query options from vector/editor runtime.
 */
export function resolveEngineGeometryPayload(
  options: ResolveEngineGeometryPayloadOptions,
): EngineGeometryPayload {
  return resolveBridgeHelperEngine().runtime.plan.createHitGeometryPayload(options)
}

/**
 * Resolves adaptive hit tolerance through formal runtime plan API.
 * @param options Optional viewport and tuning inputs for adaptive tolerance.
 */
export function resolveEngineAdaptiveHitTolerance(
  options?: ResolveEngineAdaptiveHitToleranceOptions,
) {
  const basePx = Math.max(0, options?.basePx ?? 6)
  const viewportScale = Math.max(Number.EPSILON, options?.viewportScale ?? 1)
  const viewportDiagonal = Math.max(
    1,
    Math.hypot(options?.viewportWidth ?? 0, options?.viewportHeight ?? 0),
  )
  const config = options?.config ?? {}
  const minPx = Math.max(0, config.minPx ?? 2)
  const maxPx = Math.max(minPx, config.maxPx ?? 10)
  const referenceViewportDiagonalPx = Math.max(1, config.referenceViewportDiagonalPx ?? 1400)
  const zoomExponent = Math.max(0, config.zoomExponent ?? 0.35)
  const screenExponent = Math.max(0, config.screenExponent ?? 0.2)

  // Keep tolerance stable under zoom/screen variance while preserving small-feature targeting.
  const zoomFactor = 1 / Math.pow(viewportScale, zoomExponent)
  const screenFactor = Math.pow(referenceViewportDiagonalPx / viewportDiagonal, screenExponent)
  const resolvedScreenPx = Math.max(minPx, Math.min(maxPx, basePx * zoomFactor * screenFactor))

  return {
    screenPx: resolvedScreenPx,
    worldPx: resolvedScreenPx / viewportScale,
  }
}

/**
 * Resolves node transform metadata through formal runtime world API.
 * @param source Raw source box transform fields.
 */
export function resolveNodeTransform(
  source: BoxTransformSource,
): ResolvedNodeTransform {
  const bounds = getNormalizedBoundsFromBox(
    source.x,
    source.y,
    source.width,
    source.height,
  )
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const rotation = source.rotation ?? 0
  const flipX = source.flipX ?? false
  const flipY = source.flipY ?? false
  const matrix = createAffineMatrixAroundPoint(center, {
    rotationDegrees: rotation,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  })

  return {
    bounds,
    center,
    rotation,
    flipX,
    flipY,
    matrix,
    inverseMatrix: invertAffineMatrix(matrix),
  }
}

/**
 * Declares overlay node payload shape used by vector overlay composition.
 */
export interface EngineOverlayDrawNode {
  /** Stores stable overlay node id. */
  id: string
  /** Stores overlay node discriminator. */
  type: string
  /** Stores extra overlay payload fields owned by vector runtime. */
  [key: string]: unknown
}

/**
 * Creates a runtime-facing engine handle with performance mutators hidden.
 * The underlying engine still owns these APIs internally.
 * @param options Engine creation options for surface/backend/runtime configuration.
 */
export function createEngine(options: CreateEngineOptions): RuntimeEngine {
  return createRawEngine(options) as RuntimeEngine
}

export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
}

