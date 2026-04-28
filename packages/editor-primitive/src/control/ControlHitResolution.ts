import type {Point2D} from '@venus/lib'
import type {ControlHitAreaTesters} from './HitAreaTesters.ts'
import {isPointerInsideControlHitArea} from './HitAreaTesters.ts'
import type {OverlayControl} from './OverlayControl.ts'

/**
 * Defines hit-resolution input for overlay control resolvers.
 */
export interface ResolveOverlayControlHitOptions<TDragPayload = unknown> {
  /** Stores pointer position in the same coordinate space as control hit areas. */
  pointer: Point2D
  /** Stores controls participating in this hit pass. */
  controls: readonly OverlayControl<TDragPayload>[]
  /** Stores optional path/custom testers forwarded to hit-area dispatcher. */
  testers?: ControlHitAreaTesters
}

/**
 * Defines hit-resolution result describing the winning control.
 */
export interface OverlayControlHitResult<TDragPayload = unknown> {
  /** Stores winning control. */
  control: OverlayControl<TDragPayload>
  /** Stores all candidates that hit, ordered by descending priority. */
  candidates: OverlayControl<TDragPayload>[]
}

/**
 * Resolves the highest-priority overlay control hit per docs/task/overlay.md §16.
 *
 * The resolver collects every control whose hit area contains the pointer and
 * picks the highest priority. Ties resolve in registration order so callers
 * can rely on deterministic resolution when adding controls in a specific
 * sequence (e.g. n/e/s/w edges).
 */
export function resolveOverlayControlHit<TDragPayload = unknown>(
  options: ResolveOverlayControlHitOptions<TDragPayload>,
): OverlayControlHitResult<TDragPayload> | null {
  const candidates: OverlayControl<TDragPayload>[] = []
  for (const control of options.controls) {
    if (control.disabled) {
      continue
    }
    if (isPointerInsideControlHitArea(options.pointer, control.hitArea, options.testers)) {
      candidates.push(control)
    }
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((left, right) => right.priority - left.priority)
  return {
    control: candidates[0],
    candidates,
  }
}

/**
 * Resolves all overlay controls that hit the pointer, ordered by priority.
 *
 * Useful for diagnostic/debug overlays that want to surface a hit chain
 * (per docs/task/overlay.md §13.3 nested-group hit chain semantics).
 */
export function collectOverlayControlHitChain<TDragPayload = unknown>(
  options: ResolveOverlayControlHitOptions<TDragPayload>,
): OverlayControl<TDragPayload>[] {
  const result = resolveOverlayControlHit(options)
  return result ? result.candidates : []
}
