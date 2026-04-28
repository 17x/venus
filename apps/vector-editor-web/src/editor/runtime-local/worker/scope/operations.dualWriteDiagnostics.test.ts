import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  getRuntimeV2DualWriteDiagnostics,
  resetRuntimeV2DualWriteDiagnostics,
  runRuntimeV2DualWriteCheck,
} from './operations.ts'

/**
 * Creates one minimal document with intentionally inconsistent parent/children links.
 */
function createInconsistentDocument(): EditorDocument {
  return {
    id: 'doc-bad',
    name: 'bad',
    width: 100,
    height: 100,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        parentId: null,
        childIds: ['rect-1'],
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        // Intentionally mismatched parent to force dual-write validation failure.
        parentId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ],
  }
}

/**
 * Creates one minimal document with consistent parent/children links.
 */
function createConsistentDocument(): EditorDocument {
  return {
    id: 'doc-good',
    name: 'good',
    width: 100,
    height: 100,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        parentId: null,
        childIds: ['rect-1'],
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-1',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ],
  }
}

test('runRuntimeV2DualWriteCheck increments checks for migration-sensitive command types', () => {
  resetRuntimeV2DualWriteDiagnostics()

  // Run one check on a consistent document to validate non-mismatch counter behavior.
  const diagnostics = runRuntimeV2DualWriteCheck('shape.group', createConsistentDocument())

  assert.equal(diagnostics.checks, 1)
  assert.equal(diagnostics.mismatches, 0)
})

test('runRuntimeV2DualWriteCheck records mismatch metadata for inconsistent documents', () => {
  resetRuntimeV2DualWriteDiagnostics()

  // Force one mismatch and ensure diagnostics capture command and issue payload.
  const diagnostics = runRuntimeV2DualWriteCheck('shape.reorder', createInconsistentDocument())

  assert.equal(diagnostics.checks, 1)
  assert.equal(diagnostics.mismatches, 1)
  assert.equal(diagnostics.lastCommandType, 'shape.reorder')
  assert.equal(diagnostics.lastIssues.length > 0, true)
})

test('runRuntimeV2DualWriteCheck throws in strict mode when mismatch is detected', () => {
  resetRuntimeV2DualWriteDiagnostics()

  const previousStrictFlag = process.env.VENUS_RUNTIME_V2_DUAL_WRITE_STRICT
  process.env.VENUS_RUNTIME_V2_DUAL_WRITE_STRICT = '1'

  try {
    // Strict mode should fail-fast on mismatch so CI can gate migration regressions.
    assert.throws(
      () => runRuntimeV2DualWriteCheck('shape.ungroup', createInconsistentDocument()),
      /runtime-v2 dual-write mismatch/,
    )
  } finally {
    if (previousStrictFlag === undefined) {
      delete process.env.VENUS_RUNTIME_V2_DUAL_WRITE_STRICT
    } else {
      process.env.VENUS_RUNTIME_V2_DUAL_WRITE_STRICT = previousStrictFlag
    }
  }

  const diagnostics = getRuntimeV2DualWriteDiagnostics()
  assert.equal(diagnostics.checks, 1)
  assert.equal(diagnostics.mismatches, 1)
})

test('runRuntimeV2DualWriteCheck tracks insert/remove structural commands for migration diagnostics', () => {
  resetRuntimeV2DualWriteDiagnostics()

  // Insert/remove commands now participate in structural dual-write drift monitoring.
  runRuntimeV2DualWriteCheck('shape.insert', createConsistentDocument())
  runRuntimeV2DualWriteCheck('shape.remove', createConsistentDocument())

  const diagnostics = getRuntimeV2DualWriteDiagnostics()
  assert.equal(diagnostics.checks, 2)
  assert.equal(diagnostics.mismatches, 0)
})
