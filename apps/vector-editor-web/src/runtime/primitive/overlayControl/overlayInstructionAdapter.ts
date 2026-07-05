import type {
  ControlHitArea,
  OverlayControl,
  OverlayModel,
} from '@venus/editor-primitive'
import {
  closePolylinePoints,
  rectBoundsToPolyline,
} from '@venus/engine'
import type {
  RuntimeOverlayInstruction,
  RuntimeOverlayLayerId,
} from '../../overlay/index.ts'
import {RUNTIME_OVERLAY_HIT_REGION} from '../../overlay/index.ts'

/**
 * Defines style-token mapping bridge from primitive to vector overlay style.
 *
 * Per docs/task/overlay.md §3.4 controls carry semantic style tokens; the
 * vector layer is the one that resolves tokens to concrete colors so theme
 * changes only require changes here.
 */
export interface OverlayInstructionStyleResolver {
  /** Resolves render style for a control kind/style token combination. */
  resolveControlStyle?: (control: OverlayControl) => RuntimeOverlayInstruction['style'] | undefined
}

/**
 * Defines layer-routing options for instruction adapter outputs.
 */
const DEFAULT_CONTROL_LAYER: RuntimeOverlayLayerId = 'overlay.handles'
const SELECTED_LAYER: RuntimeOverlayLayerId = 'overlay.selection'
const HOVER_LAYER: RuntimeOverlayLayerId = 'overlay.hover'
const MARQUEE_LAYER: RuntimeOverlayLayerId = 'overlay.marquee'

/**
 * Converts a primitive OverlayModel into RuntimeOverlayInstruction[] consumed
 * by the existing engine overlay drawing path.
 *
 * Only geometric primitives expressible via existing RuntimeOverlayInstruction
 * primitives are emitted (line/polyline/handle/arc-sector). Custom render
 * descriptors should be expressed via dedicated render bridges instead of
 * routed through this adapter.
 */
export function adaptOverlayModelToInstructions(
  model: OverlayModel,
  resolver?: OverlayInstructionStyleResolver,
): RuntimeOverlayInstruction[] {
  const instructions: RuntimeOverlayInstruction[] = []

  // Hover outline is the lowest-priority layer; emitted first.
  if (model.hoverOutline) {
    const hover = model.hoverOutline
    if (hover.geometry.kind === 'polyline') {
      instructions.push({
        id: `hover-bounds:${hover.targetId}`,
        layerId: HOVER_LAYER,
        primitive: 'polyline',
        coordinate: 'world',
        points: closePolylinePoints(hover.geometry.points),
        style: {strokeColor: 'rgba(14, 165, 233, 0.9)', strokeWidth: 1, nonScalingStroke: true},
        hitRegion: RUNTIME_OVERLAY_HIT_REGION.hoverBounds,
        cursor: {type: 'move'},
      })
    } else if (hover.geometry.kind === 'rect') {
      instructions.push({
        id: `hover-bounds:${hover.targetId}`,
        layerId: HOVER_LAYER,
        primitive: 'polyline',
        coordinate: 'world',
        points: rectBoundsToPolyline(hover.geometry),
        style: {strokeColor: 'rgba(14, 165, 233, 0.9)', strokeWidth: 1, nonScalingStroke: true},
        hitRegion: RUNTIME_OVERLAY_HIT_REGION.hoverBounds,
        cursor: {type: 'move'},
      })
    } else if (hover.geometry.kind === 'rotated-rect') {
      instructions.push({
        id: `hover-bounds:${hover.targetId}`,
        layerId: HOVER_LAYER,
        primitive: 'polyline',
        coordinate: 'world',
        points: closePolylinePoints(hover.geometry.corners),
        style: {strokeColor: 'rgba(14, 165, 233, 0.9)', strokeWidth: 1, nonScalingStroke: true},
        hitRegion: RUNTIME_OVERLAY_HIT_REGION.hoverBounds,
        cursor: {type: 'move'},
      })
    }
  }

  // Selection box (drag marquee) drawn before selected marquee handles.
  if (model.selectionBox) {
    instructions.push({
      id: 'marquee-bounds',
      layerId: MARQUEE_LAYER,
      primitive: 'polyline',
      coordinate: 'world',
      points: rectBoundsToPolyline(model.selectionBox),
      style: {
        strokeColor: 'rgba(37, 99, 235, 0.95)',
        strokeWidth: 1,
        fillColor: 'rgba(37, 99, 235, 0.12)',
      },
      cursor: {type: 'crosshair'},
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.marqueeBounds,
    })
  }

  // Selected marquee outline (rotated polygon or rect ring).
  if (model.selectedMarquee) {
    const geometry = model.selectedMarquee.geometry
    const points = geometry.kind === 'rotated'
      ? closePolylinePoints(geometry.corners)
      : rectBoundsToPolyline(geometry)
    instructions.push({
      id: 'selection-bounds',
      layerId: SELECTED_LAYER,
      primitive: 'polyline',
      coordinate: 'world',
      points,
      style: {strokeColor: '#2563eb', strokeWidth: 1, nonScalingStroke: true},
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.selectionBounds,
    })
  }

  // Marquee controls (resize/rotate/move) plus extra element-specific controls.
  for (const control of [
    ...(model.selectedMarquee?.controls ?? []),
    ...model.controls,
  ]) {
    const adapted = adaptControlToInstruction(control, resolver)
    if (adapted) {
      instructions.push(adapted)
    }
  }

  return instructions
}

