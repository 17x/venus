import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

/**
 * Verifies stage-strict package scripts remain isolated to dedicated stage history/gate artifacts.
 */
test('render parity stage-strict scripts keep dedicated history and gate paths', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const stageStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:stage']
  const stageStrictBatchScript = parsed.scripts?.['report:render-parity-runtime-replay-batch-gate:strict:stage']
  const defaultStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict']

  assert.equal(typeof stageStrictHistoryScript, 'string')
  assert.equal(typeof stageStrictBatchScript, 'string')
  assert.equal(typeof defaultStrictHistoryScript, 'string')

  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.history\.json/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.gate\.json/)
  assert.ok(!(stageStrictHistoryScript ?? '').includes('runtime-replay.batch.history.json'))
  assert.ok(!(stageStrictHistoryScript ?? '').includes('runtime-replay.batch.gate.json'))
  assert.match(stageStrictHistoryScript ?? '', /--max-stage-scheduler-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-stage-scene-apply-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-rolling-stage-scheduler-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-rolling-stage-scene-apply-unknown-rate-percent\s+0/)
  assert.match(stageStrictBatchScript ?? '', /report:render-parity-runtime-replay-history-gate:strict:stage/)
  assert.match(defaultStrictHistoryScript ?? '', /runtime-replay\.batch\.history\.json/)
})

/**
 * Verifies stage-strict script preserves dedicated artifact cleanup to avoid rolling-history contamination.
 */
test('render parity stage-strict script clears dedicated artifacts before running gate', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const stageStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:stage']

  assert.equal(typeof stageStrictHistoryScript, 'string')
  assert.match(stageStrictHistoryScript ?? '', /^rm -f\s+/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.history\.json/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.gate\.json/)
  assert.match(stageStrictHistoryScript ?? '', /&&\s+pnpm\s+dlx\s+tsx\s+\.\/scripts\/render-parity-runtime-replay-history-gate\.ts/)
  assert.ok(!(stageStrictHistoryScript ?? '').includes('rm -f ./docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json'))
})

/**
 * Verifies resource-rate strict package scripts remain isolated to dedicated resource-rate history/gate artifacts.
 */
test('render parity resource-rate strict scripts keep dedicated history and gate paths', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const resourceRateStrictHistoryScript =
    parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:resource-rate']
  const resourceRateStrictBatchScript =
    parsed.scripts?.['report:render-parity-runtime-replay-batch-gate:strict:resource-rate']
  const defaultStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict']

  assert.equal(typeof resourceRateStrictHistoryScript, 'string')
  assert.equal(typeof resourceRateStrictBatchScript, 'string')
  assert.equal(typeof defaultStrictHistoryScript, 'string')

  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.history\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.gate\.json/)
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('runtime-replay.batch.history.json'))
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('runtime-replay.batch.gate.json'))
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-resource-decode-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-resource-compression-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-rolling-resource-decode-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-rolling-resource-compression-unknown-rate-percent\s+0/)
  assert.match(
    resourceRateStrictBatchScript ?? '',
    /report:render-parity-runtime-replay-history-gate:strict:resource-rate/,
  )
  assert.match(defaultStrictHistoryScript ?? '', /runtime-replay\.batch\.history\.json/)
})

/**
 * Verifies resource-rate strict script preserves dedicated artifact cleanup to avoid rolling-history contamination.
 */
test('render parity resource-rate strict script clears dedicated artifacts before running gate', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const resourceRateStrictHistoryScript =
    parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:resource-rate']

  assert.equal(typeof resourceRateStrictHistoryScript, 'string')
  assert.match(resourceRateStrictHistoryScript ?? '', /^rm -f\s+/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.history\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.gate\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /&&\s+pnpm\s+dlx\s+tsx\s+\.\/scripts\/render-parity-runtime-replay-history-gate\.ts/)
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('rm -f ./docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json'))
})

/**
 * Verifies CI workflow keeps strict replay gate execution and code-based failure routing enabled.
 */
test('render parity strict gate workflow keeps PR strict command and code routing', async () => {
  const workflowPath = path.resolve(
    process.cwd(),
    '../../.github/workflows/render-parity-strict-gate.yml',
  )
  const workflow = await readFile(workflowPath, 'utf8')

  assert.match(workflow, /pull_request:/)
  assert.match(workflow, /report:render-parity-runtime-replay-batch-gate:strict/)
  assert.match(workflow, /runtime-replay\.batch\.gate\.json/)
  assert.match(workflow, /RenderParityGate/)
  assert.match(workflow, /RP_GATE_/)
})
