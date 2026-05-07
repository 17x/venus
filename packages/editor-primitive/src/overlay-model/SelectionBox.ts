import type {ControlRenderDescriptor} from '../control/RenderDescriptor.ts'

/**
 * Defines the rectangular selection box drawn when the user marquee-selects
 * empty canvas space per docs/task/overlay.md §4.3.
 *
 * Selection Box is distinct from Selected Marquee: it represents pointer-drag
 * intent rather than already-selected elements.
 */
export interface SelectionBox {
  /** Stores axis-aligned min x. */
  minX: number
  /** Stores axis-aligned min y. */
  minY: number
  /** Stores axis-aligned max x. */
  maxX: number
  /** Stores axis-aligned max y. */
  maxY: number
  /** Stores render descriptors describing how the selection box is drawn. */
  render?: ControlRenderDescriptor[]
}