/**
 * Adapts a single OverlayControl into one RuntimeOverlayInstruction by
 * sampling its hit area as a renderable primitive.
 *
 * AI-TEMP: hit-area-derived rendering is a stop-gap until controls supply
 * `render` descriptors directly via overlay.md §17.4; remove when overlay
 * descriptors are wired end-to-end. ref docs/task/overlay.md
 */
function adaptControlToInstruction(
  control: OverlayControl,
  resolver?: OverlayInstructionStyleResolver,
): RuntimeOverlayInstruction | null {
  const customStyle = resolver?.resolveControlStyle?.(control)
  const hitArea = control.hitArea

  switch (hitArea.kind) {
    case 'point':
      // Render marquee resize corners as square markers per product affordance.
      if (control.kind === 'resize-corner') {
        const size = Math.max(1, hitArea.tolerance)
        const half = size / 2
        return {
          id: `control:${control.id}`,
          layerId: DEFAULT_CONTROL_LAYER,
          primitive: 'polyline',
          coordinate: 'world',
          points: [
            {x: hitArea.center.x - half, y: hitArea.center.y - half},
            {x: hitArea.center.x + half, y: hitArea.center.y - half},
            {x: hitArea.center.x + half, y: hitArea.center.y + half},
            {x: hitArea.center.x - half, y: hitArea.center.y + half},
            {x: hitArea.center.x - half, y: hitArea.center.y - half},
          ],
          style: customStyle ?? {
            strokeColor: '#2563eb',
            fillColor: '#ffffff',
            strokeWidth: 1,
            nonScalingStroke: true,
          },
          cursor: control.cursor,
        }
      }

      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'handle',
        coordinate: 'world',
        points: [hitArea.center],
        style: customStyle ?? {
          strokeColor: '#2563eb',
          fillColor: '#ffffff',
          strokeWidth: 1,
          nonScalingStroke: true,
        },
        cursor: control.cursor,
      }
    case 'segment':
      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'line',
        coordinate: 'world',
        points: [hitArea.from, hitArea.to],
        // Edge resize controls are usually invisible; suppress style unless caller overrides.
        style: customStyle ?? {strokeColor: 'transparent', strokeWidth: 0},
        cursor: control.cursor,
      }
    case 'arc-sector':
      // Keep arc radii/angles attached even when caller provides custom style tokens.
      // Without these fields the engine cannot render arc-sector controls.
      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'arc',
        coordinate: 'world',
        points: [hitArea.center],
        style: {
          ...(customStyle ?? {
          // Rotate sectors are normally invisible; render only when caller supplies style.
          strokeColor: 'transparent',
          strokeWidth: 0,
          }),
          startAngleDegrees: hitArea.startAngleDegrees,
          endAngleDegrees: hitArea.endAngleDegrees,
          innerRadius: hitArea.innerRadius,
          outerRadius: hitArea.outerRadius,
        },
        cursor: control.cursor,
      }
    case 'rotated-rect':
      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'polyline',
        coordinate: 'world',
        points: closePolylinePoints(hitArea.corners),
        // Rotated-rect controls (move-body) are interaction-only; no stroke unless overridden.
        style: customStyle ?? {strokeColor: 'transparent', strokeWidth: 0},
        cursor: control.cursor,
      }
    case 'rect':
      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'polyline',
        coordinate: 'world',
        points: rectBoundsToPolyline(hitArea),
        style: customStyle ?? {strokeColor: 'transparent', strokeWidth: 0},
        cursor: control.cursor,
      }
    case 'circle':
      return {
        id: `control:${control.id}`,
        layerId: DEFAULT_CONTROL_LAYER,
        primitive: 'handle',
        coordinate: 'world',
        points: [hitArea.center],
        style: customStyle ?? {strokeColor: '#2563eb', fillColor: '#ffffff', strokeWidth: 1, pointRadius: hitArea.radius},
        cursor: control.cursor,
      }
    case 'polyline':
    case 'polygon':
      return adaptPolygonalControl(control, hitArea, customStyle)
    case 'path':
    case 'custom':
      // Path/custom hit areas have no canonical render; caller-supplied descriptors are required.
      return null
    default:
      return null
  }
}

// Adapts polyline/polygon hit areas into a polyline runtime instruction.
function adaptPolygonalControl(
  control: OverlayControl,
  hitArea: Extract<ControlHitArea, {kind: 'polyline' | 'polygon'}>,
  customStyle: RuntimeOverlayInstruction['style'] | undefined,
): RuntimeOverlayInstruction | null {
  if (hitArea.points.length === 0) {
    return null
  }
  const closed = hitArea.kind === 'polygon'
  return {
    id: `control:${control.id}`,
    layerId: DEFAULT_CONTROL_LAYER,
    primitive: 'polyline',
    coordinate: 'world',
    points: closed ? closePolylinePoints(hitArea.points) : [...hitArea.points],
    style: customStyle ?? {strokeColor: 'transparent', strokeWidth: 0},
    cursor: control.cursor,
  }
}
