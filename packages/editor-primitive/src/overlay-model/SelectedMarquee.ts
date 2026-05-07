import type {Point2D} from '@venus/lib'
import type {OverlayControl} from '../control/OverlayControl.ts'
import type {ControlRenderDescriptor} from '../control/RenderDescriptor.ts'

/**
 * Defines the marquee geometry for the currently selected element(s).
 *
 * Per docs/task/overlay.md §6 single rotated elements use rotated-rect;
 * multi-selection uses an axis-aligned union; group selection uses recursive
 * bounds. The geometry is consumed both for rendering and for control
 * placement (resize/rotate/move).
 */
export type SelectedMarqueeGeometry =
  | {
      /** Stores discriminator. */
      kind: 'axis-aligned'
      /** Stores axis-aligned min x. */
      minX: number
      /** Stores axis-aligned min y. */
      minY: number
      /** Stores axis-aligned max x. */
      maxX: number
      /** Stores axis-aligned max y. */
      maxY: number
    }
  | {
      /** Stores discriminator. */
      kind: 'rotated'
      /** Stores rotated rect four corners (CW). */
      corners: [Point2D, Point2D, Point2D, Point2D]
      /** Stores rotation degrees applied to underlying axis-aligned bounds. */
      rotationDegrees: number
      /** Stores axis-aligned source bounds for derivative math. */
      sourceBounds: {minX: number; minY: number; maxX: number; maxY: number}
    }

/**
 * Defines the selected-marquee payload feeding overlay generation.
 *
 * The marquee carries its own marquee-body control plus the resize/rotate/
 * move controls produced from its geometry. Element-specific controls are
 * appended by element adapters via the overlay model builder.
 */
export interface SelectedMarquee<TDragPayload = unknown> {
  /** Stores selected element ids covered by this marquee. */
  selectedIds: string[]
  /** Stores resolved marquee geometry. */
  geometry: SelectedMarqueeGeometry
  /** Stores render descriptors for the marquee outline. */
  render?: ControlRenderDescriptor[]
  /** Stores controls produced from the marquee geometry. */
  controls: OverlayControl<TDragPayload>[]
}
