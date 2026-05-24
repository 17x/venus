// Module responsibility: validate explainable offline AI tuning proposals.
// Non-responsibility: online autonomous tuning.

/**
 * Describes one AI tuning proposal.
 */
export interface EngineAiTuningProposal {
  /** Proposal id. */
  id: string
  /** Explanation text for proposal. */
  explanation: string
  /** Whether proposal is offline-only. */
  offlineOnly: boolean
}

/**
 * Intent: validate AI tuning proposal safety constraints.
 * @param proposal AI tuning proposal.
 * @returns True when proposal is explainable and offline-only.
 */
export function validateEngineAiTuningProposalV1(proposal: EngineAiTuningProposal): boolean {
  return proposal.id.length > 0 && proposal.explanation.length > 0 && proposal.offlineOnly
}
