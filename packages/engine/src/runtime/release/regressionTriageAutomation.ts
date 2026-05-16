// Module responsibility: classify regression triage severity and routing completeness.
// Non-responsibility: issue tracker mutation.

/**
 * Describes one regression triage ticket.
 */
export interface EngineRegressionTriageTicket {
  /** Ticket id. */
  id: string
  /** Regression severity. */
  severity: 'blocker' | 'major' | 'minor'
  /** Assigned owner. */
  owner: string
}

/**
 * Intent: compute whether regression triage ticket set is fully routable.
 * @param tickets Regression triage ticket set.
 * @returns True when all tickets have owners and at least one ticket exists.
 */
export function computeEngineRegressionTriageAutomation(tickets: readonly EngineRegressionTriageTicket[]): boolean {
  return tickets.length > 0 && tickets.every((ticket) => ticket.id.length > 0 && ticket.owner.length > 0)
}
