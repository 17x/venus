import type { EngineFrameInfo } from '../../time/index.ts'

export type EngineAnimationId = string

export type EngineEasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
export type EngineEasingFunction = (t: number) => number
export type EngineEasingDefinition = EngineEasingName | EngineEasingFunction

export interface EngineAnimationSpec<T = number> {
  id?: EngineAnimationId
  from: T
  to: T
  duration: number
  // Prefer named easing for transport/serialization boundaries; functions are
  // kept for local advanced control.
  easing?: EngineEasingDefinition
  onUpdate: (value: T, frame: EngineFrameInfo) => void
  onComplete?: () => void
  interpolate?: (from: T, to: T, progress: number) => T
}

export interface EngineAnimationController {
  start<T>(spec: EngineAnimationSpec<T>): EngineAnimationId
  stop(id: EngineAnimationId): void
  stopAll(): void
  tick(frame: EngineFrameInfo): void
}

interface ActiveAnimation {
  id: EngineAnimationId
  spec: EngineAnimationSpec<unknown>
  startedAt: number
}

interface EngineAnimationControllerOptions {
  resolveEasing?: (easing: EngineEasingDefinition | undefined) => EngineEasingFunction
  idFactory?: () => EngineAnimationId
}

const EASE_IN_OUT_HALF = 0.5
const EASE_IN_OUT_DOUBLE = 2
const EASE_IN_OUT_NEGATIVE_DOUBLE = -2

// Create a small in-memory animation timeline that advances by external frame ticks.
/**
 * Handles createEngineAnimationController.
 * @param options Options object for this operation.
 */
export function createEngineAnimationController(
  options?: EngineAnimationControllerOptions,
): EngineAnimationController {
  const active = new Map<EngineAnimationId, ActiveAnimation>()
  const resolveEasing = options?.resolveEasing ?? resolveBuiltinEasing
  const resolveId = options?.idFactory ?? createDefaultAnimationIdFactory()

  return {
    start: (spec) => {
      const id = spec.id ?? resolveId()
      active.set(id, {
        id,
        // Store as unknown-typed active record because controller tracks heterogenous animation value types.
        spec: spec as EngineAnimationSpec<unknown>,
        startedAt: -1,
      })

      return id
    },
    stop: (id) => {
      active.delete(id)
    },
    stopAll: () => {
      active.clear()
    },
    tick: (frame) => {
      if (active.size === 0) {
        return
      }

      for (const [id, record] of active) {
        if (record.startedAt < 0) {
          record.startedAt = frame.now
        }

        const duration = Math.max(0, record.spec.duration)
        if (duration === 0) {
          // Zero-duration animations still emit one deterministic final update.
          const finalValue = resolveInterpolatedValue(record.spec, 1)
          record.spec.onUpdate(finalValue, frame)
          record.spec.onComplete?.()
          active.delete(id)
          continue
        }

        const elapsed = frame.now - record.startedAt
        // Clamp to keep interpolation stable even if callers skip frames.
        const progress = Math.max(0, Math.min(1, elapsed / duration))
        const eased = resolveEasing(record.spec.easing)(progress)
        const value = resolveInterpolatedValue(record.spec, eased)

        record.spec.onUpdate(value, frame)

        if (progress >= 1) {
          record.spec.onComplete?.()
          active.delete(id)
        }
      }
    },
  }
}

// Resolve interpolation strategy per spec and fall back to the numeric/default branch.
/**
 * Handles resolveInterpolatedValue.
 * @param spec spec parameter.
 * @param progress progress parameter.
 */
function resolveInterpolatedValue<T>(spec: EngineAnimationSpec<T>, progress: number) {
  const interpolate = spec.interpolate ?? defaultInterpolate
  return interpolate(spec.from, spec.to, progress)
}

// Provide deterministic interpolation for scalar values and stable terminal behavior for generic values.
/**
 * Handles defaultInterpolate.
 * @param from from parameter.
 * @param to to parameter.
 * @param progress progress parameter.
 */
function defaultInterpolate<T>(from: T, to: T, progress: number): T {
  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * progress) as T
  }

  if (progress >= 1) {
    return to
  }

  return from
}

// Normalize mixed easing input (name or callback) into one executable easing function.
/**
 * Handles resolveBuiltinEasing.
 * @param easing easing parameter.
 */
function resolveBuiltinEasing(easing: EngineEasingDefinition | undefined): EngineEasingFunction {
  if (typeof easing === 'function') {
    return easing
  }

  switch (easing) {
    case 'easeIn':
      return (t) => t * t
    case 'easeOut':
      return (t) => 1 - (1 - t) * (1 - t)
    case 'easeInOut':
      return (t) => (
        t < EASE_IN_OUT_HALF
          ? EASE_IN_OUT_DOUBLE * t * t
          : 1 - ((EASE_IN_OUT_NEGATIVE_DOUBLE * t + EASE_IN_OUT_DOUBLE) ** EASE_IN_OUT_DOUBLE) / EASE_IN_OUT_DOUBLE
      )
    case 'linear':
    default:
      return (t) => t
  }
}

// Provide monotonic animation ids for callers that do not supply explicit ids.
/**
 * Creates default animation id factory.
 */
function createDefaultAnimationIdFactory() {
  let sequence = 0

  return () => {
    sequence += 1
    return `engine.animation.${sequence}`
  }
}
