/**
 * Canonicalizes patches for stable local-vs-remote parity assertions.
 * @param input Patches to normalize and sort for deterministic comparisons.
 */
export function canonicalizePatches(input: Array<Record<string, unknown>>) {
  return input
    .map((patch) => normalizeValue(patch))
    .map((patch) => JSON.stringify(patch))
    .sort()
}

/**
 * Recursively normalizes arrays and objects so JSON serialization remains deterministic.
 * @param value Value to normalize recursively.
 */
function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry))
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)] as const)

    return Object.fromEntries(entries)
  }

  return value
}

/**
 * Filters out selection-only patches because remote collaboration payloads never include local selection updates.
 * @param patches Candidate patches to filter.
 */
export function withoutSelectionPatches<T extends {type: string}>(patches: T[]): T[] {
  return patches.filter((patch) => patch.type !== 'set-selected-index')
}
