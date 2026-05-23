import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildHistoryTransactionBadgeLabel,
  buildHistoryTransactionTooltipSuffix,
} from '../../../views/historyPanel/historyPanelTransactionPresentation.ts'
import type {HistoryNodeTransactionMeta} from '../../../product/useEditorRuntime/types.ts'

/**
 * Creates one deterministic transaction metadata fixture used by panel presentation tests.
 */
function createTransactionMetaFixture(overrides: Partial<HistoryNodeTransactionMeta> = {}): HistoryNodeTransactionMeta {
  return {
    transactionId: 'txn-1',
    source: 'local',
    entryCount: 3,
    indexInGroup: 2,
    ...overrides,
  }
}

test('history panel transaction badge only appears for multi-entry groups', () => {
  assert.equal(buildHistoryTransactionBadgeLabel(undefined), null)
  assert.equal(buildHistoryTransactionBadgeLabel(createTransactionMetaFixture({entryCount: 1, indexInGroup: 1})), null)
  assert.equal(buildHistoryTransactionBadgeLabel(createTransactionMetaFixture()), 'T 2/3')
})

test('history panel transaction tooltip suffix keeps transaction identity and progress', () => {
  assert.equal(buildHistoryTransactionTooltipSuffix(undefined), '')
  assert.equal(
    buildHistoryTransactionTooltipSuffix(createTransactionMetaFixture({transactionId: 'txn-alpha', indexInGroup: 1, entryCount: 2})),
    'Transaction txn-alpha (1/2)',
  )
})
