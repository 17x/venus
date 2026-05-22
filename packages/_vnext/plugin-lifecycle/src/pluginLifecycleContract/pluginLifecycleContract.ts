/**
 * Declares canonical plugin lifecycle phases shared by plugin staging contracts.
 */
export type PluginLifecyclePhase =
  | 'setup'
  | 'activate'
  | 'deactivate'
  | 'dispose'

/**
 * Describes runtime context passed into plugin lifecycle hooks.
 */
export interface PluginExecutionContext {
  /** Unique engine/runtime session id used for scoped plugin side-effects. */
  sessionId: string
  /** Monotonic timestamp of lifecycle dispatch in milliseconds. */
  timestampMs: number
  /** Optional capability tags exposed by current runtime host. */
  capabilities: readonly string[]
}

/**
 * Describes optional plugin hook implementations per lifecycle phase.
 */
export interface PluginRuntimeHooks {
  /** Optional setup hook used to initialize plugin local state. */
  onSetup?: (context: PluginExecutionContext) => void | Promise<void>
  /** Optional activation hook used to bind plugin into active runtime. */
  onActivate?: (context: PluginExecutionContext) => void | Promise<void>
  /** Optional deactivation hook used to unbind plugin runtime subscriptions. */
  onDeactivate?: (context: PluginExecutionContext) => void | Promise<void>
  /** Optional disposal hook used to release plugin-owned resources. */
  onDispose?: (context: PluginExecutionContext) => void | Promise<void>
}

/**
 * Describes deterministic lifecycle dispatcher contract for one plugin instance.
 */
export interface PluginLifecycleContract {
  /** Dispatches one lifecycle phase and records deterministic transition history. */
  dispatch: (phase: PluginLifecyclePhase, context: PluginExecutionContext) => Promise<void>
  /** Resolves ordered phase history that has been dispatched so far. */
  getHistory: () => readonly PluginLifecyclePhase[]
  /** Resolves whether dispatcher has entered disposed terminal state. */
  isDisposed: () => boolean
}

/**
 * Resolves canonical lifecycle ordering used by conformance checks.
 * @returns Ordered lifecycle phase sequence for one plugin instance.
 */
export function resolvePluginLifecycleOrder(): readonly PluginLifecyclePhase[] {
  return ['setup', 'activate', 'deactivate', 'dispose']
}

/**
 * Validates whether one phase string belongs to canonical lifecycle set.
 * @param phase Candidate phase token to validate.
 * @returns Whether candidate token is a valid lifecycle phase.
 */
export function validatePluginLifecyclePhase(phase: string): phase is PluginLifecyclePhase {
  return resolvePluginLifecycleOrder().includes(phase as PluginLifecyclePhase)
}

/**
 * Creates one deterministic plugin lifecycle dispatcher around runtime hooks.
 * @param hooks Optional plugin hook implementations.
 * @returns Plugin lifecycle dispatcher contract.
 */
export function createPluginLifecycleContract(hooks: PluginRuntimeHooks): PluginLifecycleContract {
  const history: PluginLifecyclePhase[] = []
  let disposed = false

  /**
   * Runs one hook associated with provided lifecycle phase.
   * @param phase Lifecycle phase token used to pick hook implementation.
   * @param context Runtime context forwarded to hook implementation.
   */
  async function runPhaseHook(phase: PluginLifecyclePhase, context: PluginExecutionContext): Promise<void> {
    if (phase === 'setup') {
      await hooks.onSetup?.(context)
      return
    }
    if (phase === 'activate') {
      await hooks.onActivate?.(context)
      return
    }
    if (phase === 'deactivate') {
      await hooks.onDeactivate?.(context)
      return
    }
    await hooks.onDispose?.(context)
  }

  return {
    async dispatch(phase: PluginLifecyclePhase, context: PluginExecutionContext): Promise<void> {
      if (disposed) {
        return
      }

      await runPhaseHook(phase, context)
      history.push(phase)

      if (phase === 'dispose') {
        disposed = true
      }
    },
    getHistory(): readonly PluginLifecyclePhase[] {
      return history
    },
    isDisposed(): boolean {
      return disposed
    },
  }
}
