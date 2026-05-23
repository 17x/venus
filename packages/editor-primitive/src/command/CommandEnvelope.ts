/**
 * Declares command source classes for command-envelope tracing.
 */
export type CommandEnvelopeSource = 'user' | 'derived' | 'system'

/**
 * Declares one normalized command envelope used by dispatch bridges and diagnostics.
 */
export interface CommandEnvelope<TCommand, TSource extends string = CommandEnvelopeSource> {
  /** Stores stable command id for one dispatch emission. */
  id: string
  /** Stores source class for command provenance diagnostics. */
  source: TSource
  /** Stores transaction id shared by one logical command chain. */
  transactionId: string
  /** Stores command issue timestamp in milliseconds. */
  issuedAt: number
  /** Stores domain command payload passed to runtime/worker adapters. */
  command: TCommand
}

/**
 * Declares input payload required to create one command envelope.
 */
export interface CreateCommandEnvelopeInput<TCommand, TSource extends string = CommandEnvelopeSource> {
  /** Stores stable command id for one dispatch emission. */
  id: string
  /** Stores source class for command provenance diagnostics. */
  source: TSource
  /** Stores transaction id shared by one logical command chain. */
  transactionId: string
  /** Stores command issue timestamp in milliseconds. */
  issuedAt: number
  /** Stores domain command payload passed to runtime/worker adapters. */
  command: TCommand
}

/**
 * Creates one immutable command envelope for command dispatch tracing.
 * @param input Envelope input payload.
 */
export function createCommandEnvelope<TCommand, TSource extends string = CommandEnvelopeSource>(
  input: CreateCommandEnvelopeInput<TCommand, TSource>,
): CommandEnvelope<TCommand, TSource> {
  return {
    id: input.id,
    source: input.source,
    transactionId: input.transactionId,
    issuedAt: input.issuedAt,
    command: input.command,
  }
}

/**
 * Creates one monotonic command-id factory scoped to the caller runtime.
 * @param prefix Stable id prefix used by emitted command ids.
 */
export function createCommandIdFactory(prefix: string): () => string {
  let sequence = 0

  return () => {
    sequence += 1
    return `${prefix}-${sequence}`
  }
}

/**
 * Creates one monotonic transaction-id factory scoped to the caller runtime.
 * @param prefix Stable id prefix used by emitted transaction ids.
 */
export function createCommandTransactionIdFactory(prefix: string): () => string {
  let sequence = 0

  return () => {
    sequence += 1
    return `${prefix}-${sequence}`
  }
}
