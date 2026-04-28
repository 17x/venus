import type {ToolRuntime} from './ToolRuntime.ts'

/**
 * Defines optional effective-tool override callback.
 */
export interface EffectiveToolResolverOptions<TTool extends string> {
  /** Allows caller policy to override the baseline current/temporary tool result. */
  resolveOverride?: (runtime: ToolRuntime<TTool>) => TTool | undefined
}

/**
 * Resolves effective tool by applying temporary and optional policy overrides.
 */
export function resolveEffectiveTool<TTool extends string>(
  runtime: ToolRuntime<TTool>,
  options?: EffectiveToolResolverOptions<TTool>,
): TTool {
  const override = options?.resolveOverride?.(runtime)
  if (override) {
    // Give product policy the final say when explicit override is provided.
    return override
  }

  // Temporary tool takes precedence while the temporary mode is active.
  return runtime.temporaryTool ?? runtime.currentTool
}

/**
 * Applies a new current tool and recomputes effective tool.
 */
export function applyCurrentTool<TTool extends string>(
  runtime: ToolRuntime<TTool>,
  nextTool: TTool,
  options?: EffectiveToolResolverOptions<TTool>,
): ToolRuntime<TTool> {
  const nextRuntime: ToolRuntime<TTool> = {
    ...runtime,
    previousTool: runtime.currentTool,
    currentTool: nextTool,
  }

  return {
    ...nextRuntime,
    effectiveTool: resolveEffectiveTool(nextRuntime, options),
  }
}

/**
 * Applies temporary tool and recomputes effective tool.
 */
export function applyTemporaryTool<TTool extends string>(
  runtime: ToolRuntime<TTool>,
  temporaryTool?: TTool,
  options?: EffectiveToolResolverOptions<TTool>,
): ToolRuntime<TTool> {
  const nextRuntime: ToolRuntime<TTool> = {
    ...runtime,
    temporaryTool,
  }

  return {
    ...nextRuntime,
    effectiveTool: resolveEffectiveTool(nextRuntime, options),
  }
}

