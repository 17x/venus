import type { RuntimeModifiers, RuntimePoint } from '../../../types/index.ts'
import type {
  NormalizedInteractionEvent,
} from '@venus/editor-primitive'
import {createEmptyModifierState} from '@venus/editor-primitive'

import type {
  RuntimeInputEvent,
  RuntimeInputSink,
  RuntimeMigrationSnapshot,
  RuntimeNormalizedInteractionSnapshot,
  RuntimeRenderDiagnostics,
  RuntimeShellSnapshot,
  RuntimeViewportSnapshot,
} from './index.runtimeEvents.types.ts'
import {
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  EMPTY_RUNTIME_SHELL_SNAPSHOT,
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
} from './index.runtimeEvents.defaults.ts'
import {resolveRuntimeRenderDiagnosticsStats} from './index.runtimeEvents.stats.ts'

export type * from './index.runtimeEvents.types.ts'
export {
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  EMPTY_RUNTIME_SHELL_SNAPSHOT,
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
} from './index.runtimeEvents.defaults.ts'

const renderDiagnosticsListeners = new Set<VoidFunction>()
let currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
let previousFrameCount = 0
let previousDrawTimestamp = 0
let smoothedFpsEstimate = 0
let peakInstantaneousFps = 0
let peakSmoothedFpsEstimate = 0

const viewportSnapshotListeners = new Set<VoidFunction>()
let currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
const shellSnapshotListeners = new Set<VoidFunction>()
let currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT
const migrationSnapshotListeners = new Set<VoidFunction>()
let currentRuntimeMigrationSnapshot = EMPTY_RUNTIME_MIGRATION_SNAPSHOT
const normalizedInteractionSnapshotListeners = new Set<VoidFunction>()
let currentNormalizedInteractionSnapshot: RuntimeNormalizedInteractionSnapshot | null = null
let runtimeInputEventSequence = 0

/**
 * Resolves monotonically increasing runtime input event id for normalized event tracing.
 */
function createRuntimeInputEventId(): string {
  runtimeInputEventSequence += 1
  return `runtime-input-${runtimeInputEventSequence}`
}

/**
 * Resolves normalized modifier state from runtime modifier payload.
 */
function resolveNormalizedModifierState(modifiers?: RuntimeModifiers) {
  return {
    ...createEmptyModifierState(),
    alt: !!modifiers?.altKey,
    ctrl: !!modifiers?.ctrlKey,
    meta: !!modifiers?.metaKey,
    shift: !!modifiers?.shiftKey,
  }
}

/**
 * Normalizes runtime input events into primitive normalized interaction event branches.
 */
function normalizeRuntimeInputEvent(
  event: RuntimeInputEvent,
  eventId: string,
): NormalizedInteractionEvent | null {
  if (event.type === 'pointerdown' || event.type === 'pointermove' || event.type === 'pointerup' || event.type === 'pointerleave') {
    const timestamp = event.timestamp ?? Date.now()
    const normalizedPointerEvent = {
      pointerId: event.pointerId ?? 1,
      pointerType: event.pointerType ?? 'mouse',
      button: event.button ?? 0,
      buttons: event.buttons ?? (event.type === 'pointerdown' ? 1 : 0),
      client: event.point,
      canvas: event.point,
      screen: event.point,
      world: event.point,
      modifiers: resolveNormalizedModifierState(event.modifiers),
      timestamp,
      isPrimary: event.isPrimary ?? true,
      pressure: event.pressure,
      isComposing: false,
    }

    if (event.type === 'pointerleave') {
      return {
        type: 'pointer-cancel',
        eventId,
        event: normalizedPointerEvent,
      }
    }

    const pointerEventType = event.type === 'pointerdown'
      ? 'pointer-down'
      : event.type === 'pointermove'
        ? 'pointer-move'
        : 'pointer-up'

    return {
      type: pointerEventType,
      eventId,
      event: normalizedPointerEvent,
    }
  }

  if (event.type === 'wheel') {
    return {
      type: 'wheel',
      eventId,
      event: {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode ?? 'pixel',
        client: event.point,
        canvas: event.point,
        screen: event.point,
        world: event.point,
        modifiers: {
          ...resolveNormalizedModifierState(event.modifiers),
          ctrl: event.ctrlKey || !!event.modifiers?.ctrlKey,
        },
        timestamp: event.timestamp ?? Date.now(),
      },
    }
  }

  if (event.type === 'keydown' || event.type === 'keyup') {
    return {
      type: event.type === 'keydown' ? 'key-down' : 'key-up',
      eventId,
      event: {
        key: event.key,
        code: event.code ?? event.key,
        modifiers: resolveNormalizedModifierState(event.modifiers),
        repeat: !!event.repeat,
        timestamp: event.timestamp ?? Date.now(),
        isComposing: !!event.isComposing,
        targetTagName: event.targetTagName,
        isContentEditable: event.isContentEditable,
      },
    }
  }

  return null
}

