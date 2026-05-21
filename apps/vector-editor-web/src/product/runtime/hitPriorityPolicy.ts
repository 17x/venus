import type {ToolName} from '../../runtime/model/index.ts'

/** Declares one hit-priority lane category used by pointer interaction policy. */
export type RuntimeHitPriorityLane = 'overlay' | 'control-point' | 'object'

/** Declares one pointer stage token consumed by runtime hit-priority resolution. */
export type RuntimeHitPriorityStage = 'pointer-down' | 'pointer-move'

/** Declares one normalized pointer-selector phase token used by priority policy. */
export type RuntimePointerSelectorPhase = 'idle' | 'pending' | 'marquee' | 'unknown'

/** Declares one resolved runtime hit-priority plan. */
export interface RuntimeHitPriorityPlan {
  /** Stores ordered lane list where earlier lane has higher priority. */
  readonly lanes: readonly RuntimeHitPriorityLane[]
}

/**
 * Resolves pointer-selector phase into policy-owned normalized token.
 * @param phase Raw phase token emitted by pointer-selector state machine.
 */
export function resolveRuntimePointerSelectorPhase(phase: string | null | undefined): RuntimePointerSelectorPhase {
  if (phase === 'idle' || phase === 'pending' || phase === 'marquee') {
    return phase
  }
  return 'unknown'
}

/**
 * Resolves one explicit hit-priority plan for runtime pointer interactions.
 * @param input Policy input carrying tool, stage, and optional pointer-selector phase.
 */
export function resolveRuntimeHitPriorityPlan(input: {
  tool: ToolName
  stage: RuntimeHitPriorityStage
  pointerSelectorPhase?: RuntimePointerSelectorPhase
}): RuntimeHitPriorityPlan {
  if (input.stage === 'pointer-down') {
    if (input.tool === 'selector' || input.tool === 'dselector') {
      return {lanes: ['control-point', 'object']}
    }
    return {lanes: ['object']}
  }

  if (input.tool === 'selector' || input.tool === 'dselector') {
    if (input.pointerSelectorPhase === 'marquee') {
      // Marquee interaction owns pointer-move channel until pointer-up, so overlay wins exclusively.
      return {lanes: ['overlay']}
    }
    return {lanes: ['control-point', 'object']}
  }

  return {lanes: ['object']}
}
