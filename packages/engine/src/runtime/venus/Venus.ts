import type {Engine, EngineRuntimeDiagnostics} from '../createEngine/createEngine.ts'
import type {
  EngineRect,
  EngineShadow,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeNode,
  EngineTextRun,
  EngineTextStyle,
  EngineTransform2D,
} from '../../scene/types/types.ts'
import type {EngineResourceLoader} from '../../renderer/types/index.ts'
import {resolveLeafNodeWorldBounds} from '../../scene/worldBounds/worldBounds.ts'
import {
  resolveEngineViewportState,
  type EngineCanvasViewportState,
} from '../../interaction/viewport/viewport.ts'
import {
  createVenusNodeProxy,
  type VenusNodeProxy,
} from './VenusNodeProxy.ts'
import {
  createEmptyVenusSceneSnapshot,
  createVenusAnimationController,
  createVenusCacheDiagnostics,
  createVenusDebugOverlayNodes,
  createVenusMountedEngine,
  isVenusModuleName,
  projectVenusCameraPoint,
  resolveVenusCameraFitBounds,
  resolveVenusCameraPan,
  resolveVenusCameraZoom,
  resolveVenusDetailedHits,
  resolveVenusHitTestOptions,
  resolveVenusRenderDefaults,
  unprojectVenusCameraPoint,
  DEFAULT_VENUS_FILL_COLOR,
  DEFAULT_VENUS_STROKE_COLOR,
  VENUS_DEBUG_HIT_TOLERANCE,
  VENUS_INTERNAL_SERVICE_NAMES,
  VENUS_MODULE_CATALOG,
  VENUS_MODULE_NAMES,
  createVenusHistoryController,
  type VenusHistoryController,
  type VenusInternalServiceName,
  type VenusModuleName,
  type VenusRenderDefaults,
} from './modules/index.ts'
import {
  createVenusSpatialService,
  createVenusGeometryCacheService,
  createVenusSchedulerService,
} from './modules/_infra/index.ts'

export type VenusBackend = 'canvas2d' | 'webgl' | 'auto'
export {
  isVenusModuleName,
  VENUS_INTERNAL_SERVICE_NAMES,
  VENUS_MODULE_CATALOG,
  VENUS_MODULE_NAMES,
}
export type {
  VenusInternalServiceName,
  VenusModuleCatalogEntry,
  VenusModuleCategory,
  VenusModuleName,
  VenusModuleStatus,
} from './modules/index.ts'

/** Document service exposed to installed modules without exposing private stores. */
export interface VenusDocumentService {
  snapshot(): EngineSceneSnapshot
  children(): readonly VenusNode[]
  bounds(): {x: number; y: number; width: number; height: number}
}

/** Viewport service exposed to modules that need coordinate conversion. */
export interface VenusViewportService {
  project(point: {x: number; y: number}): {x: number; y: number}
  unproject(point: {x: number; y: number}): {x: number; y: number}
}

/** Invalidation service exposed to modules that need mutation cost classification. */
export interface VenusInvalidationService {
  classify(changedProperties: readonly string[]): VenusInvalidationKind
}

/** Spatial index service providing coarse AABB-based spatial queries. */
export interface VenusSpatialService {
  /** Inserts or replaces a spatial item indexed by id. */
  upsert(id: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }): void
  /** Removes one item from the spatial index. */
  remove(id: string): void
  /** Returns all item ids whose AABB intersects the query bounds. */
  search(bounds: { minX: number; minY: number; maxX: number; maxY: number }): readonly string[]
  /** Clears all items from the index. */
  clear(): void
}

/** Multi-tier geometry cache service for hit-test and rendering. */
export interface VenusGeometryCacheService {
  /** Invalidates cached geometry for a set of node ids. */
  invalidate(ids: readonly string[]): void
  /** Returns the cached AABB for a node, or null on miss. */
  getAABB(id: string): { x: number; y: number; width: number; height: number } | null
  /** Stores a computed AABB for a node. */
  setAABB(id: string, aabb: { x: number; y: number; width: number; height: number }): void
  /** Clears the entire geometry cache. */
  clear(): void
}

/** Frame scheduler service providing coalesced rAF-based render scheduling. */
export interface VenusSchedulerService {
  /** Requests a render frame. Multiple calls in the same frame are coalesced. */
  requestRender(): void
  /** Cancels a pending render request. */
  cancelRender(): void
  /** Returns whether a render is currently scheduled. */
  isPending(): boolean
}

/** Maps registered internal service names to their typed service contracts. */
export interface VenusRegisteredServiceMap {
  document: VenusDocumentService
  viewport: VenusViewportService
  invalidation: VenusInvalidationService
  spatial: VenusSpatialService
  geometryCache: VenusGeometryCacheService
  scheduler: VenusSchedulerService
}

/** Declares one registered service name with a known public service contract. */
export type VenusRegisteredServiceName = keyof VenusRegisteredServiceMap

/** Read-only service registry passed to Venus modules during installation. */
export interface VenusServiceRegistry {
  /** Returns whether one internal service exists in this runtime. */
  has(name: VenusInternalServiceName): boolean
  /** Returns one service by name, or null when the service is not registered. */
  get<TName extends VenusRegisteredServiceName>(name: TName): VenusRegisteredServiceMap[TName] | null
  /** Returns one untyped reserved service by name, or null when the service is not registered. */
  get<TService = unknown>(name: VenusInternalServiceName): TService | null
  /** Returns one registered service or throws when the service is unavailable. */
  require<TName extends VenusRegisteredServiceName>(name: TName): VenusRegisteredServiceMap[TName]
  /** Returns one untyped reserved service or throws when the service is unavailable. */
  require<TService = unknown>(name: VenusInternalServiceName): TService
  /** Lists the internal service names currently registered in this runtime. */
  list(): readonly VenusInternalServiceName[]
}

/** Context passed once to each module installed on a Venus instance. */
export interface VenusModuleContext {
  /** The runtime instance receiving the module. */
  venus: Venus
  /** Constructor parameters for this runtime. */
  parameters: Readonly<VenusParameters>
  /** Internal foundation services exposed through stable short names. */
  services: VenusServiceRegistry
}

/** Declares an installable user-facing Venus capability module. */
export interface VenusModule {
  /** Short module name, for example `camera`, `hitTest`, or `scale`. */
  name: VenusModuleName
  /** Other user-facing modules that must already be installed. */
  dependsOn?: readonly VenusModuleName[]
  /** Internal services this module requires before installation can run. */
  requires?: readonly VenusInternalServiceName[]
  /** Installs module behavior on one Venus instance and may return a module API object. */
  install(context: VenusModuleContext): unknown
}

/**
 * Defines one Venus capability module and validates its public short name.
 * @param module Capability module definition.
 */
export function defineVenusModule(module: VenusModule): VenusModule {
  if (!isVenusModuleName(module.name)) {
    throw new Error(`Unknown Venus module "${module.name}"`)
  }

  return module
}

/** Lists public document object kinds accepted by `venus.add`. */
export const VENUS_DOCUMENT_MODEL_TYPES = [
  'rect',
  'ellipse',
  'line',
  'text',
  'group',
  'clip',
  'mask',
  'polygon',
  'path',
  'image',
] as const

/** Declares one public document object kind accepted by `venus.add`. */
export type VenusDocumentModelType = (typeof VENUS_DOCUMENT_MODEL_TYPES)[number]

/** Lists public instance methods that may appear in engine API documentation. */
export const VENUS_PUBLIC_METHOD_NAMES = [
  'add',
  'bounds',
  'children',
  'getNodeById',
  'getParentId',
  'snapshot',
  'fitBounds',
  'zoomTo',
  'panBy',
  'project',
  'unproject',
  'enableDebug',
  'inspect',
  'measureFrame',
  'mount',
  'resize',
  'render',
  'setDefaultFillColor',
  'setDefaultStrokeColor',
  'hitTest',
  'hitTestAll',
  'on',
  'off',
  'modules',
  'animate',
  'destroy',
  'update',
  'remove',
  'getLayerIndex',
  'moveLayer',
  'bringForward',
  'sendBackward',
  'bringToFront',
  'sendToBack',
  'undo',
  'redo',
  'canUndo',
  'canRedo',
  'clearHistory',
  'group',
  'ungroup',
  'addChild',
  'removeChild',
  'select',
  'deselect',
  'selectAll',
  'clearSelection',
  'isSelected',
  'onSelectionChange',
  'applyDropShadow',
  'removeDropShadow',
  'applyInnerShadow',
  'removeInnerShadow',
  'applyLayerBlur',
  'removeLayerBlur',
  'clearEffects',
  'toPNG',
  'toJPEG',
  'toSVG',
] as const

/** Declares one public instance method documented for `Venus`. */
export type VenusPublicMethodName = (typeof VENUS_PUBLIC_METHOD_NAMES)[number]

/** Declares editable 2D transform fields stored on a Venus document node. */
export type VenusTransform2D = {
  /** Extra local x translation applied in addition to geometry x. */
  x?: number
  /** Extra local y translation applied in addition to geometry y. */
  y?: number
}

export interface VenusParameters {
  /** Default fill used when a node has no explicit fill/fills. Defaults to transparent. */
  defaultFillColor?: string
  /** Default stroke used when a node has stroke width but no explicit stroke/strokes. Defaults to transparent. */
  defaultStrokeColor?: string
  culling?: boolean
  lod?: boolean
  render?: {
    backend?: VenusBackend
    antialias?: boolean
    quality?: 'interactive' | 'full'
  }
  resource?: {
    loader?: EngineResourceLoader
  }
  /** Optional user capability modules installed during construction. */
  modules?: readonly VenusModule[]
}

/** Declares the debug visualizations and diagnostics requested by `venus.enableDebug`. */
export interface VenusDebugFlags {
  /** Enables geometry bounds diagnostics for debug surfaces. */
  showBounds: boolean
  /** Enables hit-test candidate diagnostics for debug surfaces. */
  showHitCandidates: boolean
  /** Enables cache diagnostics for debug surfaces. */
  showCache: boolean
}

/** Describes one measured Venus render frame. */
export interface VenusFrameMeasurement {
  /** Wall-clock render duration in milliseconds. */
  frameTimeMs: number
  /** Document revision measured for this frame. */
  revision: number
  /** Engine diagnostics captured after the measured render. */
  diagnostics: EngineRuntimeDiagnostics | null
}

/** Describes cache diagnostics normalized for Venus API users. */
export interface VenusCacheDiagnostics {
  /** Whether cache diagnostics are enabled through `venus.enableDebug`. */
  enabled: boolean
  /** Whether mounted engine render stats are available. */
  available: boolean
  /** Render-plan geometry cache counters. */
  geometry: {
    /** Number of geometry cache hits reported by the latest render stats. */
    hitCount: number
    /** Number of geometry cache misses reported by the latest render stats. */
    missCount: number
    /** Latest rolling geometry cache hit rate in the [0, 1] interval. */
    hitRate: number
  }
  /** Renderer cache counters from the latest render stats. */
  render: {
    /** Number of renderer cache hits. */
    hitCount: number
    /** Number of renderer cache misses. */
    missCount: number
  }
  /** Frame reuse counters from the latest render stats. */
  frameReuse: {
    /** Number of reused frame paths. */
    hitCount: number
    /** Number of missed frame reuse paths. */
    missCount: number
  }
  /** Tile cache counters when the backend reports them. */
  tile: {
    /** Number of cached tiles. */
    size: number
    /** Number of dirty tiles. */
    dirtyCount: number
    /** Total tile cache bytes. */
    totalBytes: number
  }
  /** Last renderer fallback reason, if any. */
  fallbackReason: string | null
}

/** Describes an automatic render backend fallback. */
export interface VenusBackendFallback {
  /** Backend that was attempted first. */
  from: 'webgl'
  /** Backend selected after fallback. */
  to: 'canvas2d'
  /** Human-readable initialization failure reason. */
  reason: string
}

/** Describes public module installation diagnostics. */
export interface VenusModuleDiagnostics {
  /** Installed modules in installation order. */
  installed: readonly VenusModuleName[]
  /** Last module installation failure, when construction failed or was recovered by tests. */
  lastError: {
    module: VenusModuleName
    reason: string
  } | null
}

/** Declares options for `venus.hitTest`. */
export interface VenusHitTestOptions {
  /** Interaction phase; hover uses a larger default tolerance than click. */
  phase?: 'hover' | 'click'
  /** Explicit hit tolerance in screen pixels. Overrides the phase default. */
  tolerance?: number
  /** When false, a locked topmost hit is ignored. */
  includeLocked?: boolean
}

