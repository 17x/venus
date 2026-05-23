import assert from 'node:assert/strict'
import test from 'node:test'

import {createHistoryManager, type HistoryPatch} from './history.ts'

/**
 * Creates one minimal patch payload used by history merge-policy tests.
 */
function createMovePatch(shapeId: string, prevX: number, nextX: number): HistoryPatch {
  return {
    type: 'move-shape',
    shapeId,
    prevX,
    prevY: 0,
    nextX,
    nextY: 0,
  }
}

test('history manager merges local entries inside one transaction when merge is enabled', () => {
  const history = createHistoryManager()

  history.pushLocalEntry(
    {
      id: 'move-1',
      label: 'Move 1',
      forward: [createMovePatch('shape-1', 0, 10)],
      backward: [createMovePatch('shape-1', 10, 0)],
    },
    {
      commandMeta: {
        commandId: 'cmd-1',
        transactionId: 'txn-1',
        commandSource: 'user',
        issuedAt: 100,
        commandType: 'shape.move',
      },
      merge: {enabled: true},
    },
  )

  history.pushLocalEntry(
    {
      id: 'move-2',
      label: 'Move 2',
      forward: [createMovePatch('shape-1', 10, 20)],
      backward: [createMovePatch('shape-1', 20, 10)],
    },
    {
      commandMeta: {
        commandId: 'cmd-2',
        transactionId: 'txn-1',
        commandSource: 'derived',
        issuedAt: 101,
        commandType: 'shape.move',
      },
      merge: {enabled: true},
    },
  )

  const summary = history.getSummary()
  assert.equal(summary.entries.length, 1)
  assert.equal(summary.entries[0]?.id, 'move-1')
  assert.equal(summary.transactionGroups.length, 1)
  assert.equal(summary.transactionGroups[0]?.transactionId, 'txn-1')
  assert.equal(summary.transactionGroups[0]?.entryCount, 1)

  const undo = history.undo()
  assert.ok(undo.appliedEntry)
  assert.equal(undo.appliedEntry?.forward.length, 2)
  assert.equal(undo.appliedEntry?.backward.length, 2)
  assert.equal(undo.appliedEntry?.backward[0]?.type, 'move-shape')
  assert.equal(undo.appliedEntry?.backward[1]?.type, 'move-shape')
})

test('history manager keeps separate entries across different transactions', () => {
  const history = createHistoryManager()

  history.pushLocalEntry(
    {
      id: 'tx-a',
      label: 'Move A',
      forward: [createMovePatch('shape-1', 0, 5)],
      backward: [createMovePatch('shape-1', 5, 0)],
    },
    {
      commandMeta: {
        commandId: 'cmd-a',
        transactionId: 'txn-a',
        commandSource: 'user',
        issuedAt: 100,
        commandType: 'shape.move',
      },
      merge: {enabled: true},
    },
  )

  history.pushLocalEntry(
    {
      id: 'tx-b',
      label: 'Move B',
      forward: [createMovePatch('shape-1', 5, 10)],
      backward: [createMovePatch('shape-1', 10, 5)],
    },
    {
      commandMeta: {
        commandId: 'cmd-b',
        transactionId: 'txn-b',
        commandSource: 'user',
        issuedAt: 101,
        commandType: 'shape.move',
      },
      merge: {enabled: true},
    },
  )

  const summary = history.getSummary()
  assert.equal(summary.entries.length, 2)
  assert.equal(summary.transactionGroups.length, 2)
})

test('history manager does not merge log-only entries', () => {
  const history = createHistoryManager()

  history.pushLocalEntry(
    {
      id: 'noop-a',
      label: 'Noop A',
      forward: [],
      backward: [],
    },
    {
      commandMeta: {
        commandId: 'cmd-noop-a',
        transactionId: 'txn-noop',
        commandSource: 'user',
        issuedAt: 100,
        commandType: 'selection.set',
      },
      merge: {enabled: true},
    },
  )

  history.pushLocalEntry(
    {
      id: 'noop-b',
      label: 'Noop B',
      forward: [],
      backward: [],
    },
    {
      commandMeta: {
        commandId: 'cmd-noop-b',
        transactionId: 'txn-noop',
        commandSource: 'derived',
        issuedAt: 101,
        commandType: 'selection.set',
      },
      merge: {enabled: true},
    },
  )

  const summary = history.getSummary()
  assert.equal(summary.entries.length, 2)
  assert.equal(summary.transactionGroups.length, 1)
  assert.equal(summary.transactionGroups[0]?.entryCount, 2)
})

test('history manager respects max issued-at merge gap policy', () => {
  const history = createHistoryManager()

  history.pushLocalEntry(
    {
      id: 'gap-a',
      label: 'Gap A',
      forward: [createMovePatch('shape-1', 0, 1)],
      backward: [createMovePatch('shape-1', 1, 0)],
    },
    {
      commandMeta: {
        commandId: 'cmd-gap-a',
        transactionId: 'txn-gap',
        commandSource: 'user',
        issuedAt: 100,
        commandType: 'shape.move',
      },
      merge: {enabled: true, maxIssuedAtGapMs: 10},
    },
  )

  history.pushLocalEntry(
    {
      id: 'gap-b',
      label: 'Gap B',
      forward: [createMovePatch('shape-1', 1, 2)],
      backward: [createMovePatch('shape-1', 2, 1)],
    },
    {
      commandMeta: {
        commandId: 'cmd-gap-b',
        transactionId: 'txn-gap',
        commandSource: 'derived',
        issuedAt: 999,
        commandType: 'shape.move',
      },
      merge: {enabled: true, maxIssuedAtGapMs: 10},
    },
  )

  const summary = history.getSummary()
  assert.equal(summary.entries.length, 2)
})

test('history manager respects allowed command-type merge policy', () => {
  const history = createHistoryManager()

  history.pushLocalEntry(
    {
      id: 'allow-a',
      label: 'Allow A',
      forward: [createMovePatch('shape-1', 0, 1)],
      backward: [createMovePatch('shape-1', 1, 0)],
    },
    {
      commandMeta: {
        commandId: 'cmd-allow-a',
        transactionId: 'txn-allow',
        commandSource: 'user',
        issuedAt: 100,
        commandType: 'shape.move',
      },
      merge: {enabled: true, allowedCommandTypes: ['shape.move']},
    },
  )

  history.pushLocalEntry(
    {
      id: 'allow-b',
      label: 'Allow B',
      forward: [createMovePatch('shape-1', 1, 2)],
      backward: [createMovePatch('shape-1', 2, 1)],
    },
    {
      commandMeta: {
        commandId: 'cmd-allow-b',
        transactionId: 'txn-allow',
        commandSource: 'derived',
        issuedAt: 101,
        commandType: 'shape.resize',
      },
      merge: {enabled: true, allowedCommandTypes: ['shape.move']},
    },
  )

  const summary = history.getSummary()
  assert.equal(summary.entries.length, 2)
})
