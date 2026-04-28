/**
 * Returns an existing map value or creates one lazily when absent.
 */
export function ensureMapValue<TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey,
  createValue: () => TValue,
): TValue {
  const current = map.get(key)
  if (typeof current !== 'undefined') {
    return current
  }

  const created = createValue()
  map.set(key, created)
  return created
}

/**
 * Adds or removes a set member based on the requested active state.
 */
export function setMembership<TValue>(
  set: Set<TValue>,
  value: TValue,
  active: boolean,
): void {
  // Use explicit branch handling to keep intent clear at call sites.
  if (active) {
    set.add(value)
    return
  }

  set.delete(value)
}

