import type { RuntimeModifiers, RuntimePoint } from '../types/index.ts'

export interface RuntimePointerInput {
  readonly type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerleave'
  readonly point: RuntimePoint
  readonly modifiers?: RuntimeModifiers
}

export interface RuntimeWheelInput {
  readonly type: 'wheel'
  readonly deltaX: number
  readonly deltaY: number
  readonly ctrlKey: boolean
  readonly point: RuntimePoint
}

export interface RuntimeKeyboardInput {
  readonly type: 'keydown' | 'keyup'
  readonly key: string
  readonly modifiers?: RuntimeModifiers
}

export type RuntimeInputEvent = RuntimePointerInput | RuntimeWheelInput | RuntimeKeyboardInput

export interface RuntimeInputSink {
  onInput(event: RuntimeInputEvent): void
}

export interface RuntimeRenderDiagnostics {
  drawCount: number
  drawMs: number
  fpsInstantaneous: number
  fpsEstimate: number
  visibleShapeCount: number
  cacheHitCount: number
  cacheMissCount: number
  frameReuseHitCount: number
  frameReuseMissCount: number
  cacheMode: 'none' | 'frame'
}

export interface RuntimeViewportSnapshot {
  scale: number
}

export interface RuntimeShellSnapshot {
  selectedCount: number
  layerCount: number
}

export const EMPTY_RUNTIME_RENDER_DIAGNOSTICS: RuntimeRenderDiagnostics = {
  drawCount: 0,
  drawMs: 0,
  fpsInstantaneous: 0,
  fpsEstimate: 0,
  visibleShapeCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  frameReuseHitCount: 0,
  frameReuseMissCount: 0,
  cacheMode: 'none',
}

const renderDiagnosticsListeners = new Set<VoidFunction>()
let currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
let previousDrawCount = 0
let previousDrawTimestamp = 0
let smoothedFpsEstimate = 0

export const EMPTY_RUNTIME_VIEWPORT_SNAPSHOT: RuntimeViewportSnapshot = {
  scale: 1,
}

export const EMPTY_RUNTIME_SHELL_SNAPSHOT: RuntimeShellSnapshot = {
  selectedCount: 0,
  layerCount: 0,
}

const viewportSnapshotListeners = new Set<VoidFunction>()
let currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
const shellSnapshotListeners = new Set<VoidFunction>()
let currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT

export function resetRuntimeEventSnapshots() {
  currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
  previousDrawCount = 0
  previousDrawTimestamp = 0
  smoothedFpsEstimate = 0
  currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
  currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT
  renderDiagnosticsListeners.forEach((listener) => listener())
  viewportSnapshotListeners.forEach((listener) => listener())
  shellSnapshotListeners.forEach((listener) => listener())
}

export function publishRuntimeRenderDiagnostics(next: RuntimeRenderDiagnostics) {
  const now = globalThis.performance?.now?.() ?? Date.now()
  const drawDelta = next.drawCount - previousDrawCount
  const timeDelta = now - previousDrawTimestamp
  let instantaneousFps = 0

  if (previousDrawTimestamp > 0 && drawDelta > 0 && timeDelta > 0) {
    instantaneousFps = (drawDelta * 1000) / timeDelta
    // Clamp to realistic display-driven bounds so tiny render times do not report impossible FPS spikes.
    const clampedInstantaneousFps = Math.min(Math.max(instantaneousFps, 0), 240)
    const smoothingFactor = 0.2
    smoothedFpsEstimate = smoothedFpsEstimate > 0
      ? smoothedFpsEstimate + (clampedInstantaneousFps - smoothedFpsEstimate) * smoothingFactor
      : clampedInstantaneousFps
  }

  previousDrawCount = next.drawCount
  previousDrawTimestamp = now

  currentRenderDiagnostics = {
    ...next,
    fpsInstantaneous: Math.min(Math.max(instantaneousFps, 0), 1000),
    fpsEstimate: smoothedFpsEstimate,
  }
  renderDiagnosticsListeners.forEach((listener) => listener())
}

export function getRuntimeRenderDiagnosticsSnapshot() {
  return currentRenderDiagnostics
}

export function subscribeRuntimeRenderDiagnostics(listener: VoidFunction) {
  renderDiagnosticsListeners.add(listener)
  return () => {
    renderDiagnosticsListeners.delete(listener)
  }
}

export function publishRuntimeViewportSnapshot(next: RuntimeViewportSnapshot) {
  currentViewportSnapshot = next
  viewportSnapshotListeners.forEach((listener) => listener())
}

export function getRuntimeViewportSnapshot() {
  return currentViewportSnapshot
}

export function subscribeRuntimeViewportSnapshot(listener: VoidFunction) {
  viewportSnapshotListeners.add(listener)
  return () => {
    viewportSnapshotListeners.delete(listener)
  }
}

export function publishRuntimeShellSnapshot(next: RuntimeShellSnapshot) {
  currentShellSnapshot = next
  shellSnapshotListeners.forEach((listener) => listener())
}

export function getRuntimeShellSnapshot() {
  return currentShellSnapshot
}

export function subscribeRuntimeShellSnapshot(listener: VoidFunction) {
  shellSnapshotListeners.add(listener)
  return () => {
    shellSnapshotListeners.delete(listener)
  }
}

/**
 * Shared TS-only input router used by UI bridges to forward raw input streams.
 */
export function createRuntimeInputRouter(sink: RuntimeInputSink) {
  return {
    dispatch(event: RuntimeInputEvent) {
      sink.onInput(event)
    },
  }
}

export interface RuntimeCanvasInputHandlers {
  onPointerMove(point: RuntimePoint): void
  onPointerDown(
    point: RuntimePoint,
    modifiers?: {
      shiftKey: boolean
      metaKey: boolean
      ctrlKey: boolean
      altKey: boolean
    },
  ): void
  onPointerUp(): void
  onPointerLeave(): void
}

/**
 * Creates a canvas-facing adapter that always routes input through
 * RuntimeInputEvent before invoking pointer lifecycle handlers.
 */
export function createRuntimeCanvasInputBridge(
  router: ReturnType<typeof createRuntimeInputRouter>,
  handlers: RuntimeCanvasInputHandlers,
): RuntimeCanvasInputHandlers {
  return {
    onPointerMove(point) {
      router.dispatch({
        type: 'pointermove',
        point,
      })
      handlers.onPointerMove(point)
    },
    onPointerDown(point, modifiers) {
      router.dispatch({
        type: 'pointerdown',
        point,
        modifiers,
      })
      handlers.onPointerDown(point, modifiers)
    },
    onPointerUp() {
      router.dispatch({
        type: 'pointerup',
        point: {x: 0, y: 0},
      })
      handlers.onPointerUp()
    },
    onPointerLeave() {
      router.dispatch({
        type: 'pointerleave',
        point: {x: 0, y: 0},
      })
      handlers.onPointerLeave()
    },
  }
}
