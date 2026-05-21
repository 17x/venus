/**
 * Declares one easing function over normalized progress values.
 */
export type EngineEasingFunction = (t: number) => number

/**
 * Declares easing definitions accepted by preset animation policies.
 */
export type EngineEasingDefinition = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | EngineEasingFunction

/**
 * Declares one animation task managed by the preset animation controller.
 */
interface PresetAnimationTask {
  /** Stores stable task id. */
  id: string
  /** Stores task start timestamp. */
  startedAt: number
  /** Stores source scalar value. */
  from: number
  /** Stores destination scalar value. */
  to: number
  /** Stores task duration in milliseconds. */
  durationMs: number
  /** Stores resolved easing function. */
  easing: EngineEasingFunction
  /** Stores per-frame update callback. */
  onUpdate: (value: number) => void
  /** Stores optional completion callback. */
  onComplete?: () => void
}

/**
 * Declares runtime animation controller contract used by vector presets.
 */
export interface EngineAnimationController {
  /** Starts or replaces one animation task and returns its id. */
  start: (options: {
    id?: string
    from: number
    to: number
    durationMs: number
    easing?: EngineEasingDefinition
    onUpdate: (value: number) => void
    onComplete?: () => void
  }) => string
  /** Stops one animation task by id. */
  stop: (id: string) => void
  /** Stops all active animation tasks. */
  stopAll: () => void
}

export type CubicBezierTuple = readonly [number, number, number, number]
export type PresetEasing = EngineEasingDefinition | CubicBezierTuple

export interface PresetAnimationControllerOptions {
  idFactory?: () => string
}

export const EASING_PRESET_LINEAR: CubicBezierTuple = [0, 0, 1, 1]
export const EASING_PRESET_STANDARD: CubicBezierTuple = [0.2, 0, 0, 1]
export const EASING_PRESET_EMPHASIS: CubicBezierTuple = [0.2, 0.8, 0.2, 1]

/**
 * Resolve policy-level easing definitions to pure easing functions.
 *
 * Why:
 * - keeps cubic-bezier policy out of runtime core
 * - gives app layers one stable resolver for config, presets, and custom
 *   easing callbacks
 */
export function resolvePresetEasing(easing: PresetEasing | undefined): EngineEasingFunction {
  if (!easing) {
    return (t: number) => t
  }

  if (Array.isArray(easing)) {
    return createCubicBezierEasing(easing[0], easing[1], easing[2], easing[3])
  }

  if (typeof easing === 'function') {
    return easing
  }

  switch (easing) {
    case 'easeIn':
      return (t: number) => t * t
    case 'easeOut':
      return (t: number) => 1 - (1 - t) * (1 - t)
    case 'easeInOut':
      return (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)
    case 'linear':
    default:
      return (t: number) => t
  }
}

/**
 * Convenience entry for app layers that want default preset easing behavior
 * without wiring resolver/plumbing every time.
 */
export function createPresetAnimationController(
  options?: PresetAnimationControllerOptions,
): EngineAnimationController {
  const tasks = new Map<string, PresetAnimationTask>()
  let rafId: number | null = null

  const tick = () => {
    rafId = null
    const now = performance.now()

    tasks.forEach((task, id) => {
      const elapsed = now - task.startedAt
      const progress = task.durationMs <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / task.durationMs))
      const value = task.from + (task.to - task.from) * task.easing(progress)
      task.onUpdate(value)

      if (progress >= 1) {
        tasks.delete(id)
        task.onComplete?.()
      }
    })

    if (tasks.size > 0) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const ensureTicking = () => {
    if (rafId !== null) {
      return
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    start: ({id, from, to, durationMs, easing, onUpdate, onComplete}) => {
      const taskId = id ?? (options?.idFactory?.() ?? `preset-animation-${Date.now()}`)
      tasks.set(taskId, {
        id: taskId,
        startedAt: performance.now(),
        from,
        to,
        durationMs,
        easing: resolvePresetEasing(easing),
        onUpdate,
        onComplete,
      })
      ensureTicking()
      return taskId
    },
    stop: (id) => {
      tasks.delete(id)
    },
    stopAll: () => {
      tasks.clear()
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },
  }
}

function createCubicBezierEasing(x1: number, y1: number, x2: number, y2: number): EngineEasingFunction {
  const clampedX1 = clampUnitInterval(x1)
  const clampedX2 = clampUnitInterval(x2)
  const sampleCurveX = (t: number) => cubicCoordinate(t, 0, clampedX1, clampedX2, 1)
  const sampleCurveY = (t: number) => cubicCoordinate(t, 0, y1, y2, 1)
  const sampleCurveDerivativeX = (t: number) =>
    3 * (1 - t) ** 2 * (clampedX1 - 0) +
    6 * (1 - t) * t * (clampedX2 - clampedX1) +
    3 * t * t * (1 - clampedX2)

  return (t: number) => {
    const x = clampUnitInterval(t)
    let guess = x

    for (let i = 0; i < 6; i += 1) {
      const currentX = sampleCurveX(guess) - x
      const derivative = sampleCurveDerivativeX(guess)
      if (Math.abs(currentX) < 1e-6 || Math.abs(derivative) < 1e-6) {
        break
      }
      guess -= currentX / derivative
      guess = clampUnitInterval(guess)
    }

    return clampUnitInterval(sampleCurveY(guess))
  }
}

function cubicCoordinate(t: number, p0: number, p1: number, p2: number, p3: number) {
  const oneMinusT = 1 - t
  return (
    oneMinusT ** 3 * p0 +
    3 * oneMinusT ** 2 * t * p1 +
    3 * oneMinusT * t * t * p2 +
    t ** 3 * p3
  )
}

function clampUnitInterval(value: number) {
  return Math.max(0, Math.min(1, value))
}
