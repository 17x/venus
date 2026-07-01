import {createEngine, type Engine, type EngineRuntimeDiagnostics} from '../createEngine/createEngine.ts'
import {applyMatrixToPoint} from '../../math/matrix/matrix.ts'
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
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../../interaction/viewport/viewport.ts'
import type {EngineOverlayDrawNode} from '../../interaction/overlayCanvas.ts'
import {
  createVenusNodeProxy,
  type VenusNodeProxy,
} from './VenusNodeProxy.ts'

export type VenusBackend = 'canvas2d' | 'webgl' | 'auto'

/** Lists short user-facing capability module names reserved by Venus. */
export const VENUS_MODULE_NAMES = [
  'render',
  'camera',
  'hitTest',
  'select',
  'snap',
  'animate',
  'debug',
  'scale',
  'effects',
  'history',
  'export',
] as const

/** Declares one short public Venus capability module name. */
export type VenusModuleName = (typeof VENUS_MODULE_NAMES)[number]

/** Lists internal foundation services available to installed modules. */
export const VENUS_INTERNAL_SERVICE_NAMES = [
  'document',
  'sceneStore',
  'geometry',
  'spatial',
  'geometryCache',
  'invalidation',
  'viewport',
  'renderPlan',
  'scheduler',
  'resource',
  'backendBridge',
] as const

/** Declares one internal foundation service name. */
export type VenusInternalServiceName = (typeof VENUS_INTERNAL_SERVICE_NAMES)[number]

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

/** Maps registered internal service names to their typed service contracts. */
export interface VenusRegisteredServiceMap {
  document: VenusDocumentService
  viewport: VenusViewportService
  invalidation: VenusInvalidationService
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
  /** Installs module behavior on one Venus instance. */
  install(context: VenusModuleContext): void
}

/** Returns whether a string is one reserved Venus user capability module name. */
export function isVenusModuleName(name: string): name is VenusModuleName {
  return (VENUS_MODULE_NAMES as readonly string[]).includes(name)
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
  'hitTest',
  'on',
  'off',
  'modules',
  'animate',
  'destroy',
  'update',
  'remove',
  'group',
  'ungroup',
  'addChild',
  'removeChild',
] as const

/** Declares one public instance method documented for `Venus`. */
export type VenusPublicMethodName = (typeof VENUS_PUBLIC_METHOD_NAMES)[number]

/** Declares the pivot used when composing a Venus node transform. */
export type VenusTransformOrigin = {
  /** Horizontal pivot position, interpreted as a ratio by default. */
  x: number
  /** Vertical pivot position, interpreted as a ratio by default. */
  y: number
  /** Unit used by the pivot values. */
  unit?: 'ratio' | 'px'
}

/** Declares editable 2D transform fields stored on a Venus document node. */
export type VenusTransform2D = {
  /** Extra local x translation applied in addition to geometry x. */
  x?: number
  /** Extra local y translation applied in addition to geometry y. */
  y?: number
  /** Local rotation in degrees. */
  rotation?: number
  /** Local horizontal scale. */
  scaleX?: number
  /** Local vertical scale. */
  scaleY?: number
  /** Local horizontal skew in degrees. */
  skewX?: number
  /** Local vertical skew in degrees. */
  skewY?: number
  /** Pivot used for rotation, scale, and skew. */
  origin?: VenusTransformOrigin
}