export type VenusHitTargetKind =
  | 'shape.anchor'
  | 'shape.center'
  | 'shape.stroke'
  | 'shape.fill'
  | 'shape.bounds'

export interface VenusHitAnchor {
  index: number
  x: number
  y: number
}

export interface VenusDetailedHitTestResult {
  nodeId: string
  nodeType?: EngineRenderableNode['type']
  documentType?: VenusDocumentModelType
  hitType?: string
  index?: number
  score?: number
  zOrder?: number
  hitPoint: {x: number; y: number}
  bounds: {x: number; y: number; width: number; height: number} | null
  center: {x: number; y: number} | null
  anchors: VenusHitAnchor[]
  target: {kind: VenusHitTargetKind; anchorIndex?: number}
  regions: VenusHitTargetKind[]
}

/** Describes public runtime state returned by `venus.inspect`. */
export interface VenusRuntimeInspection {
  /** Current document revision. */
  revision: number
  /** Number of root document nodes. */
  nodeCount: number
  /** Whether the Venus instance is currently mounted to a canvas. */
  mounted: boolean
  /** Active debug flags. */
  debug: VenusDebugFlags
  /** Current camera viewport fields. */
  viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>
  /** Last measured frame, if `measureFrame` has run. */
  lastFrameMeasurement: Omit<VenusFrameMeasurement, 'diagnostics'> | null
  /** Normalized cache diagnostics for docs and debug panels. */
  cache: VenusCacheDiagnostics
  /** Last automatic backend fallback, if auto mode needed one. */
  backendFallback: VenusBackendFallback | null
  /** Installed module diagnostics. */
  modules: VenusModuleDiagnostics
  /** Engine-level diagnostics, available after mount. */
  engine: EngineRuntimeDiagnostics | null
}

export interface VenusEventMap {
  mounted: {canvas: HTMLCanvasElement}
  'document:changed': {revision: number; node?: EngineRenderableNode}
  resized: {width: number; height: number}
  'render:before': {revision: number}
  'render:after': {revision: number}
  'backend:fallback': VenusBackendFallback
  hit: {point: {x: number; y: number}; phase: 'hover' | 'click'; tolerance: number; result: VenusDetailedHitTestResult | null}
  destroyed: {}
}

export type VenusEventName = keyof VenusEventMap
export type VenusEventHandler<TEventName extends VenusEventName = VenusEventName> = (event: VenusEventMap[TEventName]) => void

/** Lists numeric document properties supported by the minimal Venus animator. */
export type VenusAnimatableProperty = 'x' | 'y' | 'opacity' | 'rotation'

/** Declares one animation keyframe for numeric document node properties. */
export type VenusAnimationKeyframe = Partial<Record<VenusAnimatableProperty, number>>

/** Declares runtime options for `venus.animate`. */
export interface VenusAnimationOptions {
  /** Animation duration in milliseconds. */
  duration?: number
  /** Easing curve used to map elapsed time to interpolation progress. */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
}

/** Controls one running Venus animation. */
export interface VenusAnimationController {
  /** Resolves when the animation reaches its final keyframe or is canceled. */
  finished: Promise<void>
  /** Stops the animation without applying any remaining keyframes. */
  cancel(): void
  /** Pauses future animation ticks. */
  pause(): void
  /** Resumes a paused animation from the current node state. */
  play(): void
}

export type VenusGroupNode = Extract<VenusNode, {type: 'group'}>

/** Options accepted by `venus.group(...)` for the created group node. */
export type VenusGroupOptions = Partial<Omit<VenusGroupNode, 'type' | 'children'>>

/** Declares one gradient colour stop for Venus paint descriptors. */
export interface VenusGradientStop {
  /** Stop position in the [0, 1] interval. */
  offset: number
  /** CSS colour string for this stop. */
  color: string
  /** Optional per-stop opacity in the [0, 1] interval. */
  opacity?: number
}

/** Declares a linear gradient for Venus paints. */
export interface VenusLinearGradient {
  type: 'linear'
  startX: number
  startY: number
  endX: number
  endY: number
  stops: readonly VenusGradientStop[]
}

/** Declares a radial gradient for Venus paints. */
export interface VenusRadialGradient {
  type: 'radial'
  centerX: number
  centerY: number
  radius: number
  stops: readonly VenusGradientStop[]
}

/** Declares one gradient descriptor for Venus paints. */
export type VenusGradient = VenusLinearGradient | VenusRadialGradient

/** Declares a solid-colour paint for Venus fills and strokes. */
export interface VenusSolidPaint {
  type: 'solid'
  color: string
  opacity?: number
}

/** Declares a gradient paint for Venus fills and strokes. */
export interface VenusGradientPaint {
  type: 'gradient'
  gradient: VenusGradient
  opacity?: number
}

/** Declares one paint descriptor accepted by Venus fill and stroke lists. */
export type VenusPaint = VenusSolidPaint | VenusGradientPaint

/** Declares one blend mode accepted by Venus appearance fields. */
export type VenusBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'hardLight'
  | 'softLight'
  | 'difference'
  | 'exclusion'

/** Declares stroke alignment relative to path geometry. */
export type VenusStrokeAlign = 'center' | 'inside' | 'outside'

/** Declares one Figma-like stroke layer in structured Venus appearance. */
export interface VenusStroke {
  /** Ordered paint list for this stroke. */
  paints: readonly VenusPaint[]
  /** Stroke width in document units. */
  width?: number
  /** Stroke alignment relative to path geometry. */
  align?: VenusStrokeAlign
  /** Dash pattern as alternating dash-gap lengths. */
  dash?: readonly number[]
  /** Line cap style for open stroke paths. */
  cap?: 'butt' | 'round' | 'square'
  /** Line join style for stroke corners. */
  join?: 'miter' | 'round' | 'bevel'
  /** Whether this stroke participates in rendering. */
  visible?: boolean
}

/** Declares one Figma-like effect layer in structured Venus appearance. */
export type VenusEffect =
  | {
    type: 'dropShadow'
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
    visible?: boolean
  }
  | {
    type: 'innerShadow'
    color?: string
    blur?: number
    visible?: boolean
  }
  | {
    type: 'layerBlur'
    amount: number
    visible?: boolean
  }

/** Groups visual properties in a Figma-like appearance object. */
export interface VenusAppearance {
  /** Ordered fill paint layers. Takes precedence over flat `fills` and `fill`. */
  fills?: readonly VenusPaint[]
  /** Ordered stroke layers. The first visible stroke is projected to the current engine stroke fields. */
  strokes?: readonly VenusStroke[]
  /** Ordered visual effects. First visible effect of each supported type is projected to engine fields. */
  effects?: readonly VenusEffect[]
  /** Node opacity in the [0, 1] interval. Takes precedence over flat `opacity`. */
  opacity?: number
  /** Node blend mode. Takes precedence over flat `blendMode`. */
  blendMode?: VenusBlendMode
}

/** Declares responsive constraints reserved for higher-level layout flows. */
export interface VenusConstraints {
  horizontal?: 'min' | 'center' | 'max' | 'stretch' | 'scale'
  vertical?: 'min' | 'center' | 'max' | 'stretch' | 'scale'
}

/** Declares one export setting attached to a document node. */
export interface VenusExportSetting {
  format: 'png' | 'jpg' | 'svg' | 'pdf'
  scale?: number
  suffix?: string
}

/** Declares the highest-impact render invalidation caused by a document mutation. */
export type VenusInvalidationKind =
  | 'none'
  | 'transformOnly'
  | 'opacityOnly'
  | 'visibility'
  | 'geometry'
  | 'paint'
  | 'text'
  | 'effect'
  | 'clipMask'
  | 'structural'

type VenusNodeBase = {
  id?: string
  name?: string
  visible?: boolean
  locked?: boolean
  opacity?: number
  blendMode?: string
  /** Structured Figma-like appearance group. Takes precedence over compatible flat appearance fields. */
  appearance?: VenusAppearance
  /** Layout constraints reserved for parent resize/layout flows. */
  constraints?: VenusConstraints
  /** Export hints reserved for future export pipelines. */
  exportSettings?: readonly VenusExportSetting[]
  /** Arbitrary host metadata not interpreted by the engine. */
  data?: Record<string, unknown>
  /** Inner shadow effect (clipped to shape interior). */
  innerShadow?: {color?: string; blur?: number}
  /** Layer blur radius in pixels. */
  layerBlur?: {amount: number}
}

type VenusTransformableNodeBase = VenusNodeBase & {
  /** Reserved local transform object. Rotation is a top-level node field. */
  transform?: VenusTransform2D
  /** Rotation in degrees, composed around the node bounds center. */
  rotation?: number
}

export type VenusNode =
  | {
    /** Bounds-authored shape. x/y are local top-left; width/height are the rendered box. */
    type: 'rect' | 'ellipse'
    x?: number
    y?: number
    width: number
    height: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    /** Ordered paint list for fill (takes precedence over `fill`). */
    fills?: readonly VenusPaint[]
    /** Ordered paint list for stroke (takes precedence over `stroke`). */
    strokes?: readonly VenusPaint[]
    /** Stroke alignment relative to path geometry. Defaults to center. */
    strokeAlign?: VenusStrokeAlign
    /** Dash pattern as alternating dash-gap lengths. Empty or absent means solid. */
    strokeDashArray?: readonly number[]
    /** Line cap style for stroke ends. Defaults to round. */
    strokeCap?: 'butt' | 'round' | 'square'
    /** Line join style for stroke corners. Defaults to round. */
    strokeJoin?: 'miter' | 'round' | 'bevel'
    cornerRadius?: number
    cornerRadii?: {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number}
    ellipseStartAngle?: number
    ellipseEndAngle?: number
    ellipseDrawWedgeLine?: boolean
    /** Ellipse geometry in center+radii form. Preferred over x/y/width/height for ellipse shapes. */
    ellipseGeometry?: { cx: number; cy: number; rx: number; ry: number }
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Stroke-authored segment. Prefer two anchor points; x/y + width/height remain compatibility endpoint fields. */
    type: 'line'
    x?: number
    y?: number
    width: number
    height: number
    /** Two anchor points. The first point is the start; the last point is the end. */
    points?: readonly {x: number; y: number}[]
    stroke?: string
    strokeWidth?: number
    /** Ordered paint list for stroke (takes precedence over `stroke`). */
    strokes?: readonly VenusPaint[]
    strokeAlign?: VenusStrokeAlign
    strokeDashArray?: readonly number[]
    strokeCap?: 'butt' | 'round' | 'square'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Text document node. width/height are optional editor/layout bounds. */
    type: 'text'
    x?: number
    y?: number
    width?: number
    height?: number
    text: string
    runs?: readonly EngineTextRun[]
    fill?: string
    /** Ordered paint list for text fill (takes precedence over `fill`). */
    fills?: readonly VenusPaint[]
    fontSize?: number
    fontWeight?: number
    lineHeight?: number
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Structure-only container node. Visual bounds derive from children. */
    type: 'group'
    shadow?: EngineShadow
    children: VenusNode[]
  } & VenusNodeBase
  | {
    /** Clip/mask container. Bounds derive from clipPath first, then children. */
    type: 'clip' | 'mask'
    clipPath: VenusNode
    children: VenusNode[]
  } & VenusTransformableNodeBase
  | {
    /** Draws closed point-list polygon geometry. Bounds edits rescale points. */
    type: 'polygon'
    x?: number
    y?: number
    width: number
    height: number
    /** Ordered polygon vertices. */
    points?: readonly {x: number; y: number}[]
    /** Whether the polygon is closed (defaults to true for polygon). */
    closed?: boolean
    fill?: string
    stroke?: string
    strokeWidth?: number
    fills?: readonly VenusPaint[]
    strokes?: readonly VenusPaint[]
    strokeAlign?: VenusStrokeAlign
    strokeDashArray?: readonly number[]
    strokeCap?: 'butt' | 'round' | 'square'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Draws custom point or bezier path geometry. Bounds edits rescale authored points. */
    type: 'path'
    x?: number
    y?: number
    width: number
    height: number
    /** Ordered straight-line points. */
    points?: readonly {x: number; y: number}[]
    /** Bezier anchors with optional control points. Preferred when present. */
    bezierPoints?: readonly {anchor: {x: number; y: number}; cp1?: {x: number; y: number} | null; cp2?: {x: number; y: number} | null}[]
    /** Whether the path closes back to its start point. */
    closed?: boolean
    /** Start arrowhead style for open paths. */
    strokeStartArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'
    /** End arrowhead style for open paths. */
    strokeEndArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'
    fill?: string
    stroke?: string
    strokeWidth?: number
    fills?: readonly VenusPaint[]
    strokes?: readonly VenusPaint[]
    strokeAlign?: VenusStrokeAlign
    strokeDashArray?: readonly number[]
    strokeCap?: 'butt' | 'round' | 'square'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Renders an asset-backed raster image quad. */
    type: 'image'
    x?: number
    y?: number
    width: number
    height: number
    /** Asset/resource id resolved by the host app. */
    assetId: string
    /** Optional source crop rectangle. */
    sourceRect?: {x: number; y: number; width: number; height: number}
    /** Intrinsic asset dimensions. */
    naturalSize?: {width: number; height: number}
    /** Backend image smoothing hint. */
    imageSmoothing?: boolean
  } & VenusTransformableNodeBase

