import type {Point2D} from '@venus/lib'
import type {ControlRenderDescriptor} from '../control/RenderDescriptor.ts'

/**
 * Defines the geometric form a hover outline takes per docs/task/overlay.md §4.1.
 *
 * Different element types produce different outline shapes (rect/ellipse/path/
 * line/group). The outline is a render-only shape; hit semantics are owned by
 * the underlying scene element, not the outline.
 */
export type HoverOutlineGeometry =
  | {kind: 'rect'; minX: number; minY: number; maxX: number; maxY: number}
  | {kind: 'rotated-rect'; corners: [Point2D, Point2D, Point2D, Point2D]}
  | {kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number}
  | {kind: 'polyline'; points: Point2D[]; closed: boolean}
  | {kind: 'segment'; from: Point2D; to: Point2D}
  | {kind: 'path'; pathId: string}

/**
 * Defines the resolved hover-outline payload feeding overlay generation.
 *
 * Hover outlines are emitted only when no higher-priority overlay (selected
 * marquee, controls) takes precedence per docs/task/overlay.md §5.
 */
export interface HoverOutline {
  /** Stores hovered scene element id. */
  targetId: string
  /** Stores resolved geometry for the outline. */
  geometry: HoverOutlineGeometry
  /** Stores render descriptors derived from geometry for engine output. */
  render?: ControlRenderDescriptor[]
  /** Stores optional debug label (e.g. element type). */
  label?: string
}
