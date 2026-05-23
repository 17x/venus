import assert from 'node:assert/strict'
import test from 'node:test'

import {projectHistorySummaryToHistoryNodes} from '../../../product/editorRuntimeHelpers/historyPanelProjection.ts'
import type {HistorySummary} from '../../../runtime/worker/index.ts'

/**
 * Creates one history summary fixture that contains mixed transaction groups.
 */
function createHistorySummaryFixture(): HistorySummary {
  return {
    entries: [
      {id: 'l1', label: 'move', source: 'local'},
      {id: 'l2', label: 'resize', source: 'local'},
      {id: 'r1', label: 'remote:sync', source: 'remote'},
    ],
    transactionGroups: [
      {
        transactionId: 'txn-local-a',
        source: 'local',
        entryIds: ['l1', 'l2'],
        label: 'move',
        entryCount: 2,
        startIssuedAt: 100,
        endIssuedAt: 101,
      },
      {
        transactionId: 'remote:r1',
        source: 'remote',
        entryIds: ['r1'],
        label: 'remote:sync',
        entryCount: 1,
        startIssuedAt: 102,
        endIssuedAt: 102,
      },
    ],
    cursor: 1,
    canUndo: true,
    canRedo: false,
    recoveryReplay: {
      maxEntries: 20,
      localOnly: {
        mode: 'local-only',
        entries: [],
      },
      merged: {
        mode: 'merged',
        entries: [],
      },
    },
  }
}

test('history panel projection attaches transaction-group metadata per row', () => {
  const historyItems = projectHistorySummaryToHistoryNodes(createHistorySummaryFixture())

  assert.equal(historyItems.length, 3)

  assert.deepEqual(historyItems[0]?.data.transaction, {
    transactionId: 'txn-local-a',
    source: 'local',
    entryCount: 2,
    indexInGroup: 1,
  })

  assert.deepEqual(historyItems[1]?.data.transaction, {
    transactionId: 'txn-local-a',
    source: 'local',
    entryCount: 2,
    indexInGroup: 2,
  })

  assert.deepEqual(historyItems[2]?.data.transaction, {
    transactionId: 'remote:r1',
    source: 'remote',
    entryCount: 1,
    indexInGroup: 1,
  })
})

test('history panel projection keeps transaction metadata optional for unknown entries', () => {
  const historyItems = projectHistorySummaryToHistoryNodes({
    entries: [{id: 'l1', label: 'move', source: 'local'}],
    transactionGroups: [],
    cursor: 0,
    canUndo: false,
    canRedo: false,
    recoveryReplay: {
      maxEntries: 20,
      localOnly: {
        mode: 'local-only',
        entries: [],
      },
      merged: {
        mode: 'merged',
        entries: [],
      },
    },
  })

  assert.equal(historyItems.length, 1)
  assert.equal(historyItems[0]?.data.transaction, undefined)
})
