export interface SeededRandom {
  next(): number
  nextInt(minInclusive: number, maxExclusive: number): number
  pick<T>(items: readonly T[]): T
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = normalizeSeed(seed)

  const next = () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const nextInt = (minInclusive: number, maxExclusive: number) => {
    if (maxExclusive <= minInclusive) {
      return minInclusive
    }
    const value = next()
    return minInclusive + Math.floor(value * (maxExclusive - minInclusive))
  }

  const pick = <T>(items: readonly T[]) => {
    if (items.length === 0) {
      throw new Error('cannot pick from empty array')
    }

    return items[nextInt(0, items.length)]
  }

  return {
    next,
    nextInt,
    pick,
  }
}

function normalizeSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    return 0x12345678
  }

  const normalized = Math.abs(Math.floor(seed))
  return normalized === 0 ? 0x12345678 : normalized >>> 0
}
