import type {HistorySummary} from '../../runtime/worker/index.ts'
import type {HistoryNodeLike} from '../useEditorRuntime/types.ts'

/**
 * Projects runtime history summary entries into UI history rows.
 * @param history Runtime history summary snapshot.
 */
export function projectHistorySummaryToHistoryNodes(history: HistorySummary): HistoryNodeLike[] {
  const transactionByEntryId = new Map<string, HistoryNodeLike['data']['transaction']>()

  history.transactionGroups.forEach((group) => {
    group.entryIds.forEach((entryId, groupIndex) => {
      transactionByEntryId.set(entryId, {
        transactionId: group.transactionId,
        source: group.source,
        entryCount: group.entryCount,
        indexInGroup: groupIndex + 1,
      })
    })
  })

  return history.entries.map((entry, index, entries) => {
    const transaction = transactionByEntryId.get(entry.id)
    return createHistoryNodeLikeEntry({
      label: entry.label,
      index,
      entries,
      transaction,
    })
  })
}

/**
 * Creates one history-node row projection with neighbor linkage.
 * @param input Node creation input.
 */
function createHistoryNodeLikeEntry(input: {
  label: string
  index: number
  entries: HistorySummary['entries']
  transaction?: HistoryNodeLike['data']['transaction']
}): HistoryNodeLike {
  return {
    id: input.index,
    prev: input.index > 0
      ? createHistoryNeighborEntry(input.entries[input.index - 1].label, input.index - 1)
      : null,
    next: input.index < input.entries.length - 1
      ? createHistoryNeighborEntry(input.entries[input.index + 1].label, input.index + 1)
      : null,
    data: {
      type: input.label,
      transaction: input.transaction,
    },
    label: input.label,
  }
}

/**
 * Creates one lightweight neighbor history row.
 * @param label Neighbor label.
 * @param id Neighbor id.
 */
function createHistoryNeighborEntry(label: string, id: number): HistoryNodeLike {
  return {
    id,
    prev: null,
    next: null,
    data: {type: label},
    label,
  }
}
