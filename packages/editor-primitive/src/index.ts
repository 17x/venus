import type { Point2D } from '@venus/lib'

/**
 * Describes active keyboard modifiers consumed by interaction policy.
 */
export interface ModifierKeys {
  /** Indicates whether the Space key is currently pressed. */
  readonly space: boolean
  /** Indicates whether the Alt key is currently pressed. */
  readonly alt: boolean
  /** Indicates whether the Shift key is currently pressed. */
  readonly shift: boolean
  /** Indicates whether the Control key is currently pressed. */
  readonly ctrl: boolean
  /** Indicates whether the Meta key is currently pressed. */
  readonly meta: boolean
}

/**
 * Captures pointer runtime state shared by interaction handlers.
 */
export interface PointerRuntime {
  /** Stores the latest pointer position in screen space. */
  readonly screen: Point2D
  /** Stores the previous pointer position in screen space. */
  readonly previousScreen: Point2D
  /** Stores the pointer movement delta in screen space. */
  readonly deltaScreen: Point2D
  /** Indicates whether the primary pointer is currently pressed. */
  readonly isDown: boolean
  /** Indicates whether drag state has crossed the movement threshold. */
  readonly isDragging: boolean
}

/**
 * Describes the active and temporary tool state for editor interactions.
 */
export interface ToolRuntime<TTool extends string = string> {
  /** Stores the currently selected tool. */
  readonly currentTool: TTool
  /** Stores the previous tool for restoration flows. */
  readonly previousTool?: TTool
  /** Stores an optional temporary tool driven by modifiers. */
  readonly temporaryTool?: TTool
  /** Stores the resolved tool after temporary overrides are applied. */
  readonly effectiveTool: TTool
}

/**
 * Captures the interaction state surface shared across editor products.
 */
export interface InteractionRuntime<TTool extends string = string> {
  /** Stores keyboard modifier state. */
  readonly keyboard: ModifierKeys
  /** Stores pointer state consumed by interaction reducers. */
  readonly pointer: PointerRuntime
  /** Stores tool state used by input-to-action mapping. */
  readonly tool: ToolRuntime<TTool>
}

