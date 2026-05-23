import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  EMPTY_RUNTIME_SHELL_SNAPSHOT,
  getRuntimeMigrationSnapshot,
  getRuntimeShellSnapshot,
  resetRuntimeEventSnapshots,
} from '../../../runtime/events/index/index.ts'
import {
  applyRuntimeBridgeFileBoundaryReset,
  applyRuntimeBridgeMigrationSync,
  applyRuntimeBridgeSelectionSync,
  applyRuntimeBridgeShellSync,
} from '../../../product/runtime/useEditorRuntimeBridgeSync.ts'

/**
 * Verifies file-boundary reset clears singleton runtime snapshots and bridge command state.
 */
test('bridge file-boundary reset clears runtime snapshots and command bridge state', () => {
  resetRuntimeEventSnapshots()

  applyRuntimeBridgeShellSync({
    selectedShapeIds: ['shape-a', 'shape-b'],
    layerItemCount: 3,
    setShellSelectedCount: () => {},
    setShellLayerCount: () => {},
    dispatchRuntimeEvent: () => {},
  })
  applyRuntimeBridgeMigrationSync({
    checks: 4,
    mismatches: 1,
    lastCommandType: 'shape.group',
    lastIssues: ['group invariant mismatch'],
    frameBoundaryChecks: 7,
    frameBoundaryMismatches: 1,
    lastFrameBoundaryIssues: ['group:root missing child:ghost'],
    strictModeEnabled: true,
    groupConsistencyQuickCheck: {
      valid: false,
      diagnosticCount: 2,
      codes: ['group-missing-child', 'node-parent-invalid'],
    },
    adapterSnapshotGovernance: {
      available: true,
      normalizeElementCount: 3,
      fileDocumentShapeCount: 3,
      fileFormatSceneRootCount: 1,
      roundTripElementCount: 3,
      consistent: true,
      issues: [],
    },
  })

  let lastCommandType: string | null = 'shape.move'
  let lastCommandMeta: {commandId: string} | null = {commandId: 'runtime-cmd-1'}

  applyRuntimeBridgeFileBoundaryReset({
    setLastCommandType: (next) => {
      lastCommandType = next
    },
    setLastCommandMeta: (next) => {
      lastCommandMeta = next
    },
  })

  assert.equal(lastCommandType, null)
  assert.equal(lastCommandMeta, null)
  assert.deepEqual(getRuntimeShellSnapshot(), EMPTY_RUNTIME_SHELL_SNAPSHOT)
  assert.deepEqual(getRuntimeMigrationSnapshot(), EMPTY_RUNTIME_MIGRATION_SNAPSHOT)
})

/**
 * Verifies selection sync mirrors selected ids and emits runtime selection event payload.
 */
test('bridge selection sync mirrors selected ids and dispatches selection event', () => {
  resetRuntimeEventSnapshots()

  const dispatchedEvents: unknown[] = []
  let mirroredSelection: string[] = []

  applyRuntimeBridgeSelectionSync({
    selectedShapeIds: ['shape-1', 'shape-2'],
    setSelectedShapeIds: (next) => {
      mirroredSelection = next
    },
    dispatchRuntimeEvent: (event) => {
      dispatchedEvents.push(event)
    },
  })

  assert.deepEqual(mirroredSelection, ['shape-1', 'shape-2'])
  assert.deepEqual(dispatchedEvents, [{
    type: 'runtime.selection.changed',
    selectedShapeIds: ['shape-1', 'shape-2'],
  }])
})

/**
 * Verifies shell sync publishes runtime shell snapshot and dispatches shell event payload.
 */
test('bridge shell sync publishes shell snapshot and dispatches shell event', () => {
  resetRuntimeEventSnapshots()

  const dispatchedEvents: unknown[] = []
  let shellSelectedCount = -1
  let shellLayerCount = -1

  applyRuntimeBridgeShellSync({
    selectedShapeIds: ['shape-1', 'shape-2', 'shape-3'],
    layerItemCount: 12,
    setShellSelectedCount: (next) => {
      shellSelectedCount = next
    },
    setShellLayerCount: (next) => {
      shellLayerCount = next
    },
    dispatchRuntimeEvent: (event) => {
      dispatchedEvents.push(event)
    },
  })

  assert.equal(shellSelectedCount, 3)
  assert.equal(shellLayerCount, 12)
  assert.deepEqual(getRuntimeShellSnapshot(), {
    selectedCount: 3,
    layerCount: 12,
  })
  assert.deepEqual(dispatchedEvents, [{
    type: 'runtime.shell.changed',
    selectedCount: 3,
    layerCount: 12,
  }])
})

/**
 * Verifies migration sync publishes runtime-v2 diagnostics snapshot for subscribers.
 */
test('bridge migration sync publishes runtime-v2 snapshot payload', () => {
  resetRuntimeEventSnapshots()

  applyRuntimeBridgeMigrationSync({
    checks: 11,
    mismatches: 2,
    lastCommandType: 'shape.reorder',
    lastIssues: ['reorder index mismatch'],
    frameBoundaryChecks: 18,
    frameBoundaryMismatches: 3,
    lastFrameBoundaryIssues: ['node:shape-3 escaped frame boundary'],
    strictModeEnabled: false,
    groupConsistencyQuickCheck: {
      valid: false,
      diagnosticCount: 1,
      codes: ['group-child-parent-mismatch'],
    },
    adapterSnapshotGovernance: {
      available: true,
      normalizeElementCount: 4,
      fileDocumentShapeCount: 4,
      fileFormatSceneRootCount: 1,
      roundTripElementCount: 4,
      consistent: true,
      issues: [],
    },
  })

  assert.deepEqual(getRuntimeMigrationSnapshot(), {
    runtimeV2: {
      checks: 11,
      mismatches: 2,
      lastCommandType: 'shape.reorder',
      lastIssues: ['reorder index mismatch'],
      frameBoundaryChecks: 18,
      frameBoundaryMismatches: 3,
      lastFrameBoundaryIssues: ['node:shape-3 escaped frame boundary'],
      strictModeEnabled: false,
      groupConsistencyQuickCheck: {
        valid: false,
        diagnosticCount: 1,
        codes: ['group-child-parent-mismatch'],
      },
      adapterSnapshotGovernance: {
        available: true,
        normalizeElementCount: 4,
        fileDocumentShapeCount: 4,
        fileFormatSceneRootCount: 1,
        roundTripElementCount: 4,
        consistent: true,
        issues: [],
      },
    },
  })
})
