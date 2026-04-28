import type {CaptureRuntime} from '../capture/CaptureRuntime.ts'
import type {CursorRuntime} from '../cursor/CursorManager.ts'
import type {HoverRuntime} from '../hover/HoverRuntime.ts'
import type {KeyboardRuntime} from '../keyboard/KeyboardRuntime.ts'
import type {ActiveOperation} from '../operation/ActiveOperation.ts'
import type {OverlayRuntime} from '../overlay/OverlayLayer.ts'
import type {PointerRuntime} from '../pointer/PointerRuntime.ts'
import type {ToolRuntime} from '../tool/ToolRuntime.ts'
import type {ViewportInteractionRuntime} from '../viewport/ViewportInteractionRuntime.ts'

/**
 * Defines app mode names that can alter interaction behavior globally.
 */
export type AppMode =
  | 'normal'
  | 'readonly'
  | 'disabled'
  | 'loading'
  | 'modal'

/**
 * Stores app mode runtime state.
 */
export interface AppModeRuntime {
  /** Stores current app mode. */
  mode: AppMode
  /** Stores optional reason for diagnostics and UX hints. */
  reason?: string
}

/**
 * Defines generic selection runtime shape with no product policy semantics.
 */
export interface SelectionRuntime<TId extends string = string> {
  /** Stores selected ids in stable order. */
  ids: TId[]
  /** Stores primary selected id when available. */
  primaryId?: TId
  /** Stores selection anchor id for range operations when available. */
  anchorId?: TId
  /** Stores selection version incremented on each mutation. */
  version: number
}

/**
 * Defines combined interaction runtime contract shared by editor products.
 */
export interface InteractionRuntime<
  TTool extends string = string,
  TOverlayNode = unknown,
  TOverlayHit = unknown,
  TSceneHit = unknown,
  TCursorIntent = unknown,
  TOperation extends ActiveOperation = ActiveOperation,
> {
  /** Stores app mode state that can gate interactive actions. */
  appMode: AppModeRuntime
  /** Stores pointer state. */
  pointer: PointerRuntime
  /** Stores keyboard state. */
  keyboard: KeyboardRuntime
  /** Stores tool state. */
  tool: ToolRuntime<TTool>
  /** Stores viewport interaction state. */
  viewport: ViewportInteractionRuntime
  /** Stores hover state across overlay and scene channels. */
  hover: HoverRuntime<TOverlayHit, TSceneHit>
  /** Stores overlay state and node payload. */
  overlay: OverlayRuntime<TOverlayNode, TOverlayHit>
  /** Stores resolved cursor state. */
  cursor: CursorRuntime<TCursorIntent>
  /** Stores current active operation when one is running. */
  activeOperation?: TOperation
  /** Stores pointer capture ownership state. */
  capture: CaptureRuntime
}