/**
 * Resets all shared runtime event snapshots to their empty defaults.
 */
export function resetRuntimeEventSnapshots() {
  currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
  previousFrameCount = 0
  previousDrawTimestamp = 0
  smoothedFpsEstimate = 0
  peakInstantaneousFps = 0
  peakSmoothedFpsEstimate = 0
  currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
  currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT
  currentRuntimeMigrationSnapshot = EMPTY_RUNTIME_MIGRATION_SNAPSHOT
  currentNormalizedInteractionSnapshot = null
  runtimeInputEventSequence = 0
  renderDiagnosticsListeners.forEach((listener) => listener())
  viewportSnapshotListeners.forEach((listener) => listener())
  shellSnapshotListeners.forEach((listener) => listener())
  migrationSnapshotListeners.forEach((listener) => listener())
  normalizedInteractionSnapshotListeners.forEach((listener) => listener())
}

/**
 * Publishes runtime render diagnostics for subscribers that track performance and state.
 */
export function publishRuntimeRenderDiagnostics(next: RuntimeRenderDiagnostics) {
  const now = globalThis.performance?.now?.() ?? Date.now()
  const frameDelta = next.frameCount - previousFrameCount
  const timeDelta = now - previousDrawTimestamp
  let instantaneousFps = 0

  if (previousDrawTimestamp > 0 && frameDelta > 0 && timeDelta > 0) {
    instantaneousFps = (frameDelta * 1000) / timeDelta
    // Clamp to realistic display-driven bounds so tiny render times do not report impossible FPS spikes.
    const clampedInstantaneousFps = Math.min(Math.max(instantaneousFps, 0), 240)
    const smoothingFactor = 0.2
    smoothedFpsEstimate = smoothedFpsEstimate > 0
      ? smoothedFpsEstimate + (clampedInstantaneousFps - smoothedFpsEstimate) * smoothingFactor
      : clampedInstantaneousFps
  }

  previousFrameCount = next.frameCount
  previousDrawTimestamp = now

  peakInstantaneousFps = Math.max(peakInstantaneousFps, Math.min(Math.max(instantaneousFps, 0), 1000))
  peakSmoothedFpsEstimate = Math.max(peakSmoothedFpsEstimate, smoothedFpsEstimate)

  const baseDiagnostics: RuntimeRenderDiagnostics = {
    ...next,
    fpsInstantaneous: Math.min(Math.max(instantaneousFps, 0), 1000),
    fpsEstimate: smoothedFpsEstimate,
    fpsPeak: peakInstantaneousFps,
    fpsEstimatePeak: peakSmoothedFpsEstimate,
    fpsReached60: peakInstantaneousFps >= 60,
    fpsReached120: peakInstantaneousFps >= 120,
  }
  // Keep a sectioned mirror so engine and UI debug surfaces can consume
  // hierarchical groups (for example: stats.performance.lod).
  currentRenderDiagnostics = {
    ...baseDiagnostics,
    stats: baseDiagnostics.stats ?? resolveRuntimeRenderDiagnosticsStats(baseDiagnostics),
  }
  renderDiagnosticsListeners.forEach((listener) => listener())
}