const DEGREES_TO_RADIANS = Math.PI / 180
const IDENTITY_TRANSFORM: EngineTransform2D['matrix'] = [1, 0, 0, 0, 1, 0]
const DEFAULT_VENUS_VIEWPORT_WIDTH = 520
const DEFAULT_VENUS_VIEWPORT_HEIGHT = 320
const DEFAULT_HISTORY_LIMIT = 100

class VenusReadonlyServiceRegistry implements VenusServiceRegistry {
  private readonly services: ReadonlyMap<VenusInternalServiceName, unknown>
  private readonly readonlyServices = new Map<VenusInternalServiceName, unknown>()

  constructor(services: ReadonlyMap<VenusInternalServiceName, unknown>) {
    this.services = services
  }

  has(name: VenusInternalServiceName): boolean {
    return this.services.has(name)
  }

  get<TService = unknown>(name: VenusInternalServiceName): TService | null {
    if (this.readonlyServices.has(name)) {
      return this.readonlyServices.get(name) as TService
    }

    const service = this.services.get(name)
    if (!service) {
      return null
    }

    const readonlyService = typeof service === 'object'
      ? Object.freeze({...service})
      : service
    this.readonlyServices.set(name, readonlyService)
    return readonlyService as TService
  }

  require<TService = unknown>(name: VenusInternalServiceName): TService {
    const service = this.get<TService>(name)
    if (!service) {
      throw new Error(`Venus service "${name}" is not registered`)
    }

    return service
  }

  list(): readonly VenusInternalServiceName[] {
    return [...this.services.keys()]
  }
}

const venusInvalidationPriority: Record<VenusInvalidationKind, number> = {
  none: 0,
  opacityOnly: 1,
  visibility: 2,
  transformOnly: 3,
  paint: 4,
  effect: 5,
  geometry: 6,
  text: 7,
  clipMask: 8,
  structural: 9,
}

/**
 * Classifies changed Venus node property paths into one render invalidation kind.
 * @param changedProperties Changed public property names or dotted paths.
 */
export function classifyVenusNodeMutation(
  changedProperties: readonly string[],
): VenusInvalidationKind {
  let result: VenusInvalidationKind = 'none'

  for (const property of changedProperties) {
    const root = property.split('.')[0]
    const kind = classifyVenusPropertyMutation(root, property)
    if (venusInvalidationPriority[kind] > venusInvalidationPriority[result]) {
      result = kind
    }
  }

  return result
}

/**
 * Classifies one changed Venus node property.
 * @param root Root property name.
 * @param path Full property path.
 */
function classifyVenusPropertyMutation(root: string, path: string): VenusInvalidationKind {
  if (['type', 'children', 'clipPath', 'parentId'].includes(root)) {
    return root === 'clipPath' ? 'clipMask' : 'structural'
  }

  if (['visible'].includes(root)) {
    return 'visibility'
  }

  if (['opacity'].includes(root) || path === 'appearance.opacity') {
    return 'opacityOnly'
  }

  if (['transform', 'rotation'].includes(root)) {
    return 'transformOnly'
  }

  if (['x', 'y', 'width', 'height', 'points', 'bezierPoints', 'closed', 'cornerRadius', 'cornerRadii', 'ellipseStartAngle', 'ellipseEndAngle', 'ellipseDrawWedgeLine'].includes(root)) {
    return 'geometry'
  }

  if (['text', 'runs', 'fontSize', 'fontWeight', 'lineHeight'].includes(root)) {
    return 'text'
  }

  if (['shadow', 'innerShadow', 'layerBlur'].includes(root) || path.startsWith('appearance.effects')) {
    return 'effect'
  }

  if ([
    'appearance',
    'fill',
    'fills',
    'stroke',
    'strokes',
    'strokeWidth',
    'strokeAlign',
    'strokeDashArray',
    'strokeCap',
    'strokeJoin',
    'blendMode',
  ].includes(root)) {
    return path.startsWith('appearance.effects') ? 'effect' : 'paint'
  }

  return 'none'
}

/** Reads a monotonic timestamp when available. */
const getVenusNow = (): number => {
  return globalThis.performance?.now?.() ?? Date.now()
}

/**
 * Detects whether a document node carries transform fields beyond geometry x/y.
 * @param node Document node base fields to inspect.
 */
const hasTransformFields = (node: VenusTransformableNodeBase): boolean => {
  const transform = node.transform
  return Boolean(
    node.rotation
    || transform?.x
    || transform?.y
  )
}

/**
 * Multiplies affine matrices using the engine's 6-element matrix layout.
 * @param left Matrix applied before the right matrix.
 * @param right Matrix applied after the left matrix.
 */
const multiplyTransformMatrices = (
  left: EngineTransform2D['matrix'],
  right: EngineTransform2D['matrix'],
): EngineTransform2D['matrix'] => {
  const [la, lc, le, lb, ld, lf] = left
  const [ra, rc, re, rb, rd, rf] = right
  return [
    la * ra + lc * rb,
    la * rc + lc * rd,
    la * re + lc * rf + le,
    lb * ra + ld * rb,
    lb * rc + ld * rd,
    lb * re + ld * rf + lf,
  ]
}

/**
 * Synthesises a 6-element affine matrix from Venus transform properties.
 * Rotation is applied around the node bounds center; skew/scale are authored
 * by editing shape geometry instead of by storing extra transform fields.
 * @param node Node with geometry and transform properties.
 * @param bounds Optional pre-computed bounds for center calculation.
 */
const createVenusTransform = (
  node: VenusTransformableNodeBase,
  bounds?: {x: number; y: number; width: number; height: number},
): EngineTransform2D | undefined => {
  const transform = node.transform
  const transformX = transform?.x ?? 0
  const transformY = transform?.y ?? 0
  if (!hasTransformFields(node) && transformX === 0 && transformY === 0) {
    return undefined
  }

  const centerX = bounds ? bounds.x + bounds.width * 0.5 : 0
  const centerY = bounds ? bounds.y + bounds.height * 0.5 : 0
  const rotation = (node.rotation ?? 0) * DEGREES_TO_RADIANS
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const translateToCenter: EngineTransform2D['matrix'] = [1, 0, centerX + transformX, 0, 1, centerY + transformY]
  const translateFromCenter: EngineTransform2D['matrix'] = [1, 0, -centerX, 0, 1, -centerY]
  const rotateMatrix: EngineTransform2D['matrix'] = [cos, -sin, 0, sin, cos, 0]
  const matrix = [
    translateToCenter,
    rotateMatrix,
    translateFromCenter,
  ].reduce(multiplyTransformMatrices, IDENTITY_TRANSFORM)

  return {matrix}
}

const getNodeBounds = (node: VenusNode): {x: number; y: number; width: number; height: number} | null => {
  if (node.type === 'group') {
    return getChildrenBounds(node.children)
  }

  if (node.type === 'clip' || node.type === 'mask') {
    return getNodeBounds(node.clipPath) ?? getChildrenBounds(node.children)
  }

  if (node.type === 'line' && node.points && node.points.length >= 2) {
    const start = node.points[0]
    const end = node.points[node.points.length - 1]
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    }
  }

  if ('width' in node && typeof node.width === 'number' && 'height' in node && typeof node.height === 'number') {
    return {
      x: 'x' in node ? node.x ?? 0 : 0,
      y: 'y' in node ? node.y ?? 0 : 0,
      width: node.width,
      height: node.height,
    }
  }

  return null
}

const getChildrenBounds = (children: readonly VenusNode[]) => {
  const bounds = children.map(getNodeBounds).filter((childBounds): childBounds is {x: number; y: number; width: number; height: number} => Boolean(childBounds))
  if (bounds.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0}
  }

  const minX = Math.min(...bounds.map((childBounds) => childBounds.x))
  const minY = Math.min(...bounds.map((childBounds) => childBounds.y))
  const maxX = Math.max(...bounds.map((childBounds) => childBounds.x + childBounds.width))
  const maxY = Math.max(...bounds.map((childBounds) => childBounds.y + childBounds.height))
  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY}
}

const translatePoint = (point: {x: number; y: number}, dx: number, dy: number) => ({
  ...point,
  x: point.x + dx,
  y: point.y + dy,
})

const translateVenusNode = (node: VenusNode, dx: number, dy: number): void => {
  if (node.type === 'group') {
    node.children.forEach((child) => translateVenusNode(child, dx, dy))
    return
  }

  if ('x' in node) {
    node.x = (node.x ?? 0) + dx
  }
  if ('y' in node) {
    node.y = (node.y ?? 0) + dy
  }

  if (node.type === 'line' || node.type === 'polygon' || node.type === 'path') {
    const nodeWithPoints = node as typeof node & {points?: readonly {x: number; y: number}[]}
    if (nodeWithPoints.points) {
      nodeWithPoints.points = nodeWithPoints.points.map((point) => translatePoint(point, dx, dy))
    }
  }

  if (node.type === 'path' && node.bezierPoints) {
    node.bezierPoints = node.bezierPoints.map((point) => ({
      ...point,
      anchor: translatePoint(point.anchor, dx, dy),
      cp1: point.cp1 ? translatePoint(point.cp1, dx, dy) : point.cp1,
      cp2: point.cp2 ? translatePoint(point.cp2, dx, dy) : point.cp2,
    }))
  }

  if (node.type === 'clip' || node.type === 'mask') {
    if ('x' in node || 'y' in node) {
      return
    }
    translateVenusNode(node.clipPath, dx, dy)
    node.children.forEach((child) => translateVenusNode(child, dx, dy))
  }
}

const sanitizeStructureGroupNode = (node: VenusNode): void => {
  if (node.type === 'group') {
    const record = node as unknown as Record<string, unknown>
    delete record.x
    delete record.y
    delete record.width
    delete record.height
    delete record.rotation
    delete record.transform
    node.children.forEach(sanitizeStructureGroupNode)
    return
  }

  if (node.type === 'clip' || node.type === 'mask') {
    sanitizeStructureGroupNode(node.clipPath)
    node.children.forEach(sanitizeStructureGroupNode)
  }
}

const applyStructureGroupGeometryPatch = (node: VenusNode, patch: Partial<VenusNode>): void => {
  if (node.type !== 'group') {
    return
  }

  const record = patch as Record<string, unknown>
  const bounds = getNodeBounds(node) ?? {x: 0, y: 0, width: 0, height: 0}
  const nextX = typeof record.x === 'number' ? record.x : bounds.x
  const nextY = typeof record.y === 'number' ? record.y : bounds.y
  const dx = nextX - bounds.x
  const dy = nextY - bounds.y
  if (dx !== 0 || dy !== 0) {
    node.children.forEach((child) => translateVenusNode(child, dx, dy))
  }

  delete record.x
  delete record.y
  delete record.width
  delete record.height
  delete record.rotation
  delete record.transform
}

const hasBoundsPatch = (patch: Partial<VenusNode>) => {
  return 'x' in patch || 'y' in patch || 'width' in patch || 'height' in patch
}

const getEditableBounds = (node: VenusNode) => {
  const record = node as Record<string, unknown>
  return {
    x: typeof record.x === 'number' ? record.x : 0,
    y: typeof record.y === 'number' ? record.y : 0,
    width: typeof record.width === 'number' ? record.width : 0,
    height: typeof record.height === 'number' ? record.height : 0,
  }
}

