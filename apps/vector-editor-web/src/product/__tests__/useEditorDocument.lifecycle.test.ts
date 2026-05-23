import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorFileDocument} from '../../runtime/types/index.ts'
import {
  resolveLifecycleOnFileCreate,
  resolveLifecycleOnFileOpen,
  resolveLifecycleOnFileSave,
} from '../editorRuntimeHelpers/fileLifecycle.ts'

/**
 * Builds one minimal file payload used by lifecycle-on-open contracts.
 * @param overrides Optional field overrides for test scenarios.
 */
function createFile(overrides: Partial<EditorFileDocument> = {}): EditorFileDocument {
  return {
    id: 'file-1',
    name: 'Lifecycle Test',
    version: '1.0.0',
    createdAt: 1,
    updatedAt: 1,
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    lifecycle: {state: 'dirty', dirty: true},
    config: {
      page: {unit: 'px', width: 1920, height: 1080, dpi: 72},
      editor: {},
    },
    elements: [],
    assets: [],
    ...overrides,
  }
}

test('resolveLifecycleOnFileOpen keeps recovery lifecycle when file is readonly', () => {
  const file = createFile({
    lifecycle: {state: 'recovery', dirty: true, recoveryReason: 'migration.schema.unsupported-major'},
    config: {
      page: {unit: 'px', width: 1920, height: 1080, dpi: 72},
      editor: {readOnly: true},
    },
  })

  const lifecycle = resolveLifecycleOnFileOpen(file)

  assert.ok(lifecycle)
  assert.equal(lifecycle.state, 'recovery')
  assert.equal(lifecycle.dirty, true)
  assert.equal(lifecycle.recoveryReason, 'migration.schema.unsupported-major')
  assert.equal(lifecycle.lastTransitionSource?.event, 'file.open.recovery-preserved')
})

test('resolveLifecycleOnFileOpen transitions non-readonly files to opened', () => {
  const file = createFile({
    lifecycle: {state: 'dirty', dirty: true},
  })

  const lifecycle = resolveLifecycleOnFileOpen(file)

  assert.ok(lifecycle)
  assert.equal(lifecycle.state, 'opened')
  assert.equal(lifecycle.dirty, false)
  assert.equal(lifecycle.lastTransitionSource?.event, 'file.open')
})

test('resolveLifecycleOnFileCreate transitions file lifecycle to created with observable source', () => {
  const file = createFile({
    lifecycle: {state: 'opened', dirty: false},
  })

  const lifecycle = resolveLifecycleOnFileCreate(file)

  assert.ok(lifecycle)
  assert.equal(lifecycle.state, 'created')
  assert.equal(lifecycle.dirty, false)
  assert.equal(lifecycle.lastTransitionSource?.event, 'file.create')
})

test('resolveLifecycleOnFileSave transitions lifecycle to saved with default file.save source', () => {
  const lifecycle = resolveLifecycleOnFileSave({state: 'dirty', dirty: true})

  assert.ok(lifecycle)
  assert.equal(lifecycle.state, 'saved')
  assert.equal(lifecycle.dirty, false)
  assert.equal(lifecycle.lastTransitionSource?.event, 'file.save')
})

test('resolveLifecycleOnFileSave keeps command transition source and dirty provenance from context', () => {
  const lifecycle = resolveLifecycleOnFileSave(
    {state: 'dirty', dirty: true},
    {
      transitionSource: {
        kind: 'command',
        event: 'file.save',
        commandId: 'runtime-cmd-9',
        transactionId: 'runtime-txn-9',
        commandType: 'shape.group',
        issuedAt: 99,
      },
      dirtySource: {
        commandType: 'shape.group',
        commandId: 'runtime-cmd-9',
        transactionId: 'runtime-txn-9',
        issuedAt: 99,
      },
    },
  )

  assert.ok(lifecycle)
  assert.equal(lifecycle.state, 'saved')
  assert.equal(lifecycle.lastTransitionSource?.kind, 'command')
  assert.equal(lifecycle.lastTransitionSource?.commandId, 'runtime-cmd-9')
  assert.equal(lifecycle.lastDirtySource?.transactionId, 'runtime-txn-9')
})
