import type {HistoryEntry, HistoryPatch} from '../../history.ts'

/**
 * Produces one log-only history entry when a command has no reversible mutation.
 * @param id Stable command identifier.
 * @param label Human-readable label for history timeline.
 */
export function createLogOnlyEntry(id: string, label: string): Omit<HistoryEntry, 'source'> {
  return {id, label, forward: [], backward: []}
}

/**
 * Inverts one forward patch list into backward order for local undo generation.
 * @param forward Forward patches emitted for one command.
 */
export function invertHistoryPatches(forward: HistoryPatch[]): HistoryPatch[] {
  const backward: HistoryPatch[] = []

  forward.slice().reverse().forEach((patch) => {
    if (patch.type === 'set-group-children') {
      backward.push({
        type: 'set-group-children',
        groupId: patch.groupId,
        prevChildIds: patch.nextChildIds,
        nextChildIds: patch.prevChildIds,
      })
      return
    }

    if (patch.type === 'set-shape-parent') {
      backward.push({
        type: 'set-shape-parent',
        shapeId: patch.shapeId,
        prevParentId: patch.nextParentId,
        nextParentId: patch.prevParentId,
      })
      return
    }

    if (patch.type === 'insert-shape') {
      backward.push({
        type: 'remove-shape',
        index: patch.index,
        shape: patch.shape,
      })
      return
    }

    if (patch.type === 'remove-shape') {
      backward.push({
        type: 'insert-shape',
        index: patch.index,
        shape: patch.shape,
      })
      return
    }

    if (patch.type === 'reorder-shape') {
      backward.push({
        type: 'reorder-shape',
        shapeId: patch.shapeId,
        fromIndex: patch.toIndex,
        toIndex: patch.fromIndex,
      })
    }
  })

  return backward
}