export function getRuntimeRenderDiagnosticsSnapshot() {
  return currentRenderDiagnostics
}

/**
 * Subscribes to runtime render diagnostics updates.
 */
export function subscribeRuntimeRenderDiagnostics(listener: VoidFunction) {
  renderDiagnosticsListeners.add(listener)
  return () => {
    renderDiagnosticsListeners.delete(listener)
  }
}

/**
 * Publishes viewport snapshot updates for viewport-only subscribers.
 */
export function publishRuntimeViewportSnapshot(next: RuntimeViewportSnapshot) {
  currentViewportSnapshot = next
  viewportSnapshotListeners.forEach((listener) => listener())
}

/**
 * Returns the current runtime viewport snapshot.
 */
export function getRuntimeViewportSnapshot() {
  return currentViewportSnapshot
}

/**
 * Subscribes to runtime viewport snapshot updates.
 */
export function subscribeRuntimeViewportSnapshot(listener: VoidFunction) {
  viewportSnapshotListeners.add(listener)
  return () => {
    viewportSnapshotListeners.delete(listener)
  }
}

/**
 * Publishes shell snapshot updates for lightweight editor chrome subscribers.
 */
export function publishRuntimeShellSnapshot(next: RuntimeShellSnapshot) {
  currentShellSnapshot = next
  shellSnapshotListeners.forEach((listener) => listener())
}

/**
 * Returns the current runtime shell snapshot.
 */
export function getRuntimeShellSnapshot() {
  return currentShellSnapshot
}

/**
 * Subscribes to runtime shell snapshot updates.
 */
export function subscribeRuntimeShellSnapshot(listener: VoidFunction) {
  shellSnapshotListeners.add(listener)
  return () => {
    shellSnapshotListeners.delete(listener)
  }
}

/**
 * Publishes runtime migration diagnostics for subscribers that track runtime-v2 rollout health.
 */
export function publishRuntimeMigrationSnapshot(next: RuntimeMigrationSnapshot) {
  currentRuntimeMigrationSnapshot = next
  migrationSnapshotListeners.forEach((listener) => listener())
}

/**
 * Returns the most recently published runtime migration diagnostics snapshot.
 */
export function getRuntimeMigrationSnapshot() {
  return currentRuntimeMigrationSnapshot
}

/**
 * Subscribes to runtime migration diagnostics snapshot updates.
 */
export function subscribeRuntimeMigrationSnapshot(listener: VoidFunction) {
  migrationSnapshotListeners.add(listener)
  return () => {
    migrationSnapshotListeners.delete(listener)
  }
}

/**
 * Publishes latest runtime input -> primitive normalized interaction snapshot.
 */
export function publishRuntimeNormalizedInteractionSnapshot(next: RuntimeNormalizedInteractionSnapshot) {
  currentNormalizedInteractionSnapshot = next
  normalizedInteractionSnapshotListeners.forEach((listener) => listener())
}

/**
 * Returns latest runtime input -> primitive normalized interaction snapshot.
 */
export function getRuntimeNormalizedInteractionSnapshot() {
  return currentNormalizedInteractionSnapshot
}

/**
 * Subscribes to runtime input normalization snapshots.
 */
export function subscribeRuntimeNormalizedInteractionSnapshot(listener: VoidFunction) {
  normalizedInteractionSnapshotListeners.add(listener)
  return () => {
    normalizedInteractionSnapshotListeners.delete(listener)
  }
}

/**
 * Shared TS-only input router used by UI bridges to forward raw input streams.
 */
export function createRuntimeInputRouter(sink: RuntimeInputSink) {
  return {
    dispatch(event: RuntimeInputEvent) {
      // Always normalize runtime input into primitive event union for shared downstream consumers.
      const normalizedEvent = normalizeRuntimeInputEvent(event, createRuntimeInputEventId())
      if (normalizedEvent) {
        publishRuntimeNormalizedInteractionSnapshot({
          runtimeEvent: event,
          normalizedEvent,
        })
      }
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
