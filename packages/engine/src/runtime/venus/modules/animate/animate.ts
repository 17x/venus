import type {
  VenusAnimatableProperty,
  VenusAnimationController,
  VenusAnimationKeyframe,
  VenusAnimationOptions,
  VenusNode,
} from '../../Venus.ts'

export interface VenusAnimateControllerOptions {
  node: VenusNode | undefined
  keyframes: readonly [VenusAnimationKeyframe, VenusAnimationKeyframe]
  options?: VenusAnimationOptions
  onFrame(): void
}

const DEFAULT_VENUS_ANIMATION_DURATION_MS = 300
const FALLBACK_FRAME_DELAY_MS = 16

const resolveVenusEasing = (easing: VenusAnimationOptions['easing']): (progress: number) => number => {
  switch (easing) {
    case 'easeIn':
      return (progress) => progress * progress
    case 'easeOut':
      return (progress) => 1 - (1 - progress) * (1 - progress)
    case 'easeInOut':
      return (progress) => progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2
    case 'linear':
    default:
      return (progress) => progress
  }
}

const requestVenusAnimationFrame = (callback: (now: number) => void): number => {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback)
  }

  return Number(globalThis.setTimeout(() => callback(Date.now()), FALLBACK_FRAME_DELAY_MS))
}

const cancelVenusAnimationFrame = (handle: number): void => {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(handle)
    return
  }

  globalThis.clearTimeout(handle)
}

const getVenusAnimationProperty = (node: VenusNode, property: VenusAnimatableProperty): number => {
  const value = (node as Partial<Record<VenusAnimatableProperty, number>>)[property]
  return typeof value === 'number' ? value : 0
}

const setVenusAnimationProperty = (
  node: VenusNode,
  property: VenusAnimatableProperty,
  value: number,
): void => {
  ;(node as Partial<Record<VenusAnimatableProperty, number>>)[property] = value
}

const getAnimatableProperties = (keyframe: VenusAnimationKeyframe): VenusAnimatableProperty[] => {
  return (['x', 'y', 'opacity', 'rotation'] as const).filter((property) => typeof keyframe[property] === 'number')
}

const interpolateScalar = (from: number, to: number, progress: number): number => {
  return from + (to - from) * progress
}

export function createVenusAnimationController({
  node,
  keyframes,
  options = {},
  onFrame,
}: VenusAnimateControllerOptions): VenusAnimationController {
  let frameHandle: number | null = null
  let startedAt: number | null = null
  let paused = false
  let settled = false
  let resolveFinished: () => void = () => undefined
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve
  })

  const [, to] = keyframes
  const properties = node ? getAnimatableProperties(to) : []
  const fromValues = new Map<VenusAnimatableProperty, number>()
  const toValues = new Map<VenusAnimatableProperty, number>()
  const duration = Math.max(0, options.duration ?? DEFAULT_VENUS_ANIMATION_DURATION_MS)
  const ease = resolveVenusEasing(options.easing)

  if (node) {
    for (const property of properties) {
      fromValues.set(property, keyframes[0][property] ?? getVenusAnimationProperty(node, property))
      toValues.set(property, to[property] ?? getVenusAnimationProperty(node, property))
    }
  }

  const settle = () => {
    if (settled) {
      return
    }
    settled = true
    if (frameHandle !== null) {
      cancelVenusAnimationFrame(frameHandle)
      frameHandle = null
    }
    resolveFinished()
  }

  const applyProgress = (progress: number) => {
    if (!node) {
      return
    }

    for (const property of properties) {
      const start = fromValues.get(property) ?? getVenusAnimationProperty(node, property)
      const end = toValues.get(property) ?? start
      setVenusAnimationProperty(node, property, interpolateScalar(start, end, progress))
    }
    onFrame()
  }

  const tick = (now: number) => {
    if (settled || paused) {
      return
    }

    if (startedAt === null) {
      startedAt = now
    }

    const progress = duration === 0 ? 1 : Math.max(0, Math.min(1, (now - startedAt) / duration))
    applyProgress(ease(progress))

    if (progress >= 1) {
      settle()
      return
    }

    frameHandle = requestVenusAnimationFrame(tick)
  }

  if (!node || properties.length === 0) {
    settle()
    return {
      finished,
      cancel: settle,
      pause: () => { paused = true },
      play: () => undefined,
    }
  }

  if (duration === 0) {
    applyProgress(1)
    settle()
  } else {
    frameHandle = requestVenusAnimationFrame(tick)
  }

  return {
    finished,
    cancel: settle,
    pause: () => {
      paused = true
      if (frameHandle !== null) {
        cancelVenusAnimationFrame(frameHandle)
        frameHandle = null
      }
    },
    play: () => {
      if (settled || !paused) {
        return
      }
      if (node) {
        for (const property of properties) {
          fromValues.set(property, getVenusAnimationProperty(node, property))
        }
      }
      paused = false
      startedAt = null
      frameHandle = requestVenusAnimationFrame(tick)
    },
  }
}
