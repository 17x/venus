/**
 * Throws when a required condition is not met.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (condition) {
    return
  }

  throw new Error(message)
}

/**
 * Throws for unreachable code paths in exhaustive switch statements.
 */
export function assertNever(value: never, message: string = 'unexpected value'): never {
  // Include value in the error payload to support quick debugging in integration logs.
  throw new Error(`${message}: ${String(value)}`)
}

