/**
 * Stores command session lifecycle status values.
 */
export type CommandSessionStatus = 'draft' | 'committed' | 'cancelled'

/**
 * Defines generic command session runtime contract.
 */
export interface CommandSession<
  TCommandType extends string = string,
  TPayload = unknown,
> {
  /** Stores stable command session id. */
  id: string
  /** Stores command/session type identifier. */
  type: TCommandType
  /** Stores session start timestamp. */
  startedAt: number
  /** Stores latest session update timestamp. */
  updatedAt: number
  /** Stores lifecycle status. */
  status: CommandSessionStatus
  /** Stores product-defined command payload. */
  payload?: TPayload
}

/**
 * Creates a draft command session baseline.
 */
export function createCommandSession<TCommandType extends string, TPayload = unknown>(input: {
  /** Stores stable command session id. */
  id: string
  /** Stores command/session type identifier. */
  type: TCommandType
  /** Stores session start timestamp. */
  startedAt: number
  /** Stores optional payload. */
  payload?: TPayload
}): CommandSession<TCommandType, TPayload> {
  return {
    id: input.id,
    type: input.type,
    startedAt: input.startedAt,
    updatedAt: input.startedAt,
    status: 'draft',
    payload: input.payload,
  }
}

