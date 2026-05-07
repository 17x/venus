import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRuntimeInputRouter,
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  getRuntimeNormalizedInteractionSnapshot,
  getRuntimeMigrationSnapshot,
  publishRuntimeMigrationSnapshot,
  resetRuntimeEventSnapshots,
  subscribeRuntimeNormalizedInteractionSnapshot,
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
      frameBoundaryChecks: 10,
      frameBoundaryMismatches: 2,
      lastFrameBoundaryIssues: ['group:root references missing child:ghost'],
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
      frameBoundaryChecks: 20,
      frameBoundaryMismatches: 1,
      lastFrameBoundaryIssues: ['node:rect-1 missing from parent:group-1 children list'],
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

/**
 * Verifies runtime input dispatch publishes primitive normalized interaction snapshots.
 */
test('runtime input router publishes normalized interaction snapshot on pointer input', () => {
  resetSnapshotsForTest()

  let listenerCallCount = 0
  const unsubscribe = subscribeRuntimeNormalizedInteractionSnapshot(() => {
    listenerCallCount += 1
  })

  const router = createRuntimeInputRouter({
    // Keep sink no-op so this test isolates normalization snapshot behavior.
    onInput: () => {},
  })
  router.dispatch({
    type: 'pointerdown',
    point: {x: 10, y: 20},
    modifiers: {shiftKey: true},
  })

  const snapshot = getRuntimeNormalizedInteractionSnapshot()
  assert.equal(listenerCallCount, 1)
  assert.ok(snapshot)
  assert.equal(snapshot?.normalizedEvent.type, 'pointer-down')
  if (snapshot?.normalizedEvent.type === 'pointer-down') {
    assert.equal(snapshot.normalizedEvent.event.screen.x, 10)
    assert.equal(snapshot.normalizedEvent.event.modifiers.shift, true)
  }

  unsubscribe()
})

/**
 * Verifies snapshot reset clears normalized interaction cache and notifies subscribers.
 */
test('runtime event reset clears normalized interaction snapshot and emits listener update', () => {
  resetSnapshotsForTest()

  const router = createRuntimeInputRouter({
    // Keep sink no-op so this test isolates reset semantics for normalized snapshots.
    onInput: () => {},
  })
  router.dispatch({
    type: 'keydown',
    key: 'z',
    modifiers: {metaKey: true},
  })

  let listenerCallCount = 0
  const unsubscribe = subscribeRuntimeNormalizedInteractionSnapshot(() => {
    listenerCallCount += 1
  })

  resetRuntimeEventSnapshots()

  assert.equal(listenerCallCount, 1)
  assert.equal(getRuntimeNormalizedInteractionSnapshot(), null)

  unsubscribe()
})

