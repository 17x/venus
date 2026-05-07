import type {Point2D} from '@venus/lib'
import type {OverlayControl} from '../control/OverlayControl.ts'
import type {ControlHitAreaTesters} from '../control/HitAreaTesters.ts'
import {resolveOverlayControlHit, type OverlayControlHitResult} from '../control/ControlHitResolution.ts'
import type {OverlayModel} from './OverlayModel.ts'

/**
 * Defines hit-resolution input that operates on a full overlay model.
 *
 * Per docs/task/overlay.md §16, pointer-move resolution should collect every
 * candidate control across the marquee, element-specific controls, and any
 * hover-outline-derived target, then pick by priority.
 */
export interface ResolveOverlayModelHitOptions<TDragPayload = unknown> {
  /** Stores pointer in coordinate space matching control hit areas. */
  pointer: Point2D
  /** Stores overlay model to query. */
  model: OverlayModel<TDragPayload>
  /** Stores optional path/custom testers forwarded to hit resolution. */
  testers?: ControlHitAreaTesters
}

/**
 * Returns the union of all overlay controls owned by the overlay model.
 *
 * The order is intentional: marquee controls are listed before element-
 * specific controls so registration ordering acts as a tie-breaker when two
 * controls share a priority value.
 */
export function collectOverlayModelControls<TDragPayload = unknown>(
  model: OverlayModel<TDragPayload>,
): OverlayControl<TDragPayload>[] {
  const marqueeControls = model.selectedMarquee?.controls ?? []
  // Marquee controls precede generic extras so resize/rotate keep stable ordering.
  return [...marqueeControls, ...model.controls]
}

/**
 * Resolves the highest-priority hit for the supplied pointer/model pair.
 */
export function resolveOverlayModelHit<TDragPayload = unknown>(
  options: ResolveOverlayModelHitOptions<TDragPayload>,
): OverlayControlHitResult<TDragPayload> | null {
  const controls = collectOverlayModelControls(options.model)
  if (controls.length === 0) {
    return null
  }
  return resolveOverlayControlHit({
    pointer: options.pointer,
    controls,
    testers: options.testers,
  })
}
