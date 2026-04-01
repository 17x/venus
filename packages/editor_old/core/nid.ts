/**
 * Simple, secure nanoid-like function for generating unique element IDs
 * inside a file. Suitable for up to tens of thousands of elements per file.
 *
 * Uses `crypto.getRandomValues` for strong randomness.
 *
 * @param size Number of characters in the ID (default: 6)
 * @returns A unique, short ID string (e.g., "aZ9x3B")
 */
export const nid = (size: number = 6): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const randomValues = new Uint8Array(size)
  crypto.getRandomValues(randomValues)

  return Array.from(randomValues, (v) => chars[v % chars.length]).join('')
}

export default nid