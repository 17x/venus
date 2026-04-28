export interface CollaborationOperation {
  id: string
  type: string
  actorId: string
  payload?: Record<string, unknown>
}

export interface CollaborationState {
  connected: boolean
  actorId: string
  pendingLocalCount: number
  pendingRemoteCount: number
  lastOperationId: string | null
}

export interface CollaborationManager {
  getState: () => CollaborationState
  connect: (actorId: string) => CollaborationState
  recordLocalOperation: (operation: CollaborationOperation) => CollaborationState
  receiveRemoteOperation: (operation: CollaborationOperation) => CollaborationState
}

/**
 * Tracks collaboration transport state, not document history.
 *
 * Why:
 * - Local operations may need to be queued for transport.
 * - Remote operations may need to be counted, ordered, or acknowledged.
 *
 * Not:
 * - merge policy
 * - CRDT logic
 * - local undo/redo
 */
export function createCollaborationManager(): CollaborationManager {
  let state: CollaborationState = {
    connected: false,
    actorId: 'local-user',
    pendingLocalCount: 0,
    pendingRemoteCount: 0,
    lastOperationId: null,
  }

  return {
    getState() {
      return { ...state }
    },
    connect(actorId) {
      state = {
        ...state,
        connected: true,
        actorId,
      }
      return { ...state }
    },
    recordLocalOperation(operation) {
      state = {
        ...state,
        pendingLocalCount: state.pendingLocalCount + 1,
        lastOperationId: operation.id,
      }
      return { ...state }
    },
    receiveRemoteOperation(operation) {
      state = {
        ...state,
        pendingRemoteCount: state.pendingRemoteCount + 1,
        lastOperationId: operation.id,
      }
      return { ...state }
    },
  }
}
