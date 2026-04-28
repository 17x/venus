/**
 * Defines configurable thresholds for gesture recognition.
 */
export interface GesturePolicy {
  /** Stores drag threshold in pixels before click transitions to drag. */
  dragThreshold: number
  /** Stores max movement still considered a click. */
  clickTolerance: number
  /** Stores max interval between clicks for double-click recognition. */
  doubleClickIntervalMs: number
}

/**
 * Stores baseline gesture policy used when callers do not provide custom values.
 */
export const DEFAULT_GESTURE_POLICY: GesturePolicy = {
  dragThreshold: 4,
  clickTolerance: 3,
  doubleClickIntervalMs: 300,
}

/**
 * Resolves caller gesture policy over default values.
 */
export function resolveGesturePolicy(overrides?: Partial<GesturePolicy>): GesturePolicy {
  return {
    ...DEFAULT_GESTURE_POLICY,
    ...overrides,
  }
}