export interface VenusParameters {
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
  hit: {point: {x: number; y: number}; phase: 'hover' | 'click'; tolerance: number; result: ReturnType<Engine['hitTest']>}
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
export type VenusGroupOptions = Partial<Omit<VenusGroupNode, 'type' | 'children' | 'x' | 'y'>>

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
  /** Preferred transform object for editable local transforms. */
  transform?: VenusTransform2D
  /** Inner shadow effect (clipped to shape interior). */
  innerShadow?: {color?: string; blur?: number}
  /** Layer blur radius in pixels. */
  layerBlur?: {amount: number}
  /** Compatibility x-scale applied when `transform.scaleX` is absent. */
  scaleX?: number
  /** Compatibility y-scale applied when `transform.scaleY` is absent. */
  scaleY?: number
  /** Compatibility horizontal skew in degrees. */
  skewX?: number
  /** Compatibility vertical skew in degrees. */
  skewY?: number
  /** Rotation in degrees. */
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
    shadow?: EngineShadow
  } & VenusNodeBase
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
  } & VenusNodeBase
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
  } & VenusNodeBase
  | {
    /** Container node. x/y translate the subtree; visual bounds derive from children. */
    type: 'group'
    x?: number
    y?: number
    shadow?: EngineShadow
    children: VenusNode[]
  } & VenusNodeBase
  | {
    /** Clip/mask container. Bounds derive from clipPath first, then children. */
    type: 'clip' | 'mask'
    clipPath: VenusNode
    children: VenusNode[]
  } & VenusNodeBase
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
  } & VenusNodeBase
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
  } & VenusNodeBase
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
  } & VenusNodeBase

const DEGREES_TO_RADIANS = Math.PI / 180
const IDENTITY_TRANSFORM: EngineTransform2D['matrix'] = [1, 0, 0, 0, 1, 0]
const DEFAULT_VENUS_VIEWPORT_WIDTH = 520
const DEFAULT_VENUS_VIEWPORT_HEIGHT = 320
const DEFAULT_VENUS_ANIMATION_DURATION_MS = 300
const FALLBACK_FRAME_DELAY_MS = 16
const DEBUG_BOUNDS_STROKE = '#2563eb'
const DEBUG_HIT_CANDIDATE_STROKE = '#f97316'
const DEBUG_HIT_CANDIDATE_FILL = '#f97316'
const DEBUG_OVERLAY_STROKE_WIDTH = 1
const DEBUG_HIT_TOLERANCE = 6
const DEFAULT_CLICK_HIT_TOLERANCE = 0
const DEFAULT_HOVER_HIT_TOLERANCE = 6

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

  if (['transform', 'rotation', 'scaleX', 'scaleY', 'skewX', 'skewY', 'flipX', 'flipY'].includes(root)) {
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
 * Normalizes engine cache counters into the stable Venus inspection shape.
 * @param enabled Whether cache diagnostics are enabled.
 * @param engine Engine diagnostics snapshot, when mounted.
 */
const createVenusCacheDiagnostics = (
  enabled: boolean,
  engine: EngineRuntimeDiagnostics | null,
): VenusCacheDiagnostics => {
  const stats = engine?.renderStats

  return {
    enabled,
    available: Boolean(stats),
    geometry: {
      hitCount: stats?.geometryCacheHitCount ?? 0,
      missCount: stats?.geometryCacheMissCount ?? 0,
      hitRate: stats?.geometryCacheHitRate ?? 0,
    },
    render: {
      hitCount: stats?.cacheHits ?? 0,
      missCount: stats?.cacheMisses ?? 0,
    },
    frameReuse: {
      hitCount: stats?.frameReuseHits ?? 0,
      missCount: stats?.frameReuseMisses ?? 0,
    },
    tile: {
      size: stats?.tileCacheSize ?? 0,
      dirtyCount: stats?.tileDirtyCount ?? 0,
      totalBytes: stats?.tileCacheTotalBytes ?? 0,
    },
    fallbackReason: stats?.cacheFallbackReason ?? engine?.strategySnapshot?.fallbackReason ?? null,
  }
}

/**
 * Resolves public hit-test options into execution values.
 * @param options Public hit-test options.
 */
const resolveVenusHitTestOptions = (options: VenusHitTestOptions = {}) => {
  const phase = options.phase ?? 'click'
  const defaultTolerance = phase === 'hover' ? DEFAULT_HOVER_HIT_TOLERANCE : DEFAULT_CLICK_HIT_TOLERANCE

  return {
    phase,
    tolerance: Math.max(0, options.tolerance ?? defaultTolerance),
    includeLocked: options.includeLocked ?? false,
  }
}

/**
 * Detects whether a document node carries transform fields beyond geometry x/y.
 * @param node Document node base fields to inspect.
 */
const hasTransformFields = (node: VenusNodeBase): boolean => {
  const transform = node.transform
  return Boolean(
    node.rotation
    || node.scaleX !== undefined
    || node.scaleY !== undefined
    || node.skewX
    || node.skewY
    || transform?.x
    || transform?.y
    || transform?.rotation
    || transform?.scaleX !== undefined
    || transform?.scaleY !== undefined
    || transform?.skewX
    || transform?.skewY
    || transform?.origin
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
 * Rotation, scale, flip, and skew are applied around the configured origin.
 * @param node Node with geometry and transform properties.
 * @param bounds Optional pre-computed bounds for center calculation.
 */
const createVenusTransform = (
  node: VenusNodeBase,
  bounds?: {x: number; y: number; width: number; height: number},
): EngineTransform2D | undefined => {
  // Group x/y is a legacy parent translation; leaf x/y remains geometry.
  const nodeType = 'type' in node ? (node as {type?: string}).type : undefined
  const usesGeometryTranslation = nodeType === 'group'
  const tx = usesGeometryTranslation && 'x' in node && typeof (node as Record<string, unknown>).x === 'number' ? (node as Record<string, unknown>).x as number : 0
  const ty = usesGeometryTranslation && 'y' in node && typeof (node as Record<string, unknown>).y === 'number' ? (node as Record<string, unknown>).y as number : 0
  const transform = node.transform
  const transformX = transform?.x ?? 0
  const transformY = transform?.y ?? 0
  if (!hasTransformFields(node) && tx === 0 && ty === 0 && transformX === 0 && transformY === 0) {
    return undefined
  }

  const origin = transform?.origin
  const originUnit = origin?.unit ?? 'ratio'
  const originX = bounds
    ? bounds.x + (originUnit === 'px' ? origin?.x ?? bounds.width * 0.5 : bounds.width * (origin?.x ?? 0.5))
    : origin?.x ?? 0
  const originY = bounds
    ? bounds.y + (originUnit === 'px' ? origin?.y ?? bounds.height * 0.5 : bounds.height * (origin?.y ?? 0.5))
    : origin?.y ?? 0
  const rotation = (transform?.rotation ?? node.rotation ?? 0) * DEGREES_TO_RADIANS
  const scaleX = transform?.scaleX ?? node.scaleX ?? 1
  const scaleY = transform?.scaleY ?? node.scaleY ?? 1
  const skewX = Math.tan((transform?.skewX ?? node.skewX ?? 0) * DEGREES_TO_RADIANS)
  const skewY = Math.tan((transform?.skewY ?? node.skewY ?? 0) * DEGREES_TO_RADIANS)
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const translateToOrigin: EngineTransform2D['matrix'] = [1, 0, originX + tx + transformX, 0, 1, originY + ty + transformY]
  const translateFromOrigin: EngineTransform2D['matrix'] = [1, 0, -originX, 0, 1, -originY]
  const rotateMatrix: EngineTransform2D['matrix'] = [cos, -sin, 0, sin, cos, 0]
  const skewMatrix: EngineTransform2D['matrix'] = [1, skewX, 0, skewY, 1, 0]
  const scaleMatrix: EngineTransform2D['matrix'] = [scaleX, 0, 0, 0, scaleY, 0]
  const matrix = [
    translateToOrigin,
    rotateMatrix,
    skewMatrix,
    scaleMatrix,
    translateFromOrigin,
  ].reduce(multiplyTransformMatrices, IDENTITY_TRANSFORM)

  return {matrix}
}

const createEmptySnapshot = (revision: number): EngineSceneSnapshot => {
  return {
    revision,
    width: 520,
    height: 320,
    nodes: [],
  }
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
  if ('x' in node || node.type === 'group') {
    node.x = (node.x ?? 0) + dx
  }
  if ('y' in node || node.type === 'group') {
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

const hasNonTranslationTransform = (node: VenusNode): boolean => {
  const transform = node.transform
  return Boolean(
    node.rotation
    || node.scaleX !== undefined
    || node.scaleY !== undefined
    || node.skewX
    || node.skewY
    || transform?.rotation
    || transform?.scaleX !== undefined
    || transform?.scaleY !== undefined
    || transform?.skewX
    || transform?.skewY
    || transform?.origin,
  )
}

const getNodeTranslation = (node: VenusNode) => ({
  x: ('x' in node ? node.x ?? 0 : 0) + (node.transform?.x ?? 0),
  y: ('y' in node ? node.y ?? 0 : 0) + (node.transform?.y ?? 0),
})

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

/**
 * Collects world-space bounds for each render-facing node.
 * @param nodes Root or child render nodes to inspect.
 * @param parentMatrix Parent world matrix composed before each node matrix.
 */
const collectEngineNodeBounds = (
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineTransform2D['matrix'] = IDENTITY_TRANSFORM,
): {id: string; bounds: EngineRect}[] => {
  const entries: {id: string; bounds: EngineRect}[] = []

  for (const node of nodes) {
    const nodeMatrix = multiplyTransformMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_TRANSFORM)
    const bounds = node.type === 'group'
      ? resolveEngineNodesBounds(node.children, nodeMatrix)
      : resolveLeafNodeWorldBounds(node, nodeMatrix)

    if (bounds) {
      entries.push({id: node.id, bounds})
    }

    if (node.type === 'group') {
      entries.push(...collectEngineNodeBounds(node.children, nodeMatrix))
    }
  }

  return entries
}

/**
 * Creates one world-space rectangle overlay from node bounds.
 * @param id Overlay id.
 * @param bounds World-space bounds to draw.
 * @param style Overlay style.
 */
const createBoundsOverlayNode = (
  id: string,
  bounds: EngineRect,
  style: NonNullable<EngineOverlayDrawNode['style']>,
): EngineOverlayDrawNode => {
  return {
    id,
    type: 'rect',
    coordinate: 'world',
    points: [
      {x: bounds.x, y: bounds.y},
      {x: bounds.x + bounds.width, y: bounds.y + bounds.height},
    ],
    style,
  }
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

/**
 * Resolves one easing curve for the public Venus animation API.
 * @param easing Easing name selected by the caller.
 */
const resolveVenusEasing = (easing: VenusAnimationOptions['easing']): (progress: number) => number => {
  switch (easing) {
    case 'easeIn':
      return (progress) => progress * progress
    case 'easeOut':
      return (progress) => 1 - (1 - progress) * (1 - progress)
    case 'easeInOut':
      return (progress) => progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2
    case 'linear':
    default:
      return (progress) => progress
  }
}

/**
 * Schedules one animation frame with a timeout fallback for non-browser tests.
 * @param callback Frame callback receiving a timestamp.
 */
const requestVenusAnimationFrame = (callback: (now: number) => void): number => {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback)
  }

  return Number(globalThis.setTimeout(() => callback(Date.now()), FALLBACK_FRAME_DELAY_MS))
}

/**
 * Cancels one animation frame scheduled by `requestVenusAnimationFrame`.
 * @param handle Frame handle returned by the scheduler.
 */
const cancelVenusAnimationFrame = (handle: number): void => {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(handle)
    return
  }

  globalThis.clearTimeout(handle)
}

/**
 * Reads an animatable numeric property from a document node.
 * @param node Target document node.
 * @param property Animatable property name.
 */
const getVenusAnimationProperty = (node: VenusNode, property: VenusAnimatableProperty): number => {
  const value = (node as Partial<Record<VenusAnimatableProperty, number>>)[property]
  return typeof value === 'number' ? value : 0
}

/**
 * Writes an animatable numeric property onto a document node.
 * @param node Target document node.
 * @param property Animatable property name.
 * @param value Next numeric value.
 */
const setVenusAnimationProperty = (
  node: VenusNode,
  property: VenusAnimatableProperty,
  value: number,
): void => {
  ;(node as Partial<Record<VenusAnimatableProperty, number>>)[property] = value
}

/**
 * Lists all numeric properties mentioned by the final keyframe.
 * @param keyframe Final keyframe requested by the caller.
 */
const getAnimatableProperties = (keyframe: VenusAnimationKeyframe): VenusAnimatableProperty[] => {
  return (['x', 'y', 'opacity', 'rotation'] as const).filter((property) => typeof keyframe[property] === 'number')
}

/**
 * Interpolates one scalar value between two keyframes.
 * @param from Start value.
 * @param to End value.
 * @param progress Eased progress in the [0, 1] interval.
 */
const interpolateScalar = (from: number, to: number, progress: number): number => {
  return from + (to - from) * progress
}

const toEngineNode = (node: VenusNode, fallbackId: string): EngineRenderableNode => {
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
      transform: createVenusTransform(node, getNodeBounds(node) ?? undefined),
      children: node.children.map((child, index) => toEngineNode(child, `${id}-child-${index}`)),
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
      children: node.children.map((child, index) => toEngineNode(child, `${id}-clip-child-${index}`)),
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
        fill: node.fill ?? '#0f172a',
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
      stroke: node.stroke ?? '#475569',
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
      fill: node.fill,
      stroke: node.stroke,
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
      fill: node.fill,
      stroke: node.stroke,
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
      fill: node.fill,
      stroke: node.stroke,
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
  private canvas: HTMLCanvasElement | null = null
  private engine: Engine | null = null
  private nodes: EngineRenderableNode[] = []
  private documentNodes: VenusNode[] = []
  private readonly nodeById = new Map<string, VenusNode>()
  private readonly parentById = new Map<string, string | null>()
  private revision = 1
  private nodeIndex = 0
  private readonly listeners = new Map<VenusEventName, Set<VenusEventHandler>>()
  private readonly installedModules = new Set<VenusModuleName>()
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
    const storedNode = this.ensureNodeId(node)
    const engineNode = toEngineNode(storedNode, storedNode.id ?? `node-${this.nodeIndex}`)
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

    applyBoundsPatchToAuthoredGeometry(node, patch)
    // Mutate the stored VenusNode in place so rebuildRenderNodes picks up changes.
    Object.assign(node, patch)
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

    this.documentNodes.splice(index, 1)
    this.nodes.splice(index, 1)
    this.nodeById.delete(id)
    this.parentById.delete(id)
    this.revision += 1
    this.emit('document:changed', {revision: this.revision})
    this.scheduleRender()
  }

  /**
   * @name Venus.group
   * @description Groups sibling nodes under a new group while preserving visual position.
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

    const bounds = resolveEngineNodesBounds(selected.map((node, index) => toEngineNode(node, node.id ?? `group-candidate-${index}`)))
    const groupX = bounds?.x ?? 0
    const groupY = bounds?.y ?? 0
    selected.forEach((node) => translateVenusNode(node, -groupX, -groupY))

    const groupNode: VenusGroupNode = {
      ...options,
      type: 'group',
      id: options.id ?? this.createNodeId(),
      x: groupX,
      y: groupY,
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
   * @description Lifts a translation-only group's children back into the same parent.
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
    if (hasNonTranslationTransform(groupNode)) {
      throw new Error('ungroup() currently supports translation-only groups')
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

    const translation = getNodeTranslation(groupNode)
    const children = groupNode.children.map((child) => this.ensureNodeId(child))
    children.forEach((child) => translateVenusNode(child, translation.x, translation.y))

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
    const resolvedPadding = typeof padding === 'number'
      ? {top: padding, right: padding, bottom: padding, left: padding}
      : padding
    const availableWidth = Math.max(1, this.viewport.viewportWidth - resolvedPadding.left - resolvedPadding.right)
    const availableHeight = Math.max(1, this.viewport.viewportHeight - resolvedPadding.top - resolvedPadding.bottom)
    const targetWidth = Math.max(1, Math.abs(bounds.width))
    const targetHeight = Math.max(1, Math.abs(bounds.height))
    const scale = Math.min(availableWidth / targetWidth, availableHeight / targetHeight)
    const offsetX = resolvedPadding.left + (availableWidth - targetWidth * scale) / 2 - bounds.x * scale
    const offsetY = resolvedPadding.top + (availableHeight - targetHeight * scale) / 2 - bounds.y * scale

    return this.applyViewport(resolveEngineViewportState({
      viewportWidth: this.viewport.viewportWidth,
      viewportHeight: this.viewport.viewportHeight,
      scale,
      offsetX,
      offsetY,
    }))
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
    return this.applyViewport(zoomEngineViewportState(this.viewport, scale, anchor))
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
    return this.applyViewport(panEngineViewportState(this.viewport, delta.x, delta.y))
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
    return applyMatrixToPoint(this.viewport.matrix, point)
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
    return applyMatrixToPoint(this.viewport.inverseMatrix, point)
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
      project: (point: {x: number; y: number}) => this.project(point),
      unproject: (point: {x: number; y: number}) => this.unproject(point),
    })
    this.services.set('invalidation', {
      classify: (changedProperties: readonly string[]) => classifyVenusNodeMutation(changedProperties),
    })
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
      module.install({
        venus: this,
        parameters: this.parameters,
        services: this.serviceRegistry,
      })
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
      const engineNode = toEngineNode(node, node.id ?? `node-${index}`)
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
    const requestedBackend = this.parameters.render?.backend ?? 'auto'
    const createWithBackend = (backend: 'canvas2d' | 'webgl') => createEngine({
      canvas,
      initialScene: this.createSnapshot(),
      culling: this.parameters.culling ?? false,
      lod: this.parameters.lod ? {enabled: true} : {enabled: false},
      render: {
        backend,
        quality: this.parameters.render?.quality ?? 'full',
        webglAntialias: this.parameters.render?.antialias ?? true,
      },
      resource: this.parameters.resource,
    })

    if (requestedBackend === 'canvas2d') {
      this.lastBackendFallback = null
      return createWithBackend('canvas2d')
    }

    try {
      this.lastBackendFallback = null
      return createWithBackend('webgl')
    } catch (error) {
      if (requestedBackend === 'webgl') {
        throw error
      }

      const fallback: VenusBackendFallback = {
        from: 'webgl',
        to: 'canvas2d',
        reason: error instanceof Error ? error.message : String(error),
      }
      this.lastBackendFallback = fallback
      this.emit('backend:fallback', fallback)
      return createWithBackend('canvas2d')
    }
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
  hitTest(point: {x: number, y: number}, options: VenusHitTestOptions = {}) {
    const resolvedOptions = resolveVenusHitTestOptions(options)
    const hits = this.engine?.hitTestAll(point, resolvedOptions.tolerance) ?? []
    const result = resolvedOptions.includeLocked
      ? hits[0] ?? null
      : hits.find((hit) => !this.getNodeById(hit.nodeId)?.locked) ?? null
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
    const node = this._rawNode(nodeId)
    let frameHandle: number | null = null
    let startedAt: number | null = null
    let paused = false
    let settled = false
    let resolveFinished: () => void = () => undefined
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve
    })

    const [, to] = keyframes
    const properties = node ? getAnimatableProperties(to) : []
    const fromValues = new Map<VenusAnimatableProperty, number>()
    const toValues = new Map<VenusAnimatableProperty, number>()
    const duration = Math.max(0, options.duration ?? DEFAULT_VENUS_ANIMATION_DURATION_MS)
    const ease = resolveVenusEasing(options.easing)

    if (node) {
      for (const property of properties) {
        fromValues.set(property, keyframes[0][property] ?? getVenusAnimationProperty(node, property))
        toValues.set(property, to[property] ?? getVenusAnimationProperty(node, property))
      }
    }

    const settle = () => {
      if (settled) {
        return
      }
      settled = true
      if (frameHandle !== null) {
        cancelVenusAnimationFrame(frameHandle)
        frameHandle = null
      }
      resolveFinished()
    }

    const applyProgress = (progress: number) => {
      if (!node) {
        return
      }

      for (const property of properties) {
        const start = fromValues.get(property) ?? getVenusAnimationProperty(node, property)
        const end = toValues.get(property) ?? start
        setVenusAnimationProperty(node, property, interpolateScalar(start, end, progress))
      }
      this.rebuildRenderNodes()
      this.revision += 1
      void this.render()
    }

    const tick = (now: number) => {
      if (settled || paused) {
        return
      }

      if (startedAt === null) {
        startedAt = now
      }

      const progress = duration === 0 ? 1 : Math.max(0, Math.min(1, (now - startedAt) / duration))
      applyProgress(ease(progress))

      if (progress >= 1) {
        settle()
        return
      }

      frameHandle = requestVenusAnimationFrame(tick)
    }

    if (!node || properties.length === 0) {
      settle()
      return {
        finished,
        cancel: settle,
        pause: () => { paused = true },
        play: () => undefined,
      }
    }

    if (duration === 0) {
      applyProgress(1)
      settle()
    } else {
      frameHandle = requestVenusAnimationFrame(tick)
    }

    return {
      finished,
      cancel: settle,
      pause: () => {
        paused = true
        if (frameHandle !== null) {
          cancelVenusAnimationFrame(frameHandle)
          frameHandle = null
        }
      },
      play: () => {
        if (settled || !paused) {
          return
        }
        if (node) {
          for (const property of properties) {
            fromValues.set(property, getVenusAnimationProperty(node, property))
          }
        }
        paused = false
        startedAt = null
        frameHandle = requestVenusAnimationFrame(tick)
      },
    }
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
      ...createEmptySnapshot(this.revision),
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

    const overlays: EngineOverlayDrawNode[] = []

    if (this.debugFlags.showBounds) {
      for (const entry of collectEngineNodeBounds(this.nodes)) {
        overlays.push(createBoundsOverlayNode(`debug-bounds-${entry.id}`, entry.bounds, {
          strokeColor: DEBUG_BOUNDS_STROKE,
          strokeWidth: DEBUG_OVERLAY_STROKE_WIDTH,
          strokeDash: [4, 4],
          zIndex: 20,
        }))
      }
    }

    if (this.debugFlags.showHitCandidates && this.lastDebugHitPoint) {
      const hitPlan = this.engine.prepareHitPlan(this.lastDebugHitPoint, DEBUG_HIT_TOLERANCE)
      const candidateIds = new Set(hitPlan.candidateNodeIds)
      const boundsById = new Map(collectEngineNodeBounds(this.nodes).map((entry) => [entry.id, entry.bounds]))
      for (const candidateId of candidateIds) {
        const candidateBounds = boundsById.get(candidateId)
        if (!candidateBounds) {
          continue
        }
        overlays.push(createBoundsOverlayNode(`debug-hit-candidate-${candidateId}`, candidateBounds, {
          strokeColor: DEBUG_HIT_CANDIDATE_STROKE,
          strokeWidth: DEBUG_OVERLAY_STROKE_WIDTH,
          fillColor: DEBUG_HIT_CANDIDATE_FILL,
          fillOpacity: 0.08,
          zIndex: 30,
        }))
      }
    }

    this.engine.setOverlayNodes(overlays)
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
