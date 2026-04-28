/**
 * Defines generic bridge used by operation runtime to preview/commit/cancel patches.
 */
export interface OperationCommandBridge<TPatch> {
  /** Applies transient patch while operation is still in preview mode. */
  preview: (patch: TPatch) => void
  /** Applies final patch and closes operation session. */
  commit: (patch: TPatch) => void
  /** Cancels active preview session and drops pending state. */
  cancel: () => void
}

/**
 * Stores command session bridge status values.
 */
export type OperationCommandSessionStatus = 'previewing' | 'committed' | 'cancelled'

/**
 * Defines stateful command session bridge contract for diagnostics and tracing.
 */
export interface OperationCommandSession<TPatch> extends OperationCommandBridge<TPatch> {
  /** Stores stable session id for tracing and correlation. */
  id: string
  /** Stores current command bridge status. */
  status: OperationCommandSessionStatus
}

/**
 * Creates in-memory command session bridge for package-level tests and adapters.
 */
export function createOperationCommandSession<TPatch>(
  id: string,
  handlers: OperationCommandBridge<TPatch>,
): OperationCommandSession<TPatch> {
  let status: OperationCommandSessionStatus = 'previewing'

  return {
    id,
    get status() {
      return status
    },
    preview: (patch) => {
      // Ignore previews after terminal state to keep session semantics stable.
      if (status !== 'previewing') {
        return
      }
      handlers.preview(patch)
    },
    commit: (patch) => {
      if (status !== 'previewing') {
        return
      }
      handlers.commit(patch)
      status = 'committed'
    },
    cancel: () => {
      if (status !== 'previewing') {
        return
      }
      handlers.cancel()
      status = 'cancelled'
    },
  }
}

