import type {KeyboardRuntime} from '../keyboard/KeyboardRuntime.ts'
import type {ActiveOperation, OperationPhase} from '../operation/index.ts'
import type {PointerRuntime} from '../pointer/PointerRuntime.ts'
import type {GestureIntent} from '../gesture/index.ts'
import type {InteractionTargetCandidate} from '../target/index.ts'

/**
 * Defines normalized pipeline event kinds accepted by the orchestration helper.
 */
export type InteractionPipelineEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'keydown'
  | 'keyup'
  | 'wheel'

/**
 * Defines generic input event consumed by interaction pipeline orchestration.
 */
export interface InteractionPipelineInputEvent<TNativeEvent = unknown> {
  /** Stores normalized pipeline event type. */
  type: InteractionPipelineEventType
  /** Stores native platform event payload for adapters that need it. */
  nativeEvent?: TNativeEvent
  /** Stores event timestamp for gesture and double-click policies. */
  timeStamp?: number
}

/**
 * Defines reusable pipeline state snapshot carried across each stage.
 */
export interface InteractionPipelineState<
  TTool extends string = string,
  TTarget extends InteractionTargetCandidate = InteractionTargetCandidate,
  TPatch = unknown,
> {
  /** Stores pointer runtime after input normalization. */
  pointer: PointerRuntime
  /** Stores keyboard runtime after input normalization. */
  keyboard: KeyboardRuntime
  /** Stores resolved gesture intent for this event. */
  gesture: GestureIntent
  /** Stores resolved interaction target. */
  target: TTarget
  /** Stores effective tool identifier selected for routing. */
  effectiveTool: TTool
  /** Stores active operation after lifecycle update. */
  activeOperation: ActiveOperation | null
  /** Stores operation phase after lifecycle update. */
  operationPhase: OperationPhase
  /** Stores runtime patch output produced by the current event. */
  patch?: TPatch
}

/**
 * Defines stage callbacks that compose the interaction pipeline.
 */
export interface InteractionPipelineHandlers<
  TTool extends string = string,
  TTarget extends InteractionTargetCandidate = InteractionTargetCandidate,
  TPatch = unknown,
  TNativeEvent = unknown,
> {
  /** Normalizes raw input into next pointer runtime. */
  resolvePointer: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => PointerRuntime
  /** Normalizes raw input into next keyboard runtime. */
  resolveKeyboard: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => KeyboardRuntime
  /** Resolves gesture intent from updated input runtimes. */
  resolveGesture: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    nextPointer: PointerRuntime,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => GestureIntent
  /** Resolves final interaction target using hit-test/capture inputs. */
  resolveTarget: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    nextPointer: PointerRuntime,
    gesture: GestureIntent,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => TTarget
  /** Resolves effective tool after modifiers/temporary routing. */
  resolveEffectiveTool: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => TTool
  /** Updates active operation and returns next operation snapshot/phase. */
  resolveOperation: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    input: {
      pointer: PointerRuntime
      keyboard: KeyboardRuntime
      gesture: GestureIntent
      target: TTarget
      effectiveTool: TTool
    },
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => {
    activeOperation: ActiveOperation | null
    operationPhase: OperationPhase
  }
  /** Converts routed interaction to an optional runtime patch payload. */
  resolvePatch: (
    event: InteractionPipelineInputEvent<TNativeEvent>,
    next: Omit<InteractionPipelineState<TTool, TTarget, TPatch>, 'patch'>,
    previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  ) => TPatch | undefined
}

/**
 * Runs one interaction pipeline step in the canonical stage order.
 */
export function runInteractionPipeline<
  TTool extends string,
  TTarget extends InteractionTargetCandidate,
  TPatch,
  TNativeEvent,
>(
  event: InteractionPipelineInputEvent<TNativeEvent>,
  previous: InteractionPipelineState<TTool, TTarget, TPatch>,
  handlers: InteractionPipelineHandlers<TTool, TTarget, TPatch, TNativeEvent>,
): InteractionPipelineState<TTool, TTarget, TPatch> {
  const pointer = handlers.resolvePointer(event, previous)
  const keyboard = handlers.resolveKeyboard(event, previous)
  const gesture = handlers.resolveGesture(event, pointer, previous)
  const target = handlers.resolveTarget(event, pointer, gesture, previous)
  const effectiveTool = handlers.resolveEffectiveTool(event, previous)
  const operation = handlers.resolveOperation(
    event,
    {
      pointer,
      keyboard,
      gesture,
      target,
      effectiveTool,
    },
    previous,
  )

  const baseNextState: Omit<InteractionPipelineState<TTool, TTarget, TPatch>, 'patch'> = {
    pointer,
    keyboard,
    gesture,
    target,
    effectiveTool,
    activeOperation: operation.activeOperation,
    operationPhase: operation.operationPhase,
  }

  return {
    ...baseNextState,
    patch: handlers.resolvePatch(event, baseNextState, previous),
  }
}

