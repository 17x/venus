import {createRenderParityChecklistReport} from '../src/runtime/engine-bridge/renderParityChecklist.ts'

/**
 * Generates and prints one deterministic render parity checklist baseline report.
 */
function main() {
  const report = createRenderParityChecklistReport()

  console.log('[render-parity] baseline checklist')
  console.log(JSON.stringify(report, null, 2))
}

main()
