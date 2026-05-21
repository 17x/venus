import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineGpuUploadBrokerDecision } from './gpuUploadBroker.ts'
import { resolveEngineWorkerBudgetBrokerDecision } from './workerBudgetBroker.ts'

test('resolveEngineGpuUploadBrokerDecision reserves critical lane floor first', () => {
  const decision = resolveEngineGpuUploadBrokerDecision(1_000_000, [
    { lane: 'image', requestedBytes: 900_000, critical: true },
    { lane: 'text', requestedBytes: 200_000, critical: false },
  ])

  assert.ok((decision.grantedBytesByLane['image'] ?? 0) >= 256 * 1024)
  assert.ok(decision.remainingBytes >= 0)
})

test('resolveEngineWorkerBudgetBrokerDecision grants highest-priority affordable tasks', () => {
  const decision = resolveEngineWorkerBudgetBrokerDecision(6, [
    { id: 'low-expensive', priority: 1, cost: 6 },
    { id: 'high-medium', priority: 3, cost: 4 },
    { id: 'high-small', priority: 3, cost: 2 },
  ])

  assert.deepEqual(decision.grantedTaskIds, ['high-small', 'high-medium'])
  assert.equal(decision.remainingBudget, 0)
})
