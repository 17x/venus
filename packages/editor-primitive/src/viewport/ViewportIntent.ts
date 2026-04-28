import type {Point2D} from '@venus/lib'

/**
 * Defines viewport intent emitted by interaction runtime reducers.
 */
export type ViewportIntent =
  // Emits relative pan intent in screen-space deltas.
  | {type: 'pan-by'; dx: number; dy: number}
  // Emits zoom intent anchored at one world point.
  | {type: 'zoom-at'; scaleDelta: number; anchor: Point2D}
  // Emits fit-selection request intent.
  | {type: 'fit-selection'}
  // Emits fit-content request intent.
  | {type: 'fit-content'}
  // Emits explicit no-op viewport intent.
  | {type: 'none'}