const resolvePatchedBounds = (node: VenusNode, patch: Partial<VenusNode>) => {
  const current = getEditableBounds(node)
  const record = patch as Record<string, unknown>
  return {
    x: typeof record.x === 'number' ? record.x : current.x,
    y: typeof record.y === 'number' ? record.y : current.y,
    width: typeof record.width === 'number' ? record.width : current.width,
    height: typeof record.height === 'number' ? record.height : current.height,
  }
}

const mapPointBetweenBounds = (
  point: {x: number; y: number},
  from: {x: number; y: number; width: number; height: number},
  to: {x: number; y: number; width: number; height: number},
) => ({
  x: from.width === 0 ? point.x + (to.x - from.x) : to.x + ((point.x - from.x) / from.width) * to.width,
  y: from.height === 0 ? point.y + (to.y - from.y) : to.y + ((point.y - from.y) / from.height) * to.height,
})

/**
 * Applies editor-bounds patches to point-authored geometry before the public
 * x/y/width/height fields are committed. For path-like nodes, those fields are
 * an editable bounds box; points/bezierPoints remain the render source of truth.
 */
const applyBoundsPatchToAuthoredGeometry = (node: VenusNode, patch: Partial<VenusNode>): void => {
  if (!hasBoundsPatch(patch)) {
    return
  }

  const from = getEditableBounds(node)
  const to = resolvePatchedBounds(node, patch)

  if (node.type === 'line') {
    const nodeWithPoints = node as typeof node & {points?: readonly {x: number; y: number}[]}
    if (nodeWithPoints.points) {
      nodeWithPoints.points = [
        {x: to.x, y: to.y},
        {x: to.x + to.width, y: to.y + to.height},
      ]
    }
    return
  }

  if (node.type === 'polygon' || node.type === 'path') {
    const nodeWithPoints = node as typeof node & {points?: readonly {x: number; y: number}[]}
    if (nodeWithPoints.points) {
      nodeWithPoints.points = nodeWithPoints.points.map((point) => mapPointBetweenBounds(point, from, to))
    }
  }

  if (node.type === 'path' && node.bezierPoints) {
    node.bezierPoints = node.bezierPoints.map((point) => ({
      ...point,
      anchor: mapPointBetweenBounds(point.anchor, from, to),
      cp1: point.cp1 ? mapPointBetweenBounds(point.cp1, from, to) : point.cp1,
      cp2: point.cp2 ? mapPointBetweenBounds(point.cp2, from, to) : point.cp2,
    }))
  }
}

/**
 * Merges two world-space rectangles into one axis-aligned document bounds box.
 * @param left Existing aggregate bounds.
 * @param right Bounds to include in the aggregate.
 */
const unionEngineBounds = (left: EngineRect, right: EngineRect): EngineRect => {
  const minX = Math.min(left.x, right.x)
  const minY = Math.min(left.y, right.y)
  const maxX = Math.max(left.x + left.width, right.x + right.width)
  const maxY = Math.max(left.y + left.height, right.y + right.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Resolves aggregate document bounds for render-facing engine nodes.
 * @param nodes Root or child render nodes to inspect.
 * @param parentMatrix Parent world matrix composed before each node matrix.
 */
const resolveEngineNodesBounds = (
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineTransform2D['matrix'] = IDENTITY_TRANSFORM,
): EngineRect | null => {
  let aggregate: EngineRect | null = null

  for (const node of nodes) {
    const nodeMatrix = multiplyTransformMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_TRANSFORM)
    const nodeBounds = node.type === 'group'
      ? resolveEngineNodesBounds(node.children, nodeMatrix)
      : resolveLeafNodeWorldBounds(node, nodeMatrix)

    if (!nodeBounds) {
      continue
    }

    aggregate = aggregate ? unionEngineBounds(aggregate, nodeBounds) : nodeBounds
  }

  return aggregate
}

const resolveNodeOpacity = (node: VenusNodeBase) => {
  return node.visible === false ? 0 : node.appearance?.opacity ?? node.opacity
}

const resolveNodeBlendMode = (node: VenusNodeBase) => {
  return node.appearance?.blendMode ?? node.blendMode
}

const isVisibleAppearanceLayer = (layer: {visible?: boolean}) => {
  return layer.visible !== false
}

const resolveAppearanceEffects = (
  node: VenusNode,
): {
  shadow?: EngineShadow
  innerShadow?: {color?: string; blur?: number}
  layerBlur?: {amount: number}
} => {
  const effects = node.appearance?.effects
  const legacyShadow = 'shadow' in node ? node.shadow : undefined

  if (!effects) {
    return {
      shadow: legacyShadow,
      innerShadow: node.innerShadow,
      layerBlur: node.layerBlur,
    }
  }

  const dropShadow = effects.find((effect) => effect.type === 'dropShadow' && isVisibleAppearanceLayer(effect))
  const innerShadow = effects.find((effect) => effect.type === 'innerShadow' && isVisibleAppearanceLayer(effect))
  const layerBlur = effects.find((effect) => effect.type === 'layerBlur' && isVisibleAppearanceLayer(effect))

  return {
    shadow: dropShadow?.type === 'dropShadow'
      ? {
        color: dropShadow.color,
        offsetX: dropShadow.offsetX,
        offsetY: dropShadow.offsetY,
        blur: dropShadow.blur,
      }
      : undefined,
    innerShadow: innerShadow?.type === 'innerShadow'
      ? {
        color: innerShadow.color,
        blur: innerShadow.blur,
      }
      : undefined,
    layerBlur: layerBlur?.type === 'layerBlur'
      ? {amount: layerBlur.amount}
      : undefined,
  }
}

const resolveAppearanceFills = (
  node: VenusNode,
  legacyFills?: readonly VenusPaint[],
) => {
  return node.appearance?.fills ?? legacyFills
}

const resolveAppearanceStroke = (
  node: VenusNode,
  legacy: {
    strokes?: readonly VenusPaint[]
    strokeWidth?: number
    strokeAlign?: VenusStrokeAlign
    strokeDashArray?: readonly number[]
    strokeCap?: 'butt' | 'round' | 'square'
    strokeJoin?: 'miter' | 'round' | 'bevel'
  },
) => {
  const structuredStroke = node.appearance?.strokes?.find(isVisibleAppearanceLayer)

  if (!structuredStroke) {
    return {
      strokes: legacy.strokes,
      strokeWidth: legacy.strokeWidth,
      strokeAlign: legacy.strokeAlign,
      strokeDashArray: legacy.strokeDashArray,
      strokeCap: legacy.strokeCap,
      strokeJoin: legacy.strokeJoin,
    }
  }

  return {
    strokes: structuredStroke.paints,
    strokeWidth: structuredStroke.width,
    strokeAlign: structuredStroke.align,
    strokeDashArray: structuredStroke.dash,
    strokeCap: structuredStroke.cap,
    strokeJoin: structuredStroke.join,
  }
}

const toEngineNode = (
  node: VenusNode,
  fallbackId: string,
  defaults: VenusRenderDefaults = {fillColor: DEFAULT_VENUS_FILL_COLOR, strokeColor: DEFAULT_VENUS_STROKE_COLOR},
): EngineRenderableNode => {
  const id = node.id ?? fallbackId

  if (node.type === 'group') {
    const effects = resolveAppearanceEffects(node)
    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: undefined,
      children: node.children.map((child, index) => toEngineNode(child, `${id}-child-${index}`, defaults)),
    }
  }

  if (node.type === 'clip' || node.type === 'mask') {
    const effects = resolveAppearanceEffects(node)
    const clipPathX = 'x' in node.clipPath ? node.clipPath.x ?? 0 : 0
    const clipPathY = 'y' in node.clipPath ? node.clipPath.y ?? 0 : 0
    const clipPathWidth = 'width' in node.clipPath && typeof node.clipPath.width === 'number' ? node.clipPath.width : 160
    const clipPathHeight = 'height' in node.clipPath && typeof node.clipPath.height === 'number' ? node.clipPath.height : 120

    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, getNodeBounds(node) ?? undefined),
      clip: {
        clipShape: {
          kind: 'rect',
          rect: {
            x: clipPathX,
            y: clipPathY,
            width: clipPathWidth,
            height: clipPathHeight,
          },
          radius: node.clipPath.type === 'ellipse'
            ? 999
            : node.clipPath.type === 'rect'
              ? node.clipPath.cornerRadius
              : undefined,
        },
      },
      children: node.children.map((child, index) => toEngineNode(child, `${id}-clip-child-${index}`, defaults)),
    }
  }

  if (node.type === 'text') {
    const effects = resolveAppearanceEffects(node)
    return {
      id,
      type: 'text',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width ?? 0, height: node.height ?? 0}),
      text: node.text,
      runs: node.runs,
      lineCount: node.text.split('\n').length,
      style: {
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: node.fontSize ?? 24,
        fontWeight: node.fontWeight ?? 700,
        lineHeight: node.lineHeight,
        fill: node.fill ?? defaults.fillColor,
        fills: resolveAppearanceFills(node, node.fills) as EngineTextStyle['fills'],
        shadow: effects.shadow,
      },
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
    }
  }

  if (node.type === 'line') {
    const effects = resolveAppearanceEffects(node)
    const pointStart = node.points && node.points.length >= 2 ? node.points[0] : null
    const pointEnd = node.points && node.points.length >= 2 ? node.points[node.points.length - 1] : null
    const lineX = pointStart?.x ?? node.x ?? 0
    const lineY = pointStart?.y ?? node.y ?? 0
    const lineWidth = pointEnd ? pointEnd.x - lineX : node.width ?? 0
    const lineHeight = pointEnd ? pointEnd.y - lineY : node.height ?? 0
    const strokeStyle = resolveAppearanceStroke(node, {
      strokes: node.strokes,
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    })
    return {
      id,
      type: 'shape',
      shape: 'line',
      x: lineX,
      y: lineY,
      width: lineWidth,
      height: lineHeight,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, {x: lineX, y: lineY, width: lineWidth, height: lineHeight}),
      stroke: node.stroke ?? defaults.strokeColor,
      strokeWidth: strokeStyle.strokeWidth ?? 4,
      strokes: strokeStyle.strokes as EngineShapeNode['strokes'],
      strokeAlign: strokeStyle.strokeAlign,
      strokeDashArray: strokeStyle.strokeDashArray,
      strokeCap: strokeStyle.strokeCap,
      strokeJoin: strokeStyle.strokeJoin,
      points: node.points as EngineShapeNode['points'],
    }
  }

  if (node.type === 'rect' || node.type === 'ellipse') {
    const effects = resolveAppearanceEffects(node)
    const strokeStyle = resolveAppearanceStroke(node, {
      strokes: node.strokes,
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    })
    return {
      id,
      type: 'shape',
      shape: node.type,
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill ?? defaults.fillColor,
      stroke: node.stroke ?? defaults.strokeColor,
      strokeWidth: strokeStyle.strokeWidth,
      fills: resolveAppearanceFills(node, node.fills) as EngineShapeNode['fills'],
      strokes: strokeStyle.strokes as EngineShapeNode['strokes'],
      strokeAlign: strokeStyle.strokeAlign,
      strokeDashArray: strokeStyle.strokeDashArray,
      strokeCap: strokeStyle.strokeCap,
      strokeJoin: strokeStyle.strokeJoin,
      cornerRadius: node.type === 'rect' ? node.cornerRadius : undefined,
      cornerRadii: node.type === 'rect' ? node.cornerRadii : undefined,
      ellipseStartAngle: node.type === 'ellipse' ? node.ellipseStartAngle : undefined,
      ellipseEndAngle: node.type === 'ellipse' ? node.ellipseEndAngle : undefined,
      ellipseDrawWedgeLine: node.type === 'ellipse' ? node.ellipseDrawWedgeLine : undefined,
      ellipseGeometry: node.type === 'ellipse' ? node.ellipseGeometry : undefined,
    }
  }

  if (node.type === 'polygon') {
    const effects = resolveAppearanceEffects(node)
    const strokeStyle = resolveAppearanceStroke(node, {
      strokes: node.strokes,
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    })
    return {
      id,
      type: 'shape',
      shape: 'polygon',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill ?? defaults.fillColor,
      stroke: node.stroke ?? defaults.strokeColor,
      strokeWidth: strokeStyle.strokeWidth,
      fills: resolveAppearanceFills(node, node.fills) as EngineShapeNode['fills'],
      strokes: strokeStyle.strokes as EngineShapeNode['strokes'],
      strokeAlign: strokeStyle.strokeAlign,
      strokeDashArray: strokeStyle.strokeDashArray,
      strokeCap: strokeStyle.strokeCap,
      strokeJoin: strokeStyle.strokeJoin,
      points: node.points,
      closed: node.closed ?? true,
    }
  }

  if (node.type === 'path') {
    const effects = resolveAppearanceEffects(node)
    const strokeStyle = resolveAppearanceStroke(node, {
      strokes: node.strokes,
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    })
    return {
      id,
      type: 'shape',
      shape: 'path',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill ?? defaults.fillColor,
      stroke: node.stroke ?? defaults.strokeColor,
      strokeWidth: strokeStyle.strokeWidth,
      fills: resolveAppearanceFills(node, node.fills) as EngineShapeNode['fills'],
      strokes: strokeStyle.strokes as EngineShapeNode['strokes'],
      strokeAlign: strokeStyle.strokeAlign,
      strokeDashArray: strokeStyle.strokeDashArray,
      strokeCap: strokeStyle.strokeCap,
      strokeJoin: strokeStyle.strokeJoin,
      points: node.points as EngineRenderableNode extends {points?: infer T} ? T : undefined,
      bezierPoints: node.bezierPoints as EngineRenderableNode extends {bezierPoints?: infer T} ? T : undefined,
      closed: node.closed,
      strokeStartArrowhead: node.strokeStartArrowhead,
      strokeEndArrowhead: node.strokeEndArrowhead,
    }
  }

  if (node.type === 'image') {
    const effects = resolveAppearanceEffects(node)
    return {
      id,
      type: 'image',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      assetId: node.assetId,
      sourceRect: node.sourceRect,
      naturalSize: node.naturalSize,
      imageSmoothing: node.imageSmoothing,
    }
  }

  throw new Error(`unsupported Venus node type: ${node.type}`)
}

export class Venus {
  private readonly parameters: VenusParameters
  private defaultFillColor: string
  private defaultStrokeColor: string
  private canvas: HTMLCanvasElement | null = null
  private engine: Engine | null = null
  private nodes: EngineRenderableNode[] = []
  private documentNodes: VenusNode[] = []
  private readonly history: VenusHistoryController<VenusNode[]> = createVenusHistoryController({
    limit: DEFAULT_HISTORY_LIMIT,
  })
  private readonly nodeById = new Map<string, VenusNode>()
  private readonly parentById = new Map<string, string | null>()
  private revision = 1
  private nodeIndex = 0
  private readonly listeners = new Map<VenusEventName, Set<VenusEventHandler>>()
  /** Tracks installed user-facing module names for diagnostics. */
  private readonly installedModules = new Set<VenusModuleName>()
  /** Stores the API object returned by each installed module's install callback. */
  private readonly moduleApis = new Map<VenusModuleName, unknown>()
  private lastModuleError: VenusModuleDiagnostics['lastError'] = null
  private readonly services = new Map<VenusInternalServiceName, unknown>()
  private readonly serviceRegistry: VenusServiceRegistry
  /** Stores current viewport state for camera commands and projection helpers. */
  private viewport: EngineCanvasViewportState = resolveEngineViewportState({
    viewportWidth: DEFAULT_VENUS_VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_VENUS_VIEWPORT_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })
  /** Stores current debug flags. */
  private debugFlags: VenusDebugFlags = {showBounds: false, showHitCandidates: false, showCache: false}
  /** Stores the latest measured render frame for diagnostics panels. */
  private lastFrameMeasurement: VenusFrameMeasurement | null = null
  /** Stores the latest automatic backend fallback for diagnostics panels. */
  private lastBackendFallback: VenusBackendFallback | null = null
  /** Stores the last pointer used for debug hit-candidate overlays. */
  private lastDebugHitPoint: {x: number; y: number} | null = null
  /**
   * Guard flag for {@link scheduleRender}.  True while a render microtask is
   * pending; cleared by {@link render} when the microtask executes.
   * Prevents redundant queuing of multiple renders for mutations within the
   * same synchronous block.
   */
  private renderScheduled = false

  // -- Document CRUD (Figma-style proxy API) --

  /**
   * @name Venus.add
   * @description Adds one document node to the current scene and returns a typed mutable proxy.
   * @example Usage
   * const r = venus.add({type: 'rect', width: 100, height: 80})
   * r.width = 200
   * r.fill = '#ff0000'
   * @param node Document node to append to the current scene.
   * @returns Typed proxy for the stored node.
   */
  add(node: VenusNode): VenusNodeProxy {
    sanitizeStructureGroupNode(node)
    this.recordHistory()
    const storedNode = this.ensureNodeId(node)
    const engineNode = toEngineNode(storedNode, storedNode.id ?? `node-${this.nodeIndex}`, this.getRenderDefaults())
    this.documentNodes = [...this.documentNodes, storedNode]
    this.indexNodeTree(storedNode, engineNode.id, null)
    this.nodes = [...this.nodes, engineNode]
    this.revision += 1
    this.emit('document:changed', {revision: this.revision, node: engineNode})
    this.scheduleRender()
    return createVenusNodeProxy(this, engineNode.id, storedNode.type)
  }

  /**
   * @name Venus.update
   * @description Updates one document node by id with a shallow property patch.
   * @example Usage
   * venus.update('card', {width: 280, fill: '#ff0000', opacity: 0.8})
   * await venus.render()
   * @param id Stable node id to update.
   * @param patch Properties to shallow-merge into the document node.
   * @returns Nothing.
   */
  update(id: string, patch: Partial<VenusNode>): void {
    const node = this.nodeById.get(id)
    if (!node) {
      return
    }

    this.recordHistory()
    const normalizedPatch = {...patch}
    applyStructureGroupGeometryPatch(node, normalizedPatch)
    applyBoundsPatchToAuthoredGeometry(node, normalizedPatch)
    // Mutate the stored VenusNode in place so rebuildRenderNodes picks up changes.
    Object.assign(node, normalizedPatch)
    sanitizeStructureGroupNode(node)
    this.rebuildRenderNodes()
    this.revision += 1

    const engineNode = this.nodes.find((n) => n.id === id)
    this.emit('document:changed', {revision: this.revision, node: engineNode})
    this.scheduleRender()
  }

  /**
   * @name Venus.remove
   * @description Removes one root-level document node by id and emits a document change.
   * @example Usage
   * venus.add({id: 'temp', type: 'rect', width: 80, height: 40})
   * venus.remove('temp')
   * @param id Stable node id to remove.
   * @returns Nothing.
   */
  remove(id: string): void {
    const index = this.documentNodes.findIndex((n) => n.id === id)
    if (index === -1) {
      return
    }

    this.recordHistory()
    this.documentNodes.splice(index, 1)
    this.nodes.splice(index, 1)
    this.nodeById.delete(id)
    this.parentById.delete(id)
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  /**
   * @name Venus.setDefaultFillColor
   * @description Sets the runtime fill colour used only when a node has no explicit fill or fills.
   * @example Usage
   * venus.setDefaultFillColor('transparent')
   * @param color CSS colour used as the runtime default fill.
   * @returns Nothing.
   */
  setDefaultFillColor(color: string): void {
    if (this.defaultFillColor === color) {
      return
    }

    this.defaultFillColor = color
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  /**
   * @name Venus.setDefaultStrokeColor
   * @description Sets the runtime stroke colour used only when a node has stroke width but no explicit stroke or strokes.
   * @example Usage
   * venus.setDefaultStrokeColor('#111827')
   * @param color CSS colour used as the runtime default stroke.
   * @returns Nothing.
   */
  setDefaultStrokeColor(color: string): void {
    if (this.defaultStrokeColor === color) {
      return
    }

    this.defaultStrokeColor = color
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  /**
   * @name Venus.group
   * @description Wraps sibling nodes under a structure-only group while preserving child geometry.
   * @example Usage
   * const a = venus.add({type: 'rect', x: 40, y: 40, width: 80, height: 60})
   * const b = venus.add({type: 'ellipse', x: 150, y: 52, width: 72, height: 48})
   * const g = venus.group([a.id, b.id], {name: 'Selection'})
   * @param ids Sibling node ids to group.
   * @param options Optional group metadata such as id, name, appearance, opacity, or shadow.
   * @returns Typed group proxy.
   */
  group(ids: readonly string[], options: VenusGroupOptions = {}): VenusNodeProxy {
    const uniqueIds = Array.from(new Set(ids))
    if (uniqueIds.length === 0) {
      throw new Error('group() requires at least one node id')
    }

    const parentId = this.parentById.get(uniqueIds[0]) ?? null
    if (uniqueIds.some((id) => (this.parentById.get(id) ?? null) !== parentId)) {
      throw new Error('group() requires sibling nodes with the same parent')
    }

    const siblings = this.resolveSiblingNodes(parentId)
    if (!siblings) {
      throw new Error(`Parent "${parentId ?? 'root'}" not found`)
    }

    const selected = uniqueIds.map((id) => {
      const node = this.nodeById.get(id)
      if (!node) {
        throw new Error(`Node "${id}" not found`)
      }
      return node
    })
    const selectedSet = new Set(selected)
    const selectedIndices = selected.map((node) => siblings.indexOf(node))
    if (selectedIndices.some((index) => index < 0)) {
      throw new Error('group() can only group direct children of the same parent')
    }

    this.recordHistory()
    const groupNode: VenusGroupNode = {
      ...options,
      type: 'group',
      id: options.id ?? this.createNodeId(),
      children: selected,
    }
    const insertIndex = Math.min(...selectedIndices)
    const nextSiblings = [
      ...siblings.slice(0, insertIndex).filter((node) => !selectedSet.has(node)),
      groupNode,
      ...siblings.slice(insertIndex).filter((node) => !selectedSet.has(node)),
    ]
    this.replaceSiblingNodes(parentId, nextSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
    return createVenusNodeProxy(this, groupNode.id ?? '', 'group')
  }

  /**
   * @name Venus.ungroup
   * @description Lifts a structure-only group's children back into the same parent.
   * @example Usage
   * const children = venus.ungroup('selection-group')
   * await venus.render()
   * @param id Group node id to ungroup.
   * @returns Proxies for the lifted children.
   */
  ungroup(id: string): VenusNodeProxy[] {
    const groupNode = this.nodeById.get(id)
    if (!groupNode || groupNode.type !== 'group') {
      return []
    }
    const parentId = this.parentById.get(id) ?? null
    const siblings = this.resolveSiblingNodes(parentId)
    if (!siblings) {
      return []
    }

    const groupIndex = siblings.indexOf(groupNode)
    if (groupIndex < 0) {
      return []
    }

    this.recordHistory()
    const children = groupNode.children.map((child) => this.ensureNodeId(child))

    const nextSiblings = [
      ...siblings.slice(0, groupIndex),
      ...children,
      ...siblings.slice(groupIndex + 1),
    ]
    this.replaceSiblingNodes(parentId, nextSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
    return children.map((child) => createVenusNodeProxy(this, child.id ?? '', child.type))
  }

  /**
   * @name Venus.addChild
   * @description Adds a child node to a group, clip, or mask container.
   * @example Usage
   * const child = venus.addChild('group-id', {type: 'rect', width: 60, height: 40})
   * child.x = 20
   * @param parentId Parent group, clip, or mask id.
   * @param child Child document node to append.
   * @returns Typed proxy for the newly added child.
   */
  addChild(parentId: string, child: VenusNode): VenusNodeProxy {
    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      throw new Error(`Parent "${parentId}" not found or is not a container (group/clip/mask)`)
    }

    sanitizeStructureGroupNode(child)
    this.recordHistory()
    const storedChild = this.ensureNodeId(child)
    parent.children = [...(parent.children ?? []), storedChild]
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
    return createVenusNodeProxy(this, storedChild.id ?? '', storedChild.type)
  }

  /**
   * @name Venus.removeChild
   * @description Removes a child node from a group, clip, or mask container by child id.
   * @example Usage
   * venus.removeChild('group-id', 'child-id')
   * await venus.render()
   * @param parentId Parent group, clip, or mask id.
   * @param childId Child node id to remove.
   * @returns Nothing.
   */
  removeChild(parentId: string, childId: string): void {
    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      return
    }

    if (!(parent.children ?? []).some((child) => child.id === childId)) {
      return
    }

    this.recordHistory()
    parent.children = (parent.children ?? []).filter((c) => c.id !== childId)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  /**
   * @name Venus.bounds
   * @description Returns the union bounding box of all root document nodes.
   * @example Usage
   * const box = venus.bounds()
   * @returns Axis-aligned document bounds.
   */
  bounds(): {x: number; y: number; width: number; height: number} {
    return resolveEngineNodesBounds(this.nodes) ?? {x: 0, y: 0, width: 0, height: 0}
  }

  /**
   * @name Venus.children
   * @description Returns all root-level document nodes without flattening container children.
   * @example Usage
   * const roots = venus.children()
   * @returns Root-level document nodes.
   */
  children(): readonly VenusNode[] {
    return this.documentNodes
  }

  /**
   * @name Venus.getNodeById
   * @description Looks up a document node by stable id and returns a mutable proxy, or null when missing.
   * @example Usage
   * const node = venus.getNodeById('card')
   * @param id Stable node id to look up.
   * @returns Typed node proxy, or null when no node exists for the id.
   */
  getNodeById(id: string): VenusNodeProxy | null {
    const node = this.nodeById.get(id)
    if (!node) return null
    return createVenusNodeProxy(this, node.id ?? id, node.type)
  }

  /** Returns a raw VenusNode from the internal store. Called by VenusNodeProxy getters. */
  _rawNode(id: string): VenusNode | undefined {
    return this.nodeById.get(id)
  }

  /** Internal bridge used by the optional export module. */
  _getMountedCanvas(): HTMLCanvasElement | null {
    return this.canvas
  }

  /**
   * @name Venus.getParentId
   * @description Returns the parent node id for a nested node, or null for a root node.
   * @example Usage
   * const parentId = venus.getParentId('rect-1')
   * @param id Child node id.
   * @returns Parent node id, or null for root nodes.
   */
  getParentId(id: string): string | null {
    return this.parentById.get(id) ?? null
  }

  /**
   * @name Venus.getLayerIndex
   * @description Returns one node's index among its siblings. Larger indexes render above smaller indexes.
   * @example Usage
   * const index = venus.getLayerIndex('card')
   * @param id Document node id.
   * @returns Sibling index, or -1 when the node cannot be found.
   */
  getLayerIndex(id: string): number {
    const node = this.nodeById.get(id)
    if (!node) {
      return -1
    }

    const siblings = this.resolveSiblingNodes(this.parentById.get(id) ?? null)
    return siblings?.indexOf(node) ?? -1
  }

  /**
   * @name Venus.moveLayer
   * @description Moves one node to a sibling index within its current parent.
   * @example Usage
   * venus.moveLayer('card', 0)
   * @param id Document node id.
   * @param index Target sibling index. Values are clamped.
   * @returns Applied sibling index, or -1 when the node cannot be found.
   */
  moveLayer(id: string, index: number): number {
    const node = this.nodeById.get(id)
    if (!node) {
      return -1
    }

    const parentId = this.parentById.get(id) ?? null
    const siblings = this.resolveSiblingNodes(parentId)
    const currentIndex = siblings?.indexOf(node) ?? -1
    if (!siblings || currentIndex < 0) {
      return -1
    }

    const targetIndex = Math.max(0, Math.min(siblings.length - 1, Math.trunc(index)))
    if (targetIndex === currentIndex) {
      return currentIndex
    }

    this.recordHistory()
    const nextSiblings = [...siblings]
    nextSiblings.splice(currentIndex, 1)
    nextSiblings.splice(targetIndex, 0, node)
    this.replaceSiblingNodes(parentId, nextSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
    return targetIndex
  }

  /**
   * @name Venus.bringForward
   * @description Moves one node one sibling step toward the front.
   * @example Usage
   * venus.bringForward('card')
   * @param id Document node id.
   * @returns Applied sibling index, or -1 when the node cannot be found.
   */
  bringForward(id: string): number {
    return this.moveLayer(id, this.getLayerIndex(id) + 1)
  }

  /**
   * @name Venus.sendBackward
   * @description Moves one node one sibling step toward the back.
   * @example Usage
   * venus.sendBackward('card')
   * @param id Document node id.
   * @returns Applied sibling index, or -1 when the node cannot be found.
   */
  sendBackward(id: string): number {
    return this.moveLayer(id, this.getLayerIndex(id) - 1)
  }

  /**
   * @name Venus.bringToFront
   * @description Moves one node above all current siblings.
   * @example Usage
   * venus.bringToFront('card')
   * @param id Document node id.
   * @returns Applied sibling index, or -1 when the node cannot be found.
   */
  bringToFront(id: string): number {
    const siblings = this.resolveSiblingNodes(this.parentById.get(id) ?? null)
    return this.moveLayer(id, (siblings?.length ?? 1) - 1)
  }

  /**
   * @name Venus.sendToBack
   * @description Moves one node below all current siblings.
   * @example Usage
   * venus.sendToBack('card')
   * @param id Document node id.
   * @returns Applied sibling index, or -1 when the node cannot be found.
   */
  sendToBack(id: string): number {
    return this.moveLayer(id, 0)
  }

  /**
   * @name Venus.undo
   * @description Restores the previous document snapshot from command history.
   * @example Usage
   * venus.undo()
   * @returns True when a history entry was applied.
   */
  undo(): boolean {
    const history = this._requireModuleApi<{undo(): boolean}>('history')
    return history.undo()
  }

  /**
   * @name Venus.redo
   * @description Reapplies the next document snapshot from command history.
   * @example Usage
   * venus.redo()
   * @returns True when a history entry was applied.
   */
  redo(): boolean {
    const history = this._requireModuleApi<{redo(): boolean}>('history')
    return history.redo()
  }

  /**
   * @name Venus.canUndo
   * @description Reports whether undo has a previous document snapshot.
   * @example Usage
   * if (venus.canUndo()) venus.undo()
   * @returns True when undo is available.
   */
  canUndo(): boolean {
    const history = this._getModuleApi<{canUndo(): boolean}>('history')
    return history?.canUndo() ?? false
  }

  /**
   * @name Venus.canRedo
   * @description Reports whether redo has a future document snapshot.
   * @example Usage
   * if (venus.canRedo()) venus.redo()
   * @returns True when redo is available.
   */
  canRedo(): boolean {
    const history = this._getModuleApi<{canRedo(): boolean}>('history')
    return history?.canRedo() ?? false
  }

  /**
   * @name Venus.clearHistory
   * @description Clears undo and redo stacks without modifying the document.
   * @example Usage
   * venus.clearHistory()
   * @returns Nothing.
   */
  clearHistory(): void {
    const history = this._requireModuleApi<{clear(): void}>('history')
    history.clear()
  }

  /**
   * @name Venus.snapshot
   * @description Returns a render-facing scene snapshot for the current document.
   * @example Usage
   * const snap = venus.snapshot()
   * console.log(snap.revision, snap.nodes.length)
   * @returns Current engine scene snapshot.
   */
  snapshot(): EngineSceneSnapshot {
    return this.createSnapshot()
  }

  // -- Camera (flat) --

  /**
   * @name Venus.fitBounds
   * @description Fits the given document-space bounds into the viewport and returns the applied camera state.
   * @example Usage
   * venus.fitBounds(venus.bounds(), 32)
   * @param bounds Document-space bounds to fit.
   * @param padding Optional viewport padding.
   * @returns Applied viewport scale and offset.
   */
  fitBounds(bounds: {x: number; y: number; width: number; height: number}, padding: number | {top: number; right: number; bottom: number; left: number} = 0): {scale: number; offsetX: number; offsetY: number} {
    this.requireModuleInstalled('camera')
    return this.applyViewport(resolveVenusCameraFitBounds(this.viewport, bounds, padding))
  }

  /**
   * @name Venus.zoomTo
   * @description Sets the viewport scale around an optional screen anchor without modifying document geometry.
   * @example Usage
   * venus.zoomTo(2.0, {x: 200, y: 150})
   * @param scale Target zoom scale.
   * @param anchor Optional screen anchor point.
   * @returns Applied viewport scale and offset.
   */
  zoomTo(scale: number, anchor?: {x: number; y: number}): {scale: number; offsetX: number; offsetY: number} {
    this.requireModuleInstalled('camera')
    return this.applyViewport(resolveVenusCameraZoom(this.viewport, scale, anchor))
  }

  /**
   * @name Venus.panBy
   * @description Moves the viewport by a screen-space delta without moving document objects.
   * @example Usage
   * venus.panBy({x: 50, y: -30})
   * @param delta Screen-space movement amount.
   * @returns Applied viewport scale and offset.
   */
  panBy(delta: {x: number; y: number}): {scale: number; offsetX: number; offsetY: number} {
    this.requireModuleInstalled('camera')
    return this.applyViewport(resolveVenusCameraPan(this.viewport, delta))
  }

  /**
   * @name Venus.project
   * @description Converts a document-space point to screen coordinates using the current camera transform.
   * @example Usage
   * const screen = venus.project({x: 260, y: 160})
   * @param point Document-space coordinate.
   * @returns Screen-space coordinate.
   */
  project(point: {x: number; y: number}): {x: number; y: number} {
    this.requireModuleInstalled('camera')
    return projectVenusCameraPoint(this.viewport, point)
  }

  /**
   * @name Venus.unproject
   * @description Converts a screen-space point back to document coordinates using the inverse camera transform.
   * @example Usage
   * const doc = venus.unproject({x: 200, y: 150})
   * @param point Screen-space coordinate.
   * @returns Document-space coordinate.
   */
  unproject(point: {x: number; y: number}): {x: number; y: number} {
    this.requireModuleInstalled('camera')
    return unprojectVenusCameraPoint(this.viewport, point)
  }

  // -- Debug (flat) --

  /**
   * @name Venus.enableDebug
   * @description Enables selected diagnostics and returns the active debug flags.
   * @example Usage
   * venus.enableDebug({showBounds: true})
   * @param options Debug flags to enable or disable.
   * @param options.showBounds Draws geometry bounds overlays.
   * @param options.showHitCandidates Displays hit-test candidates.
   * @param options.showCache Includes normalized cache diagnostics in inspect().cache.
   * @returns Active debug flags.
   */
  enableDebug(options: {showBounds?: boolean; showHitCandidates?: boolean; showCache?: boolean}): VenusDebugFlags {
    this.requireModuleInstalled('debug')
    if (options.showBounds !== undefined) this.debugFlags.showBounds = options.showBounds
    if (options.showHitCandidates !== undefined) this.debugFlags.showHitCandidates = options.showHitCandidates
    if (options.showCache !== undefined) this.debugFlags.showCache = options.showCache
    this.refreshDebugOverlay()
    return {...this.debugFlags}
  }

  /**
   * @name Venus.inspect
   * @description Returns the current Venus and engine diagnostics snapshot.
   * @example Usage
   * const diag = venus.inspect()
   * @returns Current runtime inspection data.
   */
  inspect(): VenusRuntimeInspection {
    const engine = this.engine?.getDiagnostics() ?? null

    return {
      revision: this.revision,
      nodeCount: this.documentNodes.length,
      mounted: Boolean(this.engine),
      debug: {...this.debugFlags},
      viewport: {
        scale: this.viewport.scale,
        offsetX: this.viewport.offsetX,
        offsetY: this.viewport.offsetY,
        viewportWidth: this.viewport.viewportWidth,
        viewportHeight: this.viewport.viewportHeight,
      },
      lastFrameMeasurement: this.lastFrameMeasurement
        ? {
          frameTimeMs: this.lastFrameMeasurement.frameTimeMs,
          revision: this.lastFrameMeasurement.revision,
        }
        : null,
      cache: createVenusCacheDiagnostics(this.debugFlags.showCache, engine),
      backendFallback: this.lastBackendFallback ? {...this.lastBackendFallback} : null,
      modules: {
        installed: this.modules(),
        lastError: this.lastModuleError ? {...this.lastModuleError} : null,
      },
      engine,
    }
  }

  /**
   * @name Venus.measureFrame
   * @description Profiles the next render frame and returns timing data.
   * @example Usage
   * const timing = await venus.measureFrame()
   * @returns Frame timing data, or null when the runtime is not mounted.
   */
  async measureFrame(): Promise<VenusFrameMeasurement | null> {
    this.requireModuleInstalled('debug')
    if (!this.engine) {
      return null
    }

    const startedAt = getVenusNow()
    await this.render()
    const frameTimeMs = Math.max(0, getVenusNow() - startedAt)
    const measurement: VenusFrameMeasurement = {
      frameTimeMs,
      revision: this.revision,
      diagnostics: this.engine.getDiagnostics(),
    }
    this.lastFrameMeasurement = measurement
    return measurement
  }

  /**
   * @name Venus.constructor
   * @description Creates a Venus runtime with optional renderer, debug, and module parameters.
   * @example Usage
   * const venus = new Venus({render: {backend: 'canvas2d'}})
   * @param parameters Optional runtime configuration.
   */
  constructor(parameters: VenusParameters = {}) {
    this.parameters = parameters
    const renderDefaults = resolveVenusRenderDefaults(parameters)
    this.defaultFillColor = renderDefaults.fillColor
    this.defaultStrokeColor = renderDefaults.strokeColor
    this.registerInternalServices()
    this.serviceRegistry = new VenusReadonlyServiceRegistry(this.services)
    this.installModules(parameters.modules ?? [])
  }

  /**
   * @name Venus.modules
   * @description Returns the installed user capability module names.
   * @example Usage
   * const installed = venus.modules()
   * @returns Installed module names.
   */
  modules(): readonly VenusModuleName[] {
    return [...this.installedModules]
  }

  private registerInternalServices(): void {
    this.services.set('document', {
      snapshot: () => this.snapshot(),
      children: () => this.children(),
      bounds: () => this.bounds(),
    })
    this.services.set('viewport', {
      project: (point: {x: number; y: number}) => projectVenusCameraPoint(this.viewport, point),
      unproject: (point: {x: number; y: number}) => unprojectVenusCameraPoint(this.viewport, point),
    })
    this.services.set('invalidation', {
      classify: (changedProperties: readonly string[]) => classifyVenusNodeMutation(changedProperties),
    })
    // Layer 0 infrastructure services.
    this.services.set('spatial', createVenusSpatialService())
    this.services.set('geometryCache', createVenusGeometryCacheService())
    this.services.set('scheduler', createVenusSchedulerService())
  }

  private installModules(modules: readonly VenusModule[]): void {
    for (const module of modules) {
      if (this.installedModules.has(module.name)) {
        this.failModuleInstall(module.name, `Venus module "${module.name}" is already installed`)
      }

      for (const dependencyName of module.dependsOn ?? []) {
        if (!this.installedModules.has(dependencyName)) {
          this.failModuleInstall(module.name, `Venus module "${module.name}" requires module "${dependencyName}" to be installed first`)
        }
      }

      try {
        for (const serviceName of module.requires ?? []) {
          this.serviceRegistry.require(serviceName)
        }
      } catch (error) {
        this.failModuleInstall(module.name, error instanceof Error ? error.message : String(error))
      }

      this.installedModules.add(module.name)
      const api = module.install({
        venus: this,
        parameters: this.parameters,
        services: this.serviceRegistry,
      })
      // Capture the module's returned API so it can be accessed later.
      if (api !== undefined) {
        this.moduleApis.set(module.name, api)
      }
    }
  }

  /**
   * Returns the typed API object installed by a module, or throws if the
   * module is not installed.  Use this inside Venus methods that belong to
   * optional modules so the error message is clear when a consumer omits
   * a required module.
   * @param moduleName The short module name to look up.
   */
  private _requireModuleApi<T>(moduleName: VenusModuleName): T {
    const api = this.moduleApis.get(moduleName)
    if (api === undefined) {
      throw new Error(
        `Venus module "${moduleName}" is not installed. ` +
        `Add it to the modules array in the Venus constructor: ` +
        `new Venus({ modules: [/* ... */] })`,
      )
    }
    return api as T
  }

  /**
   * Returns the typed API object installed by a module, or null when the
   * module is not installed.  Use this for optional capabilities that
   * degrade gracefully.
   * @param moduleName The short module name to look up.
   */
  private _getModuleApi<T>(moduleName: VenusModuleName): T | null {
    return (this.moduleApis.get(moduleName) as T) ?? null
  }

  /** Throws when an optional module API is used without installing that module. */
  private requireModuleInstalled(moduleName: VenusModuleName): void {
    if (!this.installedModules.has(moduleName)) {
      throw new Error(
        `Venus module "${moduleName}" is not installed. ` +
        `Add it to the modules array in the Venus constructor: ` +
        `new Venus({ modules: [/* ... */] })`,
      )
    }
  }

  private failModuleInstall(moduleName: VenusModuleName, reason: string): never {
    this.lastModuleError = {
      module: moduleName,
      reason,
    }
    throw new Error(reason)
  }

  /**
   * Stores viewport state locally and mirrors it into the mounted engine.
   * @param viewport Next resolved viewport state.
   */
  private applyViewport(viewport: EngineCanvasViewportState): {scale: number; offsetX: number; offsetY: number} {
    this.viewport = viewport
    this.engine?.setViewport({
      viewportWidth: viewport.viewportWidth,
      viewportHeight: viewport.viewportHeight,
      scale: viewport.scale,
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
    })
    return {scale: viewport.scale, offsetX: viewport.offsetX, offsetY: viewport.offsetY}
  }

  private createNodeId(): string {
    const id = `node-${this.nodeIndex}`
    this.nodeIndex += 1
    return id
  }

  private ensureNodeId<TNode extends VenusNode>(node: TNode): TNode {
    if (node.id) {
      return node
    }

    node.id = this.createNodeId()
    return node
  }

  private getRenderDefaults(): VenusRenderDefaults {
    return {
      fillColor: this.defaultFillColor,
      strokeColor: this.defaultStrokeColor,
    }
  }

  private recordHistory(): void {
    if (!this.installedModules.has('history')) {
      return
    }

    this.history.record(this.documentNodes)
  }

  /** Internal bridge used by the optional history module. */
  _historyUndo(): boolean {
    const previous = this.history.undo(this.documentNodes)
    if (!previous) {
      return false
    }

    this.restoreDocumentNodes(previous)
    return true
  }

  /** Internal bridge used by the optional history module. */
  _historyRedo(): boolean {
    const next = this.history.redo(this.documentNodes)
    if (!next) {
      return false
    }

    this.restoreDocumentNodes(next)
    return true
  }

  /** Internal bridge used by the optional history module. */
  _historyCanUndo(): boolean {
    return this.history.canUndo()
  }

  /** Internal bridge used by the optional history module. */
  _historyCanRedo(): boolean {
    return this.history.canRedo()
  }

  /** Internal bridge used by the optional history module. */
  _historyClear(): void {
    this.history.clear()
  }

  private restoreDocumentNodes(nodes: VenusNode[]): void {
    this.documentNodes = nodes
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  private resolveSiblingNodes(parentId: string | null): VenusNode[] | null {
    if (!parentId) {
      return this.documentNodes
    }

    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      return null
    }

    return parent.children
  }

  private replaceSiblingNodes(parentId: string | null, nextSiblings: VenusNode[]): void {
    if (!parentId) {
      this.documentNodes = nextSiblings
      return
    }

    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      return
    }

    parent.children = nextSiblings
  }

  /**
   * Rebuilds render-facing nodes after document object mutation.
   */
  private rebuildRenderNodes(): void {
    this.nodeById.clear()
    this.parentById.clear()
    this.nodes = this.documentNodes.map((node, index) => {
      sanitizeStructureGroupNode(node)
      const engineNode = toEngineNode(node, node.id ?? `node-${index}`, this.getRenderDefaults())
      this.indexNodeTree(node, engineNode.id, null)
      return engineNode
    })
  }

  private indexNodeTree(node: VenusNode, fallbackId: string, parentId: string | null) {
    const id = node.id ?? fallbackId
    this.nodeById.set(id, node)
    this.parentById.set(id, parentId)

    if (node.type === 'group') {
      node.children.forEach((child, index) => this.indexNodeTree(child, child.id ?? `${id}-child-${index}`, id))
      return
    }

    if (node.type === 'clip' || node.type === 'mask') {
      this.indexNodeTree(node.clipPath, node.clipPath.id ?? `${id}-clip-path`, id)
      node.children.forEach((child, index) => this.indexNodeTree(child, child.id ?? `${id}-clip-child-${index}`, id))
    }
  }

  /**
   * @name Venus.on
   * @description Registers a handler for one event channel and returns an unsubscribe function.
   * @example Usage
   * const off = venus.on('render:after', () => console.log('frame done'))
   * off()
   * @param eventName Event channel to subscribe to.
   * @param handler Callback invoked when the event fires.
   * @returns Unsubscribe function.
   */
  on<TEventName extends VenusEventName>(
    eventName: TEventName,
    handler: VenusEventHandler<TEventName>,
  ) {
    const handlers = this.listeners.get(eventName) ?? new Set<VenusEventHandler>()
    handlers.add(handler as VenusEventHandler)
    this.listeners.set(eventName, handlers)

    return () => this.off(eventName, handler)
  }

  /**
   * @name Venus.off
   * @description Removes a previously registered event handler from one event channel.
   * @example Usage
   * const handler = () => {}
   * venus.on('hit', handler)
   * venus.off('hit', handler)
   * @param eventName Event channel to unsubscribe from.
   * @param handler The same function reference passed to on().
   * @returns Nothing.
   */
  off<TEventName extends VenusEventName>(
    eventName: TEventName,
    handler: VenusEventHandler<TEventName>,
  ) {
    const handlers = this.listeners.get(eventName)
    if (!handlers) {
      return
    }

    handlers.delete(handler as VenusEventHandler)
    if (handlers.size === 0) {
      this.listeners.delete(eventName)
    }
  }

  /**
   * @name Venus.mount
   * @description Mounts the engine onto an HTML canvas element and creates the internal renderer.
   * @example Usage
   * venus.mount(document.querySelector('canvas')!)
   * venus.add({type: 'rect', width: 200, height: 120})
   * await venus.render()
   * @param canvas The canvas element to render into.
   * @returns Nothing.
   */
  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = this.createMountedEngine(canvas)
    this.applyViewport(this.viewport)
    this.emit('mounted', {canvas})
  }

  private createMountedEngine(canvas: HTMLCanvasElement): Engine {
    const result = createVenusMountedEngine({
      canvas,
      parameters: this.parameters,
      snapshot: this.createSnapshot(),
      emitBackendFallback: (fallback) => this.emit('backend:fallback', fallback),
    })
    this.lastBackendFallback = result.backendFallback
    return result.engine
  }

  /**
   * @name Venus.resize
   * @description Resizes the canvas output and updates viewport dimensions.
   * @example Usage
   * venus.resize({width: 800, height: 600})
   * await venus.render()
   * @param size Logical viewport size.
   * @param size.width New logical width.
   * @param size.height New logical height.
   * @returns Nothing.
   */
  resize(size: {width: number, height: number}) {
    this.applyViewport(resolveEngineViewportState({
      viewportWidth: size.width,
      viewportHeight: size.height,
      scale: this.viewport.scale,
      offsetX: this.viewport.offsetX,
      offsetY: this.viewport.offsetY,
    }))

    if (!this.canvas || !this.engine) {
      return
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(size.width * pixelRatio)
    this.canvas.height = Math.round(size.height * pixelRatio)
    this.engine.resize({
      viewportWidth: size.width,
      viewportHeight: size.height,
      outputWidth: this.canvas.width,
      outputHeight: this.canvas.height,
    })
    this.emit('resized', size)
  }

  /**
   * @name Venus.render
   * @description Renders the current document state to the mounted canvas.
   * @example Usage
   * venus.add({type: 'rect', width: 160, height: 96})
   * await venus.render()
   * @returns Promise that resolves after the frame is rendered.
   */
  async render() {
    this.renderScheduled = false
    if (!this.engine) {
      return
    }

    this.emit('render:before', {revision: this.revision})
    this.engine.loadScene(this.createSnapshot())
    this.refreshDebugOverlay()
    await this.engine.renderFrame()
    this.emit('render:after', {revision: this.revision})
  }

  // ── Export (delegates to export module) ──────────────────────────────────

  /**
   * @name Venus.toPNG
   * @description Exports the current canvas as a PNG data URL.
   * @example Usage
   * const url = await venus.toPNG({ scale: 2 })
   * @param options.scale Output scale factor (default 1).
   * @param options.background Background color (default transparent).
   * @returns PNG data URL.
   */
  async toPNG(options?: { scale?: number; background?: string }): Promise<string> {
    const exp = this._requireModuleApi<{ toPNG(o?: { scale?: number; background?: string }): Promise<string> }>('export')
    return exp.toPNG(options)
  }

  /**
   * @name Venus.toJPEG
   * @description Exports the current canvas as a JPEG data URL.
   * @example Usage
   * const url = await venus.toJPEG({ quality: 0.9, background: '#ffffff' })
   * @param options.scale Output scale factor (default 1).
   * @param options.quality JPEG quality 0–1 (default 0.92).
   * @param options.background Background color (default white).
   * @returns JPEG data URL.
   */
  async toJPEG(options?: { scale?: number; quality?: number; background?: string }): Promise<string> {
    const exp = this._requireModuleApi<{ toJPEG(o?: { scale?: number; quality?: number; background?: string }): Promise<string> }>('export')
    return exp.toJPEG(options)
  }

  /**
   * @name Venus.toSVG
   * @description Exports the current document as an SVG string.
   * @example Usage
   * const svg = await venus.toSVG({ embedImages: true })
   * @param options.embedImages Whether to embed images as data URIs (default false).
   * @returns SVG string.
   */
  async toSVG(options?: { embedImages?: boolean }): Promise<string> {
    const exp = this._requireModuleApi<{ toSVG(o?: { embedImages?: boolean }): Promise<string> }>('export')
    return exp.toSVG(options)
  }

  /**
   * Coalesces multiple synchronous mutations into a single deferred render.
   *
   * Uses `queueMicrotask` (not `requestAnimationFrame`) so the render fires
   * at the microtask checkpoint immediately after the current synchronous
   * block completes — perceived as zero-delay by the caller.  The
   * {@link renderScheduled} guard prevents redundant queuing: if a render is
   * already pending in the microtask queue, subsequent mutations update the
   * store but skip re-enqueuing.
   *
   * Example:
   * ```
   * r.x = 200        // queueMicrotask → pending
   * r.fill = '#f00'  // guard blocks re-enqueue
   * r.width = 160    // guard blocks re-enqueue
   * // ← synchronous block ends, microtask fires, single render executes
   * ```
   *
   * Contrast with `requestAnimationFrame`: rAF defers to the next vsync
   * (~16ms), introducing visible flicker for rapid mutations.
   * `queueMicrotask` guarantees near-instant feedback.
   */
  private scheduleRender(): void {
    if (this.renderScheduled) {
      return
    }
    this.renderScheduled = true
    queueMicrotask(() => {
      this.renderScheduled = false
      void this.render()
    })
  }

  /**
   * @name Venus.hitTest
   * @description Finds the topmost document node under a screen-space point.
   * @example Usage
   * const hit = venus.hitTest({x: 200, y: 150}, {phase: 'click'})
   * @param point Point to test in screen space.
   * @param options Hit-test options.
   * @param options.phase Sets hover or click defaults.
   * @param options.tolerance Screen-pixel tolerance override.
   * @param options.includeLocked Returns locked hits only when enabled.
   * @returns Topmost hit result, or null.
   */
  hitTest(point: {x: number, y: number}, options: VenusHitTestOptions = {}): VenusDetailedHitTestResult | null {
    this.requireModuleInstalled('hitTest')
    const resolvedOptions = resolveVenusHitTestOptions(options)
    const hits = this.resolveDetailedHits(point, resolvedOptions)
    const result = hits[0] ?? null
    this.lastDebugHitPoint = point
    this.refreshDebugOverlay()
    this.emit('hit', {
      point,
      phase: resolvedOptions.phase,
      tolerance: resolvedOptions.tolerance,
      result,
    })
    return result
  }

  /**
   * @name Venus.hitTestAll
   * @description Returns all document nodes under a screen-space point in topmost-first paint order.
   * @example Usage
   * const hits = venus.hitTestAll({x: 200, y: 150}, {phase: 'hover'})
   * @param point Point to test in screen space.
   * @param options Hit-test options.
   * @param options.phase Sets hover or click defaults.
   * @param options.tolerance Screen-pixel tolerance override.
   * @param options.includeLocked Returns locked hits only when enabled.
   * @returns Ordered hit results with target, region, anchor, center, and bounds metadata.
   */
  hitTestAll(point: {x: number, y: number}, options: VenusHitTestOptions = {}): VenusDetailedHitTestResult[] {
    this.requireModuleInstalled('hitTest')
    return this.resolveDetailedHits(point, resolveVenusHitTestOptions(options))
  }

  private resolveDetailedHits(
    point: {x: number; y: number},
    options: ReturnType<typeof resolveVenusHitTestOptions>,
  ): VenusDetailedHitTestResult[] {
    return resolveVenusDetailedHits({
      point,
      options,
      hits: this.engine?.hitTestAll(point, options.tolerance) ?? [],
      resolveNode: (id) => this._rawNode(id),
      resolveBounds: getNodeBounds,
    })
  }

  // ── Selection (delegates to interaction module) ──────────────────────────

  /**
   * @name Venus.select
   * @description Selects one or more document node ids.
   * @example Usage
   * venus.select('rect-1')
   * venus.select(['rect-1', 'ellipse-2'])
   * @param ids A single node id or an array of node ids to select.
   */
  select(ids: string | readonly string[]): void {
    const interaction = this._requireModuleApi<{ select(ids: string | readonly string[]): void }>('interaction')
    interaction.select(ids)
  }

  /**
   * @name Venus.deselect
   * @description Deselects one or more document node ids.
   * @example Usage
   * venus.deselect('rect-1')
   * @param ids A single node id or an array of node ids to deselect.
   */
  deselect(ids: string | readonly string[]): void {
    const interaction = this._requireModuleApi<{ deselect(ids: string | readonly string[]): void }>('interaction')
    interaction.deselect(ids)
  }

  /**
   * @name Venus.selectAll
   * @description Selects every root-level document node.
   * @example Usage
   * venus.selectAll()
   */
  selectAll(): void {
    const interaction = this._requireModuleApi<{ selectAll(): void }>('interaction')
    interaction.selectAll()
  }

  /**
   * @name Venus.clearSelection
   * @description Clears the current selection.
   * @example Usage
   * venus.clearSelection()
   */
  clearSelection(): void {
    const interaction = this._requireModuleApi<{ clearSelection(): void }>('interaction')
    interaction.clearSelection()
  }

  /**
   * @name Venus.isSelected
   * @description Returns whether a node id is currently selected.
   * @example Usage
   * if (venus.isSelected('rect-1')) { ... }
   * @param id The node id to check.
   * @returns True when the node is in the current selection.
   */
  isSelected(id: string): boolean {
    const interaction = this._requireModuleApi<{ isSelected(id: string): boolean }>('interaction')
    return interaction.isSelected(id)
  }

  /**
   * @name Venus.onSelectionChange
   * @description Registers a callback that fires when the selection changes.
   * @example Usage
   * const off = venus.onSelectionChange((sel) => console.log([...sel]))
   * @param handler Callback receiving a read-only snapshot of selected ids.
   * @returns Unsubscribe function.
   */
  onSelectionChange(handler: (selection: ReadonlySet<string>) => void): () => void {
    const interaction = this._requireModuleApi<{ onSelectionChange(h: (s: ReadonlySet<string>) => void): () => void }>('interaction')
    return interaction.onSelectionChange(handler)
  }

  // ── Effects (delegates to effects module) ────────────────────────────────

  /**
   * @name Venus.applyDropShadow
   * @description Applies a drop shadow effect to a node by id.
   * @example Usage
   * venus.applyDropShadow('rect-1', { color: '#00000040', offsetX: 4, offsetY: 4, blur: 8 })
   * @param nodeId Target node id.
   * @param shadow Shadow parameters.
   */
  applyDropShadow(nodeId: string, shadow: { color?: string; offsetX?: number; offsetY?: number; blur?: number }): void {
    const effects = this._requireModuleApi<{ applyDropShadow(id: string, s: typeof shadow): void }>('effects')
    effects.applyDropShadow(nodeId, shadow)
  }

  /**
   * @name Venus.removeDropShadow
   * @description Removes the drop shadow from a node.
   * @example Usage
   * venus.removeDropShadow('rect-1')
   * @param nodeId Target node id.
   */
  removeDropShadow(nodeId: string): void {
    const effects = this._requireModuleApi<{ removeDropShadow(id: string): void }>('effects')
    effects.removeDropShadow(nodeId)
  }

  /**
   * @name Venus.applyInnerShadow
   * @description Applies an inner shadow effect to a node by id.
   * @example Usage
   * venus.applyInnerShadow('rect-1', { color: '#00000030', blur: 4 })
   * @param nodeId Target node id.
   * @param shadow Inner shadow parameters.
   */
  applyInnerShadow(nodeId: string, shadow: { color?: string; blur?: number }): void {
    const effects = this._requireModuleApi<{ applyInnerShadow(id: string, s: typeof shadow): void }>('effects')
    effects.applyInnerShadow(nodeId, shadow)
  }

  /**
   * @name Venus.removeInnerShadow
   * @description Removes the inner shadow from a node.
   * @example Usage
   * venus.removeInnerShadow('rect-1')
   * @param nodeId Target node id.
   */
  removeInnerShadow(nodeId: string): void {
    const effects = this._requireModuleApi<{ removeInnerShadow(id: string): void }>('effects')
    effects.removeInnerShadow(nodeId)
  }

  /**
   * @name Venus.applyLayerBlur
   * @description Applies a layer blur effect to a node by id.
   * @example Usage
   * venus.applyLayerBlur('rect-1', { amount: 4 })
   * @param nodeId Target node id.
   * @param blur Blur parameters.
   */
  applyLayerBlur(nodeId: string, blur: { amount: number }): void {
    const effects = this._requireModuleApi<{ applyLayerBlur(id: string, b: typeof blur): void }>('effects')
    effects.applyLayerBlur(nodeId, blur)
  }

  /**
   * @name Venus.removeLayerBlur
   * @description Removes the layer blur from a node.
   * @example Usage
   * venus.removeLayerBlur('rect-1')
   * @param nodeId Target node id.
   */
  removeLayerBlur(nodeId: string): void {
    const effects = this._requireModuleApi<{ removeLayerBlur(id: string): void }>('effects')
    effects.removeLayerBlur(nodeId)
  }

  /**
   * @name Venus.clearEffects
   * @description Clears all visual effects from a node.
   * @example Usage
   * venus.clearEffects('rect-1')
   * @param nodeId Target node id.
   */
  clearEffects(nodeId: string): void {
    const effects = this._requireModuleApi<{ clearAll(id: string): void }>('effects')
    effects.clearAll(nodeId)
  }

  /**
   * @name Venus.animate
   * @description Returns an animation controller for numeric document property transitions.
   * @example Usage
   * const anim = venus.animate('card', [{x: 40}, {x: 220}], {duration: 600})
   * anim.cancel()
   * @param nodeId Document node id to animate.
   * @param keyframes Start and end property snapshots.
   * @param options Animation options.
   * @param options.duration Animation duration in milliseconds.
   * @param options.easing Timing curve.
   * @returns Animation controller.
   */
  animate(
    nodeId: string,
    keyframes: readonly [VenusAnimationKeyframe, VenusAnimationKeyframe],
    options: VenusAnimationOptions = {},
  ): VenusAnimationController {
    this.requireModuleInstalled('animate')
    return createVenusAnimationController({
      node: this._rawNode(nodeId),
      keyframes,
      options,
      onFrame: () => {
        this.rebuildRenderNodes()
        this.revision += 1
        void this.render()
      },
    })
  }

  /**
   * @name Venus.destroy
   * @description Disposes the engine instance, clears event listeners, and releases canvas resources.
   * @example Usage
   * venus.destroy()
   * @returns Nothing.
   */
  destroy() {
    this.engine?.dispose()
    this.engine = null
    this.canvas = null
    this.emit('destroyed', {})
    this.listeners.clear()
  }

  private createSnapshot(): EngineSceneSnapshot {
    return {
      ...createEmptyVenusSceneSnapshot(this.revision),
      nodes: this.nodes,
    }
  }

  /**
   * Synchronizes active debug flags into engine overlay draw nodes.
   */
  private refreshDebugOverlay(): void {
    if (!this.engine) {
      return
    }

    const hitCandidateNodeIds = this.debugFlags.showHitCandidates && this.lastDebugHitPoint
      ? this.engine.prepareHitPlan(this.lastDebugHitPoint, VENUS_DEBUG_HIT_TOLERANCE).candidateNodeIds
      : []
    this.engine.setOverlayNodes(createVenusDebugOverlayNodes(this.nodes, this.debugFlags, hitCandidateNodeIds))
  }

  private emit<TEventName extends VenusEventName>(
    eventName: TEventName,
    event: VenusEventMap[TEventName],
  ) {
    const handlers = this.listeners.get(eventName)
    if (!handlers) {
      return
    }

    handlers.forEach((handler) => handler(event))
  }
}
