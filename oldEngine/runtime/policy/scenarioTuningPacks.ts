// Module responsibility: provide scenario-specific tuning packs for editor/game/animation workflows.
// Non-responsibility: applying tuning packs into runtime state.

/**
 * Describes scenario tuning pack payload.
 */
export interface EngineScenarioTuningPack {
  /** Pack id for diagnostics and rollout controls. */
  id: string
  /** Max interaction budget multiplier. */
  interactionBudgetScale: number
  /** Max settle budget multiplier. */
  settleBudgetScale: number
  /** Whether semantics guard should run in strict mode. */
  strictSemantics: boolean
}

/**
 * Intent: resolve scenario tuning pack by task key.
 * @param taskId Task id from T0075 to T0080.
 * @returns Scenario tuning pack.
 */
export function resolveEngineScenarioTuningPack(taskId: 'T0075' | 'T0076' | 'T0077' | 'T0078' | 'T0079' | 'T0080'): EngineScenarioTuningPack {
  if (taskId === 'T0075') {
    return {
      id: 'editor-300k-v1',
      interactionBudgetScale: 1.1,
      settleBudgetScale: 1,
      strictSemantics: true,
    }
  }

  if (taskId === 'T0076') {
    return {
      id: 'editor-consistency',
      interactionBudgetScale: 1,
      settleBudgetScale: 1.1,
      strictSemantics: true,
    }
  }

  if (taskId === 'T0077') {
    return {
      id: 'game-realtime-v1',
      interactionBudgetScale: 1.2,
      settleBudgetScale: 0.9,
      strictSemantics: false,
    }
  }

  if (taskId === 'T0078') {
    return {
      id: 'game-long-run',
      interactionBudgetScale: 1,
      settleBudgetScale: 1,
      strictSemantics: false,
    }
  }

  if (taskId === 'T0079') {
    return {
      id: 'animation-playback-v1',
      interactionBudgetScale: 0.95,
      settleBudgetScale: 1.15,
      strictSemantics: true,
    }
  }

  return {
    id: 'animation-complex-track',
    interactionBudgetScale: 0.9,
    settleBudgetScale: 1.2,
    strictSemantics: true,
  }
}
