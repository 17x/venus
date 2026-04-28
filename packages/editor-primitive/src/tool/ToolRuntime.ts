/**
 * Stores selected and effective tool state for interaction policy.
 */
export interface ToolRuntime<TTool extends string = string> {
  /** Stores the currently selected tool. */
  currentTool: TTool
  /** Stores previous persistent tool for restoration flows. */
  previousTool?: TTool
  /** Stores temporary tool activated by modifiers or temporary mode. */
  temporaryTool?: TTool
  /** Stores resolved tool after temporary override and policy resolution. */
  effectiveTool: TTool
  /** Indicates whether tool should stay locked after one interaction. */
  toolLocked?: boolean
}

/**
 * Creates initial tool runtime from one selected tool value.
 */
export function createToolRuntime<TTool extends string>(tool: TTool): ToolRuntime<TTool> {
  return {
    currentTool: tool,
    effectiveTool: tool,
  }
}

