import {shouldHandleEditorShortcut} from '../shortcut/shortcutGuard.ts'
import {resolveInteractionPolicy, type InteractionPolicy} from '../policy/InteractionPolicy.ts'
import {applyKeyboardKeyDown, applyKeyboardKeyUp} from '../keyboard/keyUtils.ts'
import {applyPointerDown, applyPointerMove, applyPointerUp} from '../pointer/pointerEvents.ts'
import {resolveGestureIntent} from '../gesture/GestureIntent.ts'
import {resolveGesturePolicy} from '../gesture/GesturePolicy.ts'
import {transitionOperationPhase, type OperationPhase} from '../operation/OperationPhase.ts'
import type {GestureRuntime} from '../operation/GestureRuntime.ts'
import type {InteractionRuntimeState} from './InteractionRuntimeState.ts'
import type {NormalizedInteractionEvent} from './NormalizedInteractionEvent.ts'
import {
  createInteractionResult,
  createInteractionTrace,
  type InteractionCommand,
  type InteractionResult,
  type InteractionWarning,
} from './InteractionResult.ts'

/**
 * Dispatches one normalized interaction event and returns side-effect-free result intents.
 */
export function dispatchInteractionEvent<TPatch = unknown>(
  state: InteractionRuntimeState,
  event: NormalizedInteractionEvent<TPatch>,
  policyOverrides?: Partial<InteractionPolicy>,
): InteractionResult<TPatch> {
  const policy = resolveInteractionPolicy(policyOverrides)

  if (isPointerEvent(event)) {
    return dispatchPointerEvent(state, event, policy)
  }

  if (event.type === 'key-down' || event.type === 'key-up') {
    return dispatchKeyboardEvent(state, event, policy)
  }

  if (event.type === 'wheel') {
    return dispatchWheelEvent(state, event)
  }

  // Route lifecycle interrupts through cancel path so adapters get one consistent rollback signal.
  const result = createInteractionResult<TPatch>()
  result.command = {type: 'cancel'}
  result.nextState = {
    operation: {
      phase: 'cancelled',
      active: null,
    },
    capture: {
      ...state.capture,
      pointerCaptured: false,
      pointerId: undefined,
    },
  }
  result.trace = createInteractionTrace({
    eventId: event.eventId,
    inputType: event.type,
    tool: state.tool.effectiveTool,
    operationPhase: 'cancelled',
    command: result.command,
    timestamp: event.timestamp,
  })
  return result
}

/**
 * Narrows normalized interaction events to pointer-like branches.
 */
function isPointerEvent<TPatch>(
  event: NormalizedInteractionEvent<TPatch>,
): event is Extract<
  NormalizedInteractionEvent<TPatch>,
  {type: 'pointer-down' | 'pointer-move' | 'pointer-up' | 'pointer-cancel' | 'context-menu'}
> {
  return event.type === 'pointer-down'
    || event.type === 'pointer-move'
    || event.type === 'pointer-up'
    || event.type === 'pointer-cancel'
    || event.type === 'context-menu'
}

/**
 * Dispatches one pointer event and emits next runtime state + command intent.
 */
