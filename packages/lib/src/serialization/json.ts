/**
 * Parses JSON text and returns null when parsing fails.
 */
export function parseJsonSafely<TValue>(input: string): TValue | null {
  try {
    return JSON.parse(input) as TValue
  } catch {
    // Preserve a null fallback for callers that treat malformed payloads as non-fatal.
    return null
  }
}

/**
 * Stringifies JSON and returns null when serialization fails.
 */
export function stringifyJsonSafely(input: unknown): string | null {
  try {
    return JSON.stringify(input)
  } catch {
    // Preserve a null fallback for cyclic objects and unsupported values.
    return null
  }
}

