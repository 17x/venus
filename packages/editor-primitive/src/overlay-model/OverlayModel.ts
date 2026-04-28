import type {OverlayControl} from '../control/OverlayControl.ts'
import type {ControlRenderDescriptor} from '../control/RenderDescriptor.ts'
import type {HoverOutline} from './HoverOutline.ts'
import type {SelectedMarquee} from './SelectedMarquee.ts'
import type {SelectionBox} from './SelectionBox.ts'

/**
 * Defines snap guide payload accompanying overlay model output.
 *
 * Guides are runtime-policy data and do not own controls; they exist so the
 * overlay model can ship its renderable layout in one bundle.
 */
export interface OverlayModelGuide {
  /** Stores stable guide id. */
  id: string
  /** Stores axis the guide aligns to. */
  axis: 'x' | 'y'
  /** Stores guide value in world coordinates. */
  value: number
  /** Stores render descriptors for the guide. */
  render?: ControlRenderDescriptor[]
}

/**
 * Defines transform-preview payload (e.g. dashed bounds) for an in-flight
 * resize/rotate/move session.
 */
export interface OverlayModelTransformPreview {
  /** Stores element ids participating in the preview. */
  shapeIds: string[]
  /** Stores render descriptors for the preview. */
  render?: ControlRenderDescriptor[]
}

/**
 * Defines the unified overlay model emitted by editor-primitive.
 *
 * Per docs/task/overlay.md §15 this is what `editor-primitive` produces and
 * the engine consumes to draw overlays. The vector app maps style tokens to
 * theme colors at the bridge boundary.
 */
export interface OverlayModel<TDragPayload = unknown> {
  /** Stores monotonically increasing version for change detection. */
  version: number
  /** Stores hover outline payload, when one element is hovered. */
  hoverOutline?: HoverOutline
  /** Stores selected marquee payload, when there is at least one selection. */
  selectedMarquee?: SelectedMarquee<TDragPayload>
  /** Stores selection box payload during marquee-select drag. */
  selectionBox?: SelectionBox
  /** Stores element-specific or extra overlay controls. */
  controls: OverlayControl<TDragPayload>[]
  /** Stores transform preview payload for in-flight transforms. */
  transformPreview?: OverlayModelTransformPreview
  /** Stores snap-guide payloads. */
  guides?: OverlayModelGuide[]
}

/**
 * Returns an empty overlay model baseline with version 0.
 */
export function createEmptyOverlayModel<TDragPayload = unknown>(): OverlayModel<TDragPayload> {
  return {
    version: 0,
    controls: [],
  }
}
