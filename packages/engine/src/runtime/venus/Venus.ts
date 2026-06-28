import {createEngine, type Engine, type EngineRuntimeDiagnostics} from '../createEngine/createEngine.ts'
import {applyMatrixToPoint} from '../../math/matrix/matrix.ts'
import type {
  EngineRect,
  EngineShadow,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineTextRun,
  EngineTransform2D,
} from '../../scene/types/types.ts'
import {resolveLeafNodeWorldBounds} from '../../scene/worldBounds/worldBounds.ts'
import {
  DEFAULT_ENGINE_VIEWPORT,
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../../interaction/viewport/viewport.ts'
import type {EngineOverlayDrawNode} from '../../interaction/overlayCanvas.ts'

type VenusBackend = 'canvas2d' | 'webgl' | 'auto'

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
  'animate',
  'destroy',
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
  /** Mirrors geometry horizontally around the transform origin. */
  flipX?: boolean
  /** Mirrors geometry vertically around the transform origin. */
  flipY?: boolean
  /** Pivot used for rotation, scale, skew, and flip. */
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
  /** Engine-level diagnostics, available after mount. */
  engine: EngineRuntimeDiagnostics | null
}

export interface VenusEventMap {
  mounted: {canvas: HTMLCanvasElement}
  'document:changed': {revision: number; node: EngineRenderableNode}
  resized: {width: number; height: number}
  'render:before': {revision: number}
  'render:after': {revision: number}
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

type VenusNodeBase = {
  id?: string
  name?: string
  visible?: boolean
  locked?: boolean
  opacity?: number
  blendMode?: string
  /** Preferred transform object for editable local transforms. */
  transform?: VenusTransform2D
  /** Compatibility x-scale applied when `transform.scaleX` is absent. */
  scaleX?: number
  /** Compatibility y-scale applied when `transform.scaleY` is absent. */
  scaleY?: number
  /** Compatibility horizontal skew in degrees. */
  skewX?: number
  /** Compatibility vertical skew in degrees. */
  skewY?: number
  /** Compatibility horizontal mirror flag. */
  flipX?: boolean
  /** Compatibility vertical mirror flag. */
  flipY?: boolean
  /** Rotation in degrees. */
  rotation?: number
}

export type VenusNode =
  | {
    type: 'rect' | 'ellipse'
    x?: number
    y?: number
    width: number
    height: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    cornerRadius?: number
    cornerRadii?: {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number}
    ellipseStartAngle?: number
    ellipseEndAngle?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'line'
    x?: number
    y?: number
    width: number
    height: number
    stroke?: string
    strokeWidth?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'text'
    x?: number
    y?: number
    width?: number
    height?: number
    text: string
    runs?: readonly EngineTextRun[]
    fill?: string
    fontSize?: number
    fontWeight?: number
    lineHeight?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'group'
    x?: number
    y?: number
    shadow?: EngineShadow
    children: VenusNode[]
  } & VenusNodeBase
  | {
    type: 'clip' | 'mask'
    clipPath: VenusNode
    children: VenusNode[]
  } & VenusNodeBase
  | {
    /** Draws closed point-list polygon geometry. */
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
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    /** Draws custom point or bezier path geometry. */
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
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    /** Renders an asset-backed raster image. */
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
    || node.flipX
    || node.flipY
    || transform?.x
    || transform?.y
    || transform?.rotation
    || transform?.scaleX !== undefined
    || transform?.scaleY !== undefined
    || transform?.skewX
    || transform?.skewY
    || transform?.flipX
    || transform?.flipY
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
  const scaleX = (transform?.scaleX ?? node.scaleX ?? 1) * (transform?.flipX ?? node.flipX ? -1 : 1)
  const scaleY = (transform?.scaleY ?? node.scaleY ?? 1) * (transform?.flipY ?? node.flipY ? -1 : 1)
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
  return node.visible === false ? 0 : node.opacity
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
    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, getNodeBounds(node) ?? undefined),
      children: node.children.map((child, index) => toEngineNode(child, `${id}-child-${index}`)),
    }
  }

  if (node.type === 'clip' || node.type === 'mask') {
    const clipPathX = 'x' in node.clipPath ? node.clipPath.x ?? 0 : 0
    const clipPathY = 'y' in node.clipPath ? node.clipPath.y ?? 0 : 0
    const clipPathWidth = 'width' in node.clipPath && typeof node.clipPath.width === 'number' ? node.clipPath.width : 160
    const clipPathHeight = 'height' in node.clipPath && typeof node.clipPath.height === 'number' ? node.clipPath.height : 120

    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
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
    return {
      id,
      type: 'text',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
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
        shadow: node.shadow,
      },
    }
  }

  if (node.type === 'line') {
    return {
      id,
      type: 'shape',
      shape: 'line',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      stroke: node.stroke ?? '#475569',
      strokeWidth: node.strokeWidth ?? 4,
    }
  }

  if (node.type === 'rect' || node.type === 'ellipse') {
    return {
      id,
      type: 'shape',
      shape: node.type,
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      cornerRadius: node.type === 'rect' ? node.cornerRadius : undefined,
      cornerRadii: node.type === 'rect' ? node.cornerRadii : undefined,
      ellipseStartAngle: node.type === 'ellipse' ? node.ellipseStartAngle : undefined,
      ellipseEndAngle: node.type === 'ellipse' ? node.ellipseEndAngle : undefined,
    }
  }

  if (node.type === 'polygon') {
    return {
      id,
      type: 'shape',
      shape: 'polygon',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      points: node.points,
      closed: node.closed ?? true,
    }
  }

  if (node.type === 'path') {
    return {
      id,
      type: 'shape',
      shape: 'path',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      points: node.points as EngineRenderableNode extends {points?: infer T} ? T : undefined,
      bezierPoints: node.bezierPoints as EngineRenderableNode extends {bezierPoints?: infer T} ? T : undefined,
      closed: node.closed,
      strokeStartArrowhead: node.strokeStartArrowhead,
      strokeEndArrowhead: node.strokeEndArrowhead,
    }
  }

  if (node.type === 'image') {
    return {
      id,
      type: 'image',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
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
  /** Stores current viewport state for camera commands and projection helpers. */
  private viewport: EngineCanvasViewportState = resolveEngineViewportState({
    ...DEFAULT_ENGINE_VIEWPORT,
    viewportWidth: DEFAULT_VENUS_VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_VENUS_VIEWPORT_HEIGHT,
  })
  /** Stores current debug flags. */
  private debugFlags: VenusDebugFlags = {showBounds: false, showHitCandidates: false, showCache: false}
  /** Stores the latest measured render frame for diagnostics panels. */
  private lastFrameMeasurement: VenusFrameMeasurement | null = null
  /** Stores the last pointer used for debug hit-candidate overlays. */
  private lastDebugHitPoint: {x: number; y: number} | null = null

  // -- Document CRUD (flat) --

  /** Adds one document node and returns the engine-facing render node. */
  add(node: VenusNode): EngineRenderableNode {
    const engineNode = toEngineNode(node, `node-${this.nodeIndex}`)
    this.nodeIndex += 1
    this.documentNodes = [...this.documentNodes, node]
    this.indexNodeTree(node, engineNode.id, null)
    this.nodes = [...this.nodes, engineNode]
    this.revision += 1
    this.emit('document:changed', {revision: this.revision, node: engineNode})
    return engineNode
  }

  /** Returns the union bounding box of the current document. */
  bounds(): {x: number; y: number; width: number; height: number} {
    return resolveEngineNodesBounds(this.nodes) ?? {x: 0, y: 0, width: 0, height: 0}
  }

  /** Returns all root-level document nodes. */
  children(): readonly VenusNode[] {
    return this.documentNodes
  }

  /** Looks up a document node by stable id, or null when missing. */
  getNodeById(id: string): VenusNode | null {
    return this.nodeById.get(id) ?? null
  }

  /** Returns the parent node id for a nested node, or null for a root node. */
  getParentId(id: string): string | null {
    return this.parentById.get(id) ?? null
  }

  /** Returns a render-facing scene snapshot for the current document. */
  snapshot(): EngineSceneSnapshot {
    return this.createSnapshot()
  }

  // -- Camera (flat) --

  /** Fits the given document-space bounds into the viewport. */
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

  /** Sets the viewport scale around an optional screen anchor. */
  zoomTo(scale: number, anchor?: {x: number; y: number}): {scale: number; offsetX: number; offsetY: number} {
    return this.applyViewport(zoomEngineViewportState(this.viewport, scale, anchor))
  }

  /** Moves the viewport by a screen-space delta without moving document objects. */
  panBy(delta: {x: number; y: number}): {scale: number; offsetX: number; offsetY: number} {
    return this.applyViewport(panEngineViewportState(this.viewport, delta.x, delta.y))
  }

  /** Converts a document-space point to screen coordinates. */
  project(point: {x: number; y: number}): {x: number; y: number} {
    return applyMatrixToPoint(this.viewport.matrix, point)
  }

  /** Converts a screen-space point back to document coordinates. */
  unproject(point: {x: number; y: number}): {x: number; y: number} {
    return applyMatrixToPoint(this.viewport.inverseMatrix, point)
  }

  // -- Debug (flat) --

  /** Enables selected diagnostics and returns the active debug flags. */
  enableDebug(options: {showBounds?: boolean; showHitCandidates?: boolean; showCache?: boolean}): VenusDebugFlags {
    if (options.showBounds !== undefined) this.debugFlags.showBounds = options.showBounds
    if (options.showHitCandidates !== undefined) this.debugFlags.showHitCandidates = options.showHitCandidates
    if (options.showCache !== undefined) this.debugFlags.showCache = options.showCache
    this.refreshDebugOverlay()
    return {...this.debugFlags}
  }

  /** Returns current Venus and engine diagnostics snapshot. */
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
      engine,
    }
  }

  /** Profiles the next render frame and returns frame timing data. */
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

  constructor(parameters: VenusParameters = {}) {
    this.parameters = parameters
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

  on<TEventName extends VenusEventName>(
    eventName: TEventName,
    handler: VenusEventHandler<TEventName>,
  ) {
    const handlers = this.listeners.get(eventName) ?? new Set<VenusEventHandler>()
    handlers.add(handler as VenusEventHandler)
    this.listeners.set(eventName, handlers)

    return () => this.off(eventName, handler)
  }

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

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = createEngine({
      canvas,
      initialScene: this.createSnapshot(),
      culling: this.parameters.culling ?? false,
      lod: this.parameters.lod ? {enabled: true} : {enabled: false},
      render: {
        backend: this.parameters.render?.backend === 'webgl' ? 'webgl' : 'canvas2d',
        quality: this.parameters.render?.quality ?? 'full',
        webglAntialias: this.parameters.render?.antialias ?? true,
      },
    })
    this.applyViewport(this.viewport)
    this.emit('mounted', {canvas})
  }

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

  async render() {
    if (!this.engine) {
      return
    }

    this.emit('render:before', {revision: this.revision})
    this.engine.loadScene(this.createSnapshot())
    this.refreshDebugOverlay()
    await this.engine.renderFrame()
    this.emit('render:after', {revision: this.revision})
  }

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

  animate(
    nodeId: string,
    keyframes: readonly [VenusAnimationKeyframe, VenusAnimationKeyframe],
    options: VenusAnimationOptions = {},
  ): VenusAnimationController {
    const node = this.getNodeById(nodeId)
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