function dispatchPointerEvent<TPatch>(
  state: InteractionRuntimeState,
  event: Extract<
    NormalizedInteractionEvent<TPatch>,
    {type: 'pointer-down' | 'pointer-move' | 'pointer-up' | 'pointer-cancel' | 'context-menu'}
  >,
  policy: InteractionPolicy,
): InteractionResult<TPatch> {
  if (event.type === 'context-menu') {
    // Keep context menu handling non-destructive so app policy can decide selection/cancel behavior.
    return {
      stopPropagation: true,
      trace: createInteractionTrace({
        eventId: event.eventId,
        inputType: event.type,
        targetStack: event.targetStack,
        tool: state.tool.effectiveTool,
        operationPhase: state.operation.phase,
        timestamp: event.event.timestamp,
      }),
    }
  }

  if (!event.event.isPrimary) {
    const warning: InteractionWarning = {
      code: 'ignored-non-primary-pointer',
      message: 'runtime ignores non-primary pointer events in MVP mode',
      eventType: event.type,
    }
    return {
      warnings: [warning],
      trace: createInteractionTrace({
        eventId: event.eventId,
        inputType: event.type,
        targetStack: event.targetStack,
        tool: state.tool.effectiveTool,
        operationPhase: state.operation.phase,
        timestamp: event.event.timestamp,
      }),
    }
  }

  const gesturePolicy = resolveGesturePolicy({
    dragThreshold: policy.dragThreshold,
    clickTolerance: policy.clickTolerance,
    doubleClickIntervalMs: policy.doubleClickIntervalMs,
  })

  const previousPointer = state.pointer
  let nextPointer = previousPointer

  // Apply phase-specific pointer reducer using normalized coordinates from adapters.
  if (event.type === 'pointer-down') {
    nextPointer = applyPointerDown(
      state.pointer,
      {
        pointerId: event.event.pointerId,
        buttons: event.event.buttons,
        button: event.event.button,
        timeStamp: event.event.timestamp,
      },
      event.event.screen,
      event.event.world,
    )
  }

  if (event.type === 'pointer-move') {
    nextPointer = applyPointerMove(
      state.pointer,
      {
        pointerId: event.event.pointerId,
        buttons: event.event.buttons,
        button: event.event.button,
        timeStamp: event.event.timestamp,
      },
      event.event.screen,
      event.event.world,
      {
        dragThresholdPx: policy.dragThreshold,
      },
    )
  }

  if (event.type === 'pointer-up') {
    nextPointer = applyPointerUp(
      state.pointer,
      {
        pointerId: event.event.pointerId,
        buttons: event.event.buttons,
        button: event.event.button,
        timeStamp: event.event.timestamp,
      },
      event.event.screen,
      event.event.world,
    )
  }

  if (event.type === 'pointer-cancel') {
    const cancelResult = createInteractionResult<TPatch>()
    cancelResult.command = {type: 'cancel'}
    cancelResult.nextState = {
      pointer: {
        ...state.pointer,
        isDown: false,
        isDragging: false,
      },
      operation: {
        phase: 'cancelled',
        active: null,
      },
      capture: {
        ...state.capture,
        pointerCaptured: false,
        pointerId: undefined,
      },
    }
    cancelResult.trace = createInteractionTrace({
      eventId: event.eventId,
      inputType: event.type,
      targetStack: event.targetStack,
      tool: state.tool.effectiveTool,
      operationPhase: 'cancelled',
      command: cancelResult.command,
      timestamp: event.event.timestamp,
    })
    return cancelResult
  }

  const gestureIntent = resolveGestureIntent({
    previous: previousPointer,
    next: nextPointer,
    eventType: toPointerLifecycleEvent(event.type),
    policy: gesturePolicy,
    timeStamp: event.event.timestamp,
  })
  const nextGesture = resolveNextGestureRuntime(state.gesture, gestureIntent, event.event.timestamp)
  const nextPhase = transitionOperationPhase(state.operation.phase, event.type, nextPointer.isDragging)
  const command = resolveCommandIntent(nextPhase, event.patch)

  const nextState: Partial<InteractionRuntimeState> = {
    pointer: nextPointer,
    gesture: nextGesture,
    operation: {
      phase: nextPhase,
      // Keep active payload untouched here; app-level operation routers own payload mutation.
      active: nextPhase === 'completed' || nextPhase === 'cancelled' ? null : state.operation.active,
    },
  }

  // Auto-release capture on pointerup when policy/runtime requests release-on-up behavior.
  if (event.type === 'pointer-up' && state.capture.releaseOnPointerUp) {
    nextState.capture = {
      ...state.capture,
      pointerCaptured: false,
      pointerId: undefined,
    }
  }

  return {
    nextState,
    command,
    preventDefault: nextPhase === 'active',
    trace: createInteractionTrace({
      eventId: event.eventId,
      inputType: event.type,
      targetStack: event.targetStack,
      tool: state.tool.effectiveTool,
      operationPhase: nextPhase,
      command,
      timestamp: event.event.timestamp,
    }),
  }
}

/**
 * Dispatches one keyboard event with IME/text-editing shortcut guards.
 */
