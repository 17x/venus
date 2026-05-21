import test from 'node:test'
import assert from 'node:assert/strict'
import {createRuntimeInteractionDiagnosticLogger} from '../interactionDiagnosticPolicy.ts'

test('runtime interaction diagnostic logger tracks required metrics and rollback count', () => {
  const logs: Array<{entry: unknown; coverage: unknown; rollbackCount: number}> = []
  const logger = createRuntimeInteractionDiagnosticLogger({
    emitLog: (entry, snapshot) => {
      logs.push({
        entry,
        coverage: snapshot.coverage,
        rollbackCount: snapshot.rollbackCount,
      })
    },
  })

  logger.record({
    kind: 'hit-candidate',
    stage: 'pointer-down',
    candidateCount: 4,
  })
  logger.record({
    kind: 'transform-commit',
    stage: 'pointer-up',
    durationMs: 3.2,
  })
  const snapshot = logger.record({
    kind: 'transform-rollback',
    stage: 'pointer-leave',
    reason: 'pointer-leave-cancel',
  })

  assert.equal(snapshot.coverage.expectedMetricLogCount, 3)
  assert.equal(snapshot.coverage.emittedMetricLogCount, 3)
  assert.equal(snapshot.coverage.completenessRatio, 1)
  assert.equal(snapshot.rollbackCount, 1)
  assert.equal(snapshot.latestEntry?.kind, 'transform-rollback')
  assert.equal(snapshot.latestEntry?.rollbackReason, 'pointer-leave-cancel')
  assert.equal(logs.length, 3)
})

test('runtime interaction diagnostic logger marks invalid metric payload as incomplete', () => {
  const logger = createRuntimeInteractionDiagnosticLogger({
    emitLog: () => {
      // Keep test output clean while still exercising log-path execution.
    },
  })

  const snapshot = logger.record({
    kind: 'hit-candidate',
    stage: 'pointer-move',
    candidateCount: Number.NaN,
  })

  assert.equal(snapshot.coverage.expectedMetricLogCount, 1)
  assert.equal(snapshot.coverage.emittedMetricLogCount, 0)
  assert.equal(snapshot.coverage.completenessRatio, 0)
  assert.equal(snapshot.rollbackCount, 0)
  assert.equal(Number.isNaN(snapshot.latestEntry?.hitCandidateCount), true)
})
