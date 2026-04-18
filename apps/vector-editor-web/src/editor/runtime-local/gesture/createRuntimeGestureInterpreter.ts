import type {Point2D} from '../viewport/matrix.ts'

export interface RuntimeGesturePointerInput {
  clientX: number
  clientY: number
  pointerId: number
  button?: number
}

export interface RuntimeGestureWheelInput {
  deltaX: number
  deltaY: number
  ctrlKey?: boolean
  metaKey?: boolean
  anchor?: Point2D
}

export interface RuntimeGestureInterpreterOptions {
  wheelPanMultiplier?: number
  wheelZoomSensitivity?: number
  minScale?: number
  maxScale?: number
  getScale?: () => number
  applyPan: (deltaX: number, deltaY: number) => void
  applyScroll: (deltaX: number, deltaY: number) => void
  applyZoom: (nextScale: number, anchorInScreen?: Point2D) => void
}

export interface RuntimeGestureInterpreter {
  pointerDown: (event: RuntimeGesturePointerInput) => void
  pointerMove: (event: RuntimeGesturePointerInput) => void
  pointerUp: (event: RuntimeGesturePointerInput) => void
  wheel: (event: RuntimeGestureWheelInput) => void
  reset: () => void
}

const DEFAULT_SCALE = 1

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function createRuntimeGestureInterpreter(
  options: RuntimeGestureInterpreterOptions,
): RuntimeGestureInterpreter {
  const wheelPanMultiplier = options.wheelPanMultiplier ?? 1
  const wheelZoomSensitivity = options.wheelZoomSensitivity ?? 0.0015
  const minScale = options.minScale ?? 0.05
  const maxScale = options.maxScale ?? 64

  let panSession: {pointerId: number; x: number; y: number} | null = null

  return {
    pointerDown: (event) => {
      if (event.button !== 1) {
        return
      }

      panSession = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    pointerMove: (event) => {
      if (!panSession || panSession.pointerId !== event.pointerId) {
        return
      }

      const deltaX = event.clientX - panSession.x
      const deltaY = event.clientY - panSession.y
      if (deltaX !== 0 || deltaY !== 0) {
        options.applyPan(deltaX, deltaY)
      }

      panSession = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    pointerUp: (event) => {
      if (panSession?.pointerId === event.pointerId) {
        panSession = null
      }
    },
    wheel: (event) => {
      const zooming = !!event.ctrlKey || !!event.metaKey
      if (!zooming) {
        // Wheel events represent scroll intent; viewport translation uses the inverse sign.
        options.applyScroll(
          -event.deltaX * wheelPanMultiplier,
          -event.deltaY * wheelPanMultiplier,
        )
        return
      }

      const currentScale = options.getScale?.() ?? DEFAULT_SCALE
      const nextScale = clamp(
        currentScale * Math.exp(-event.deltaY * wheelZoomSensitivity),
        minScale,
        maxScale,
      )
      if (nextScale !== currentScale) {
        options.applyZoom(nextScale, event.anchor)
      }
    },
    reset: () => {
      panSession = null
    },
  }
}