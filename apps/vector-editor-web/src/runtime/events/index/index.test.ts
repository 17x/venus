import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRuntimeInputRouter,
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  EMPTY_RUNTIME_SHELL_SNAPSHOT,
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  getRuntimeNormalizedInteractionSnapshot,
  getRuntimeMigrationSnapshot,
  getRuntimeRenderDiagnosticsSnapshot,
  getRuntimeShellSnapshot,
  getRuntimeViewportSnapshot,
  publishRuntimeMigrationSnapshot,
  publishRuntimeRenderDiagnostics,
  publishRuntimeShellSnapshot,
  publishRuntimeViewportSnapshot,
  resetRuntimeEventSnapshots,
  subscribeRuntimeNormalizedInteractionSnapshot,
  subscribeRuntimeMigrationSnapshot,
  subscribeRuntimeRenderDiagnostics,
  subscribeRuntimeShellSnapshot,
  subscribeRuntimeViewportSnapshot,
} from './index.ts'
import type {RuntimeGroupConsistencyDiagnosticCode, RuntimeMigrationSnapshot} from './index.ts'

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

  const nextSnapshot: RuntimeMigrationSnapshot = {
    runtimeV2: {
      checks: 3,
      mismatches: 1,
      lastCommandType: 'shape.group',
      lastIssues: ['parent mismatch'],
      frameBoundaryChecks: 10,
      frameBoundaryMismatches: 2,
      lastFrameBoundaryIssues: ['group:root references missing child:ghost'],
      strictModeEnabled: true,
      groupConsistencyQuickCheck: {
        valid: false,
        diagnosticCount: 2,
        codes: ['group-missing-child', 'node-parent-invalid'] as RuntimeGroupConsistencyDiagnosticCode[],
      },
      adapterSnapshotGovernance: {
        available: true,
        normalizeElementCount: 3,
        fileDocumentShapeCount: 3,
        fileFormatSceneRootCount: 1,
        roundTripElementCount: 3,
        consistent: true,
        mismatchCount: 0,
        riskLevel: 'low',
        fieldDiffs: [
          {
            field: 'normalize:fileDocument',
            baseline: 3,
            observed: 3,
            delta: 0,
            matches: true,
          },
          {
            field: 'fileDocument:roundTrip',
            baseline: 3,
            observed: 3,
            delta: 0,
            matches: true,
          },
          {
            field: 'fileDocument:sceneRoot',
            baseline: 1,
            observed: 1,
            delta: 0,
            matches: true,
          },
        ],
        issues: [],
      },
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
      groupConsistencyQuickCheck: {
        valid: true,
        diagnosticCount: 0,
        codes: [] as RuntimeGroupConsistencyDiagnosticCode[],
      },
      adapterSnapshotGovernance: {
        available: false,
        normalizeElementCount: 0,
        fileDocumentShapeCount: 0,
        fileFormatSceneRootCount: 0,
        roundTripElementCount: 0,
        consistent: true,
        mismatchCount: 0,
        riskLevel: 'low',
        fieldDiffs: [],
        issues: [],
      },
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
 * Verifies viewport snapshot publish/get/subscribe flow stays wired for shell viewport consumers.
 */
test('runtime viewport snapshot publish notifies listeners and updates snapshot cache', () => {
  resetSnapshotsForTest()

  let listenerCallCount = 0
  const unsubscribe = subscribeRuntimeViewportSnapshot(() => {
    listenerCallCount += 1
  })

  publishRuntimeViewportSnapshot({
    scale: 2,
  })

  assert.equal(listenerCallCount, 1)
  assert.deepEqual(getRuntimeViewportSnapshot(), {
    scale: 2,
  })

  unsubscribe()
})

/**
 * Verifies shell snapshot publish/get/subscribe flow stays wired for shell chrome consumers.
 */
test('runtime shell snapshot publish notifies listeners and updates snapshot cache', () => {
  resetSnapshotsForTest()

  let listenerCallCount = 0
  const unsubscribe = subscribeRuntimeShellSnapshot(() => {
    listenerCallCount += 1
  })

  publishRuntimeShellSnapshot({
    selectedCount: 3,
    layerCount: 17,
  })

  assert.equal(listenerCallCount, 1)
  assert.deepEqual(getRuntimeShellSnapshot(), {
    selectedCount: 3,
    layerCount: 17,
  })

  unsubscribe()
})

/**
 * Verifies render diagnostics snapshot publish/get/subscribe flow stays wired for debug observers.
 */
test('runtime render diagnostics publish notifies listeners and updates snapshot cache', () => {
  resetSnapshotsForTest()

  let listenerCallCount = 0
  const unsubscribe = subscribeRuntimeRenderDiagnostics(() => {
    listenerCallCount += 1
  })

  publishRuntimeRenderDiagnostics({
    ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
    drawMs: 8,
    schedulerQueueWaitMs: 1,
    schedulerThrottleDelayMs: 0,
    presentRafDelayMs: 0,
  })

  const diagnostics = getRuntimeRenderDiagnosticsSnapshot()
  assert.equal(listenerCallCount, 1)
  assert.equal(typeof diagnostics.fpsEstimate, 'number')
  assert.equal(typeof diagnostics.fpsInstantaneous, 'number')
  assert.ok(diagnostics.stats)

  unsubscribe()
})

/**
 * Verifies reset fan-out restores viewport/shell/render snapshots and emits one update per listener.
 */
test('runtime event reset restores viewport shell and render snapshots and emits listener updates', () => {
  resetSnapshotsForTest()

  publishRuntimeViewportSnapshot({scale: 1.5})
  publishRuntimeShellSnapshot({selectedCount: 2, layerCount: 9})
  publishRuntimeRenderDiagnostics({
    ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
    drawMs: 12,
    schedulerQueueWaitMs: 2,
    schedulerThrottleDelayMs: 1,
    presentRafDelayMs: 1,
  })

  let viewportListenerCallCount = 0
  let shellListenerCallCount = 0
  let renderListenerCallCount = 0
  const unsubscribeViewport = subscribeRuntimeViewportSnapshot(() => {
    viewportListenerCallCount += 1
  })
  const unsubscribeShell = subscribeRuntimeShellSnapshot(() => {
    shellListenerCallCount += 1
  })
  const unsubscribeRender = subscribeRuntimeRenderDiagnostics(() => {
    renderListenerCallCount += 1
  })

  resetRuntimeEventSnapshots()

  assert.equal(viewportListenerCallCount, 1)
  assert.equal(shellListenerCallCount, 1)
  assert.equal(renderListenerCallCount, 1)
  assert.deepEqual(getRuntimeViewportSnapshot(), EMPTY_RUNTIME_VIEWPORT_SNAPSHOT)
  assert.deepEqual(getRuntimeShellSnapshot(), EMPTY_RUNTIME_SHELL_SNAPSHOT)
  assert.deepEqual(getRuntimeRenderDiagnosticsSnapshot(), EMPTY_RUNTIME_RENDER_DIAGNOSTICS)

  unsubscribeViewport()
  unsubscribeShell()
  unsubscribeRender()
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

