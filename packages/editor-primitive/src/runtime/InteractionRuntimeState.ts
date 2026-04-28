import type {CaptureRuntime} from '../capture/CaptureRuntime.ts'
import type {CursorIntent} from '../cursor/CursorIntent.ts'
import type {HoverRuntime} from '../hover/HoverRuntime.ts'
import type {KeyboardRuntime} from '../keyboard/KeyboardRuntime.ts'
import type {ActiveOperation, GestureRuntime, OperationPhase} from '../operation/index.ts'
import type {PointerRuntime} from '../pointer/PointerRuntime.ts'
import type {SelectionState} from '../selection/SelectionState.ts'
import type {ToolRuntime} from '../tool/ToolRuntime.ts'
import type {ViewportInteractionRuntime} from '../viewport/ViewportInteractionRuntime.ts'

/**
 * Defines operation runtime state normalized for interaction reducers.
 */
export interface OperationState {
  /** Stores current operation lifecycle phase. */
  phase: OperationPhase
  /** Stores active operation payload while one operation is running. */
  active: ActiveOperation | null
}

/**
 * Defines unified interaction runtime state consumed by pure interaction reducers.
 */
export interface InteractionRuntimeState {
  /** Stores normalized pointer runtime state. */
  pointer: PointerRuntime
  /** Stores normalized keyboard runtime state. */
  keyboard: KeyboardRuntime
  /** Stores high-level gesture runtime state. */
  gesture: GestureRuntime
  /** Stores pointer capture ownership state. */
  capture: CaptureRuntime
  /** Stores hover runtime state. */
  hover: HoverRuntime
  /** Stores currently resolved cursor intent. */
  cursor: CursorIntent
  /** Stores current tool runtime state. */
  tool: ToolRuntime
  /** Stores current operation runtime state. */
  operation: OperationState
  /** Stores optional id-only selection state. */
  selection?: SelectionState
  /** Stores optional viewport interaction runtime. */
  viewport?: ViewportInteractionRuntime
}

