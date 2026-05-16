// Module responsibility: validate migration mapping coverage for v1 guide.
// Non-responsibility: migration execution.

/**
 * Describes one API migration mapping pair.
 */
export interface EngineMigrationMapping {
  /** Legacy API id. */
  legacyApi: string
  /** New API id. */
  newApi: string
}

/**
 * Intent: validate migration mappings for uniqueness and completeness.
 * @param mappings Migration mapping entries.
 * @returns True when mapping list is valid.
 */
export function validateEngineMigrationMappings(mappings: readonly EngineMigrationMapping[]): boolean {
  if (mappings.length === 0) {
    return false
  }

  const legacySet = new Set<string>()
  for (const mapping of mappings) {
    if (legacySet.has(mapping.legacyApi)) {
      return false
    }
    legacySet.add(mapping.legacyApi)
  }

  return true
}
