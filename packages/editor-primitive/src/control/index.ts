export type {
  ArcSectorHitArea,
  CircleHitArea,
  ControlHitArea,
  ControlHitAreaKind,
  CustomHitArea,
  PathHitArea,
  PointHitArea,
  PolygonHitArea,
  PolylineHitArea,
  RectHitArea,
  RotatedRectHitArea,
  SegmentHitArea,
} from './HitArea.ts'

export type {ControlHitAreaTesters} from './HitAreaTesters.ts'
export {
  distancePointToSegment,
  isPointerInsideControlHitArea,
  isPointInsidePolygon,
} from './HitAreaTesters.ts'

export type {
  ControlRenderDescriptor,
  ControlRenderDescriptorKind,
  ControlRenderStyle,
} from './RenderDescriptor.ts'

export {CONTROL_PRIORITY, resolveControlPriority} from './ControlPriority.ts'
export type {ControlPriority, ControlPriorityToken} from './ControlPriority.ts'

export type {
  ControlDragBehavior,
  ControlDragBehaviorKind,
} from './DragBehavior.ts'

export type {OverlayControl, OverlayControlKind} from './OverlayControl.ts'

export type {
  OverlayControlHitResult,
  ResolveOverlayControlHitOptions,
} from './ControlHitResolution.ts'
export {
  collectOverlayControlHitChain,
  resolveOverlayControlHit,
} from './ControlHitResolution.ts'
