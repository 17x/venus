// Module responsibility: validate quarterly audit template readiness across perf/visual/stability.
// Non-responsibility: audit execution.

/**
 * Describes one quarterly audit template checklist.
 */
export interface EngineQuarterlyAuditTemplate {
  /** Template name. */
  name: 'perf' | 'visual' | 'stability'
  /** Whether baseline batch is defined. */
  baselineDefined: boolean
  /** Whether result archive format is defined. */
  archiveDefined: boolean
}

/**
 * Intent: validate quarterly audit template checklist.
 * @param templates Quarterly audit templates.
 * @returns True when perf/visual/stability templates are all complete.
 */
export function validateEngineQuarterlyAuditTemplates(
  templates: readonly EngineQuarterlyAuditTemplate[],
): boolean {
  const required = new Set(['perf', 'visual', 'stability'])
  for (const template of templates) {
    if (template.baselineDefined && template.archiveDefined) {
      required.delete(template.name)
    }
  }

  return required.size === 0
}
