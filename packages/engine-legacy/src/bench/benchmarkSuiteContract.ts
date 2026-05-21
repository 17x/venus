// Module responsibility: normalize benchmark suite metadata contract.
// Non-responsibility: benchmark execution.

/**
 * Describes benchmark suite case metadata.
 */
export interface EngineBenchmarkSuiteCase {
  /** Stable case id. */
  id: string
  /** Scenario name. */
  scenario: string
}

/**
 * Intent: validate benchmark suite case list.
 * @param cases Benchmark suite cases.
 * @returns True when cases list is non-empty and ids are unique.
 */
export function validateEngineBenchmarkSuiteCases(cases: readonly EngineBenchmarkSuiteCase[]): boolean {
  if (cases.length === 0) {
    return false
  }

  const ids = new Set<string>()
  for (const item of cases) {
    if (ids.has(item.id)) {
      return false
    }
    ids.add(item.id)
  }

  return true
}
