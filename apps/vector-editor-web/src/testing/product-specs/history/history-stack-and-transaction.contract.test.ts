import assert from 'node:assert/strict'
import test from 'node:test'

import {createHistoryManager} from '../../../runtime/worker/history.ts'

/**
 * Creates one deterministic history entry payload used by stack behavior tests.
 */
function createHistoryEntry(id: string, label: string) {
  return {
    id,
    label,
    forward: [],
    backward: [],
  }
}

test('history stack keeps remote entries visible while undo/redo stays local-only', () => {
  const manager = createHistoryManager()

  manager.pushLocalEntry(createHistoryEntry('l1', 'move'))
  manager.pushLocalEntry(createHistoryEntry('l2', 'resize'))
  manager.pushRemoteEntry(createHistoryEntry('r1', 'remote:sync'))

  const undo1 = manager.undo()
  const undo2 = manager.undo()
  const undo3 = manager.undo()

  assert.equal(undo1.appliedEntry?.id, 'l2')
  assert.equal(undo2.appliedEntry?.id, 'l1')
  assert.equal(undo3.appliedEntry, null)

  const summary = manager.getSummary()
  assert.equal(summary.entries.length, 3)
  assert.equal(summary.entries[2]?.source, 'remote')
  assert.equal(summary.canUndo, false)
  assert.equal(summary.canRedo, true)
})

test('history stack truncates redo branch when new local transaction is pushed', () => {
  const manager = createHistoryManager()

  manager.pushLocalEntry(createHistoryEntry('l1', 'create rectangle'))
  manager.pushLocalEntry(createHistoryEntry('l2', 'move rectangle'))

  const undo = manager.undo()
  assert.equal(undo.appliedEntry?.id, 'l2')

  manager.pushLocalEntry(createHistoryEntry('l3', 'rotate rectangle'))

  const redo = manager.redo()
  assert.equal(redo.appliedEntry, null)

  const summary = manager.getSummary()
  assert.deepEqual(
    summary.entries.map((entry) => entry.id),
    ['l1', 'l3'],
  )
  assert.equal(summary.cursor, 1)
})

test('history stack exposes crash-recovery recent-N replay snapshots for local-only and merged modes', () => {
  const manager = createHistoryManager()

  manager.pushLocalEntry(createHistoryEntry('l1', 'move-a'), {
    commandMeta: {
      commandId: 'runtime-cmd-1',
      transactionId: 'runtime-txn-1',
      commandSource: 'user',
      issuedAt: 100,
      commandType: 'shape.move',
    },
  })
  manager.pushLocalEntry(createHistoryEntry('l2', 'move-b'), {
    commandMeta: {
      commandId: 'runtime-cmd-2',
      transactionId: 'runtime-txn-2',
      commandSource: 'user',
      issuedAt: 101,
      commandType: 'shape.move',
    },
  })
  manager.pushRemoteEntry(createHistoryEntry('r1', 'remote-sync'))

  const replay = manager.getRecoveryReplay(2)

  assert.equal(replay.maxEntries, 2)
  assert.equal(replay.localOnly.mode, 'local-only')
  assert.deepEqual(replay.localOnly.entries.map((entry) => entry.id), ['l1', 'l2'])
  assert.equal(replay.localOnly.entries[1]?.transactionId, 'runtime-txn-2')
  assert.equal(replay.merged.mode, 'merged')
  assert.deepEqual(replay.merged.entries.map((entry) => entry.id), ['l2', 'r1'])

  const summaryReplay = manager.getSummary().recoveryReplay
  assert.equal(summaryReplay.localOnly.mode, 'local-only')
  assert.equal(summaryReplay.merged.mode, 'merged')
})
