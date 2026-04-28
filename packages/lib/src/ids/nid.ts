/**
 * Defines the allowed character set for short non-cryptographic IDs.
 */
export const NID_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Creates a short random identifier for UI-local entities.
 */
export function createNid(
  size: number = 6,
  random: () => number = Math.random,
): string {
  // Clamp invalid sizes to zero to keep callers safe during migration.
  const safeSize = Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0
  let result = ''

  // Resolve one pseudo-random character at a time to preserve deterministic tests.
  for (let index = 0; index < safeSize; index += 1) {
    const nextIndex = Math.floor(random() * NID_CHARSET.length)
    result += NID_CHARSET[nextIndex] ?? NID_CHARSET[0]
  }

  return result
}