function dispatchKeyboardEvent<TPatch>(
  state: InteractionRuntimeState,
  event: Extract<NormalizedInteractionEvent<TPatch>, {type: 'key-down' | 'key-up'}>,
  policy: InteractionPolicy,
): InteractionResult<TPatch> {
  const canHandleShortcut = shouldHandleEditorShortcut({
    isTextEditing: false,
    isComposing: event.event.isComposing,
    targetTagName: event.event.targetTagName,
    isContentEditable: event.event.isContentEditable,
  })

  if (!canHandleShortcut) {
    const warning: InteractionWarning = {
      code: 'shortcut-blocked-by-ime',
      message: 'keyboard shortcut handling is blocked by composing/editable context',
      eventType: event.type,
    }
    return {
      nextState: {
        keyboard: state.keyboard,
      },
      warnings: [warning],
      trace: createInteractionTrace({
        eventId: event.eventId,
        inputType: `${event.type}:guarded`,
        tool: state.tool.effectiveTool,
        operationPhase: state.operation.phase,
        timestamp: event.event.timestamp,
      }),
    }
  }

  const keyboardEventLike = {
    key: event.event.key,
    altKey: event.event.modifiers.alt,
    ctrlKey: event.event.modifiers.ctrl,
    metaKey: event.event.modifiers.meta,
    shiftKey: event.event.modifiers.shift,
  }

  const nextKeyboard = event.type === 'key-down'
    ? applyKeyboardKeyDown(state.keyboard, keyboardEventLike)
    : applyKeyboardKeyUp(state.keyboard, keyboardEventLike)

  const nextState: Partial<InteractionRuntimeState> = {
    keyboard: nextKeyboard,
  }

  // Reserve temporary pan key policy route while keeping tool semantics app-defined.
  if (event.type === 'key-down' && nextKeyboard.pressedKeys.has(policy.temporaryPanKey)) {
    nextState.cursor = {type: 'grab'}
  }

  return {
    nextState,
    trace: createInteractionTrace({
      eventId: event.eventId,
      inputType: event.type,
      tool: state.tool.effectiveTool,
      operationPhase: state.operation.phase,
      timestamp: event.event.timestamp,
    }),
  }
}

/**
 * Dispatches wheel events into viewport intent outputs without mutating viewport state directly.
 */
function dispatchWheelEvent<TPatch>(
  state: InteractionRuntimeState,
  event: Extract<NormalizedInteractionEvent<TPatch>, {type: 'wheel'}>,
): InteractionResult<TPatch> {
  const viewport = resolveWheelViewportIntent(event.event)

  return {
    viewport,
    preventDefault: viewport.type !== 'none',
    trace: createInteractionTrace({
      eventId: event.eventId,
      inputType: event.type,
      tool: state.tool.effectiveTool,
      operationPhase: state.operation.phase,
      timestamp: event.event.timestamp,
    }),
  }
}

/**
 * Maps wheel input + modifiers to viewport intent policy.
 */
function resolveWheelViewportIntent(
  wheel: Extract<NormalizedInteractionEvent, {type: 'wheel'}>['event'],
): NonNullable<InteractionResult['viewport']> {
  // Prefer zoom-at when Ctrl/Cmd is held, matching common trackpad pinch behavior.
  if (wheel.modifiers.ctrl || wheel.modifiers.meta) {
    return {
      type: 'zoom-at',
      scaleDelta: -wheel.deltaY * 0.001,
      anchor: wheel.world,
    }
  }

  // Treat Shift+wheel as horizontal pan while preserving native deltaX contributions.
  if (wheel.modifiers.shift) {
    return {
      type: 'pan-by',
      dx: wheel.deltaX + wheel.deltaY,
      dy: 0,
    }
  }

  return {
    type: 'pan-by',
    dx: wheel.deltaX,
    dy: wheel.deltaY,
  }
}

/**
 * Maps pointer event type to gesture resolver lifecycle event names.
 */
function toPointerLifecycleEvent(
  type: Extract<
    NormalizedInteractionEvent,
    {type: 'pointer-down' | 'pointer-move' | 'pointer-up'}
  >['type'],
): 'pointerdown' | 'pointermove' | 'pointerup' {
  if (type === 'pointer-down') {
    return 'pointerdown'
  }

  if (type === 'pointer-move') {
    return 'pointermove'
  }

  return 'pointerup'
}

/**
 * Resolves command intent from operation phase and optional patch payload.
 */
function resolveCommandIntent<TPatch>(
  phase: OperationPhase,
  patch?: TPatch,
): InteractionCommand<TPatch> | undefined {
  if (phase === 'active') {
    return {
      type: 'preview',
      patch,
    }
  }

  if (phase === 'completed') {
    return {
      type: 'commit',
      patch,
    }
  }

  return undefined
}

/**
 * Resolves next gesture runtime snapshot from gesture intent output.
 */
function resolveNextGestureRuntime(
  current: GestureRuntime,
  gesture: {type: string},
  timestamp: number,
): GestureRuntime {
  if (gesture.type === 'drag-start' || gesture.type === 'drag-move') {
    return {
      ...current,
      type: 'drag',
      active: true,
      startedAt: current.startedAt ?? timestamp,
      updatedAt: timestamp,
    }
  }

  if (gesture.type === 'drag-end') {
    return {
      ...current,
      type: 'none',
      active: false,
      updatedAt: timestamp,
    }
  }

  return {
    ...current,
    updatedAt: timestamp,
  }
}
