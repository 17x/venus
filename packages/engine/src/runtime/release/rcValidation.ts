// Module responsibility: validate RC1/RC2 reports against blocker thresholds.
// Non-responsibility: running RC verification jobs.

/**
 * Describes RC report sample.
 */
export interface EngineRcReportSample {
  /** RC phase id. */
  phase: 'rc1' | 'rc2'
  /** Blocker defect count. */
  blockerDefectCount: number
}

/**
 * Intent: validate RC report pass condition.
 * @param report RC report sample.
 * @returns True when report has zero blocker defects.
 */
export function passEngineRcValidation(report: EngineRcReportSample): boolean {
  return report.blockerDefectCount <= 0
}
