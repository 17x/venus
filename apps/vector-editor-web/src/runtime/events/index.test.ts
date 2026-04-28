import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  getRuntimeMigrationSnapshot,
  publishRuntimeMigrationSnapshot,
  resetRuntimeEventSnapshots,
  subscribeRuntimeMigrationSnapshot,
} from './index.ts'

/**
 * Resets shared runtime snapshots so each test runs against isolated defaults.
 */
function resetSnapshotsForTest() {
  resetRuntimeEventSnapshots()
}

/**
 * Verifies migration snapshot publish/get/subscribe flow stays wired for runtime-v2 diagnostics observers.
 */
test('runtime migration snapshot publish notifies listeners and updates snapshot cache', () => {
  // Ensure previous tests do not leak migration state into this assertion.
  resetSnapshotsForTest()

  let listenerCallCount = 0
  // Subscribe once so we can verify that publish triggers observer notifications.
  const unsubscribe = subscribeRuntimeMigrationSnapshot(() => {
    listenerCallCount += 1
  })

  const nextSnapshot = {
    runtimeV2: {
      checks: 3,
      mismatches: 1,
      lastCommandType: 'shape.group',
      lastIssues: ['parent mismatch'],
      strictModeEnabled: true,
    },
  }

  publishRuntimeMigrationSnapshot(nextSnapshot)

  assert.equal(listenerCallCount, 1)
  assert.deepEqual(getRuntimeMigrationSnapshot(), nextSnapshot)

  // Unsubscribe immediately so the shared singleton listener registry stays clean.
  unsubscribe()
})

/**
 * Verifies reset restores empty migration diagnostics and notifies existing migration listeners.
 */
test('runtime migration snapshot reset restores defaults and emits one listener update', () => {
  // Start from defaults and publish one non-empty snapshot before reset.
  resetSnapshotsForTest()
  publishRuntimeMigrationSnapshot({
    runtimeV2: {
      checks: 9,
      mismatches: 2,
      lastCommandType: 'shape.reorder',
      lastIssues: ['child order mismatch'],
      strictModeEnabled: false,
    },
  })

  let listenerCallCount = 0
  // Subscribe before reset to ensure reset fan-out includes migration listeners.
  const unsubscribe = subscribeRuntimeMigrationSnapshot(() => {
    listenerCallCount += 1
  })

  resetRuntimeEventSnapshots()

  assert.equal(listenerCallCount, 1)
  assert.deepEqual(getRuntimeMigrationSnapshot(), EMPTY_RUNTIME_MIGRATION_SNAPSHOT)

  // Clean up this test's listener to avoid affecting later runs in watch mode.
  unsubscribe()
})

