export type {
  AppMode,
  AppModeRuntime,
  InteractionRuntime,
  SelectionRuntime,
  SelectionRuntimeState,
} from './InteractionRuntime.ts'

export type {
  InteractionPipelineEventType,
  InteractionPipelineHandlers,
  InteractionPipelineInputEvent,
  InteractionPipelineState,
} from './InteractionPipeline.ts'
export {runInteractionPipeline} from './InteractionPipeline.ts'

export type {InteractionRuntimeState, OperationState} from './InteractionRuntimeState.ts'

export type {
  CaptureIntent,
  InteractionCommand,
  InteractionCommandType,
  InteractionResult,
  InteractionTrace,
  InteractionWarning,
  InteractionWarningCode,
  OverlayIntent,
} from './InteractionResult.ts'
// Re-export viewport intent here so runtime contract consumers can stay on one import surface.
export type {ViewportIntent} from '../viewport/ViewportIntent.ts'
export {
  createInteractionResult,
  createInteractionTrace,
} from './InteractionResult.ts'

export type {NormalizedInteractionEvent} from './NormalizedInteractionEvent.ts'
export {dispatchInteractionEvent} from './dispatchInteractionEvent.ts'
