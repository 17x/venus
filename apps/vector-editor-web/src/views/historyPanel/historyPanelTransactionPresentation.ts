import type {HistoryNodeTransactionMeta} from '../../product/useEditorRuntime/types.ts'

/**
 * Builds one transaction badge label for history row rendering.
 * @param transaction Optional transaction metadata from projected history node.
 */
export function buildHistoryTransactionBadgeLabel(
  transaction: HistoryNodeTransactionMeta | undefined,
): string | null {
  if (!transaction || transaction.entryCount <= 1) {
    return null
  }

  return `T ${transaction.indexInGroup}/${transaction.entryCount}`
}

/**
 * Builds one transaction suffix for history row tooltip rendering.
 * @param transaction Optional transaction metadata from projected history node.
 */
export function buildHistoryTransactionTooltipSuffix(
  transaction: HistoryNodeTransactionMeta | undefined,
): string {
  if (!transaction) {
    return ''
  }

  return `Transaction ${transaction.transactionId} (${transaction.indexInGroup}/${transaction.entryCount})`
}
