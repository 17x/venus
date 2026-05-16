// Module responsibility: clip packet sequence by phase-aware budget and critical-lane priority.
// Non-responsibility: packet compilation from scene graph.

import type { EngineFrameBudget } from '../types/index.ts'
import type { EngineRenderStrategyPhase } from '../../runtime/createEngine/strategy/strategy.ts'

/**
 * Describes one generic packet descriptor used by phase-aware clipping.
 */
export interface EnginePhaseAwarePacket {
  /** Packet id for diagnostics references. */
  id: string
  /** Packet cost in abstract submission units. */
  cost: number
  /** Whether packet belongs to critical semantic lane. */
  critical: boolean
}

/**
 * Describes packet builder output after phase-aware clipping.
 */
export interface EnginePhaseAwarePacketBuildResult {
  /** Packets selected for submission in current frame. */
  packets: EnginePhaseAwarePacket[]
  /** Number of non-critical packets clipped by budget. */
  clippedCount: number
}

/**
 * Intent: clip packet sequence by phase budget while preserving critical packets.
 * @param packets Packet sequence ordered by renderer plan priority.
 * @param phase Current strategy phase.
 * @param budget Current frame budget.
 * @returns Clipped packet sequence and clipping stats.
 */
export function buildEnginePhaseAwarePackets(
  packets: readonly EnginePhaseAwarePacket[],
  phase: EngineRenderStrategyPhase,
  budget: EngineFrameBudget,
): EnginePhaseAwarePacketBuildResult {
  const selected: EnginePhaseAwarePacket[] = []
  let clippedCount = 0
  let consumedCost = 0
  const maxCost = Math.max(1, Math.floor(budget.drawSubmitBudgetMs))
  const phasePenalty = phase === 'pan' || phase === 'zoom' ? 1 : 0

  for (const packet of packets) {
    const packetCost = Math.max(0, packet.cost)
    const projectedCost = consumedCost + packetCost + phasePenalty

    if (packet.critical) {
      selected.push(packet)
      consumedCost = projectedCost
      continue
    }

    if (projectedCost > maxCost) {
      clippedCount += 1
      continue
    }

    selected.push(packet)
    consumedCost = projectedCost
  }

  return {
    packets: selected,
    clippedCount,
  }
}
