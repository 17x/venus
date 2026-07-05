// Venus runtime owns root-level engine API orchestration, module installation,
// document service wiring, and render-facing scene conversion.
import type {Engine, EngineRuntimeDiagnostics} from '../createEngine/createEngine.ts'
import type {
  EngineRect,
  EngineShadow,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeNode,
  EngineImageNode,
  EngineTextRun,
  EngineTextStyle,
  EngineTransform2D,
  EngineClipShape,
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
  createVenusBaseModule,
  type VenusHistoryController,
  type VenusInternalServiceName,
  type VenusModuleName,
  type VenusPngExportOptions,
  type VenusJpegExportOptions,
  type VenusSvgExportOptions,
  type VenusScopedSvgExportOptions,
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
  /**
   * Wraps sibling nodes in a structure-only group while preserving child geometry.
   * @param ids Sibling document ids to group.
   * @param options Optional group metadata for the created group.
   */
  group(ids: readonly string[], options?: VenusGroupOptions): VenusNodeProxy
  /**
   * Lifts a structure-only group's children into the same parent.
   * @param id Group node id to ungroup.
   */
  ungroup(id: string): VenusNodeProxy[]
  /**
   * Adds one child to a document container.
   * @param parentId Frame, group, clip, or mask id.
   * @param child Child document node to append.
   */
  addChild(parentId: string, child: VenusNode): VenusNodeProxy
  /**
   * Removes one child from a document container.
   * @param parentId Frame, group, clip, or mask id.
   * @param childId Child document node id to remove.
   */
  removeChild(parentId: string, childId: string): void
  /**
   * Moves one node into a new parent container or the root layer.
   * @param id Node id to move.
   * @param parentId New parent id, or null for the root layer.
   * @param index Optional insertion index in the target parent-local child list.
   */
  reparent(id: string, parentId: string | null, index?: number): VenusReparentMutationResult
  getLayerIndex(id: string): number
  getLayerOrder(parentId?: string | null): string[]
  /**
   * Moves one sibling and returns the full mutation payload for history/event consumers.
   * @param id Node id to move.
   * @param index Target sibling index.
   */
  moveLayer(id: string, index: number): VenusLayerMutationResult
  /**
   * Moves one sibling before another sibling and returns the full mutation payload.
   * @param id Node id to move.
   * @param targetId Sibling target id.
   */
  moveBefore(id: string, targetId: string): VenusLayerMutationResult
  /**
   * Moves one sibling after another sibling and returns the full mutation payload.
   * @param id Node id to move.
   * @param targetId Sibling target id.
   */
  moveAfter(id: string, targetId: string): VenusLayerMutationResult
  /**
   * Moves one sibling one step toward the front and returns the full mutation payload.
   * @param id Node id to move.
   */
  bringForward(id: string): VenusLayerMutationResult
  /**
   * Moves one sibling one step toward the back and returns the full mutation payload.
   * @param id Node id to move.
   */
  sendBackward(id: string): VenusLayerMutationResult
  /**
   * Moves one sibling above all siblings and returns the full mutation payload.
   * @param id Node id to move.
   */
  bringToFront(id: string): VenusLayerMutationResult
  /**
   * Moves one sibling below all siblings and returns the full mutation payload.
   * @param id Node id to move.
   */
  sendToBack(id: string): VenusLayerMutationResult
  /**
   * Validates clip references and inline clip geometry in a snapshot.
   * @param snapshot Optional render-facing snapshot; defaults to the current document.
   */
  validateClipGraph(snapshot?: EngineSceneSnapshot): VenusClipGraphValidation
  /**
   * Resolves direct and transitive clip node ids for one node.
   * @param nodeId Node id whose clip chain should be inspected.
   * @param snapshot Optional render-facing snapshot; defaults to the current document.
   */
  resolveClipDependencies(nodeId: string, snapshot?: EngineSceneSnapshot): string[]
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
  'frame',
  'group',
  'clip',
  'mask',
  'polygon',
  'star',
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
  'inspectImageResources',
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
  'getLayerOrder',
  'moveLayer',
  'moveBefore',
  'moveAfter',
  'bringForward',
  'sendBackward',
  'bringToFront',
  'sendToBack',
  'validateClipGraph',
  'resolveClipDependencies',
  'undo',
  'redo',
  'canUndo',
  'canRedo',
  'clearHistory',
  'group',
  'ungroup',
  'addChild',
  'removeChild',
  'reparent',
  'getSelection',
  'setSelection',
  'select',
  'deselect',
  'selectAll',
  'clearSelection',
  'isSelected',
  'onSelectionChange',
  'querySelectionInRect',
  'selectInRect',
  'getSelectionOverlay',
  'getHoverOverlay',
  'applyDropShadow',
  'removeDropShadow',
  'applyInnerShadow',
  'removeInnerShadow',
  'applyLayerBlur',
  'removeLayerBlur',
  'clearEffects',
  'exportPNG',
  'exportJPEG',
  'exportSVG',
  'exportNode',
  'exportSelection',
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
  /** When false, hit testing ignores inline clip geometry. Defaults to true. */
  respectClip?: boolean
}

/** Rectangle used by selection and bounds queries. */
export interface VenusSelectionRect {
  x: number
  y: number
  width: number
  height: number
}

/** Options for rectangle-based selection candidate queries. */
export interface VenusSelectionRectQueryOptions {
  /** Coordinate space of `rect`. Document space is the engine/world default. */
  coordinateSpace?: 'document' | 'screen'
  /** Selection geometry policy. `intersect` matches partially overlapping nodes; `contain` requires full containment. */
  mode?: 'intersect' | 'contain'
  /** Includes locked nodes in query results. Defaults to false. */
  includeLocked?: boolean
  /** Includes nodes with `visible: false`. Defaults to false. */
  includeHidden?: boolean
  /** Includes structure/container nodes such as group, clip, and mask. Defaults to true. */
  includeContainers?: boolean
}

/** Options for applying rectangle-based selection results to the current selection state. */
export interface VenusSelectInRectOptions extends VenusSelectionRectQueryOptions {
  /** How query results update the current selection. Defaults to replace. */
  selectionMode?: 'replace' | 'add' | 'subtract' | 'toggle'
}

/** Point used by engine-owned overlay geometry. */
export interface VenusOverlayPoint {
  x: number
  y: number
}

/** Min/max bounds used by engine-owned overlay geometry. */
export interface VenusOverlayRectBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Style-free overlay geometry returned by interaction APIs. */
export type VenusOverlayGeometry =
  | {kind: 'rect'; bounds: VenusOverlayRectBounds}
  | {kind: 'polyline'; points: readonly VenusOverlayPoint[]; closed?: boolean}
  | {kind: 'segment'; from: VenusOverlayPoint; to: VenusOverlayPoint}
  | {kind: 'point'; point: VenusOverlayPoint}

/** Options for resolving the current selection overlay geometry. */
export interface VenusSelectionOverlayOptions {
  /** Optional ids to inspect instead of the current interaction selection. */
  ids?: readonly string[]
}

/** Selection overlay geometry owned by the interaction module. */
export interface VenusSelectionOverlay {
  /** Selected ids covered by this overlay. */
  selectedIds: readonly string[]
  /** Aggregate selection bounds in document/world coordinates. */
  bounds: VenusOverlayRectBounds
  /** Style-free outline geometry for renderer or product adapter styling. */
  outline: VenusOverlayGeometry
  /** Current document revision associated with this geometry. */
  revision: number
}

/** Options for resolving hover overlay geometry from a known node or hit point. */
export interface VenusHoverOverlayOptions {
  /** Node id whose hover outline should be resolved. */
  nodeId?: string
  /** Optional screen-space point; requires the hitTest module and uses topmost hit. */
  point?: {x: number; y: number}
  /** Hit-test options used when `point` is supplied. */
  hitOptions?: VenusHitTestOptions
}

/** Hover overlay geometry owned by the interaction module. */
export interface VenusHoverOverlay {
  /** Hovered public document node id. */
  nodeId: string
  /** Hover bounds in document/world coordinates. */
  bounds: VenusOverlayRectBounds
  /** Style-free outline geometry for renderer or product adapter styling. */
  outline: VenusOverlayGeometry
  /** Hit-test result when this overlay was resolved from a point. */
  hit?: VenusDetailedHitTestResult
  /** Current document revision associated with this geometry. */
  revision: number
}

/** Result emitted by base layer-order mutations and returned by document services. */
export interface VenusLayerMutationResult {
  /** Whether the sibling order changed. */
  applied: boolean
  /** Document revision after the mutation, or the current revision for no-op/failure results. */
  revision: number
  /** Parent whose child order was inspected; null represents the root layer. */
  parentId: string | null
  /** Node requested for movement. */
  nodeId: string
  /** Sibling index before the mutation, or -1 when the node was not found. */
  fromIndex: number
  /** Sibling index after the mutation, or -1 when the node was not found. */
  toIndex: number
  /** Sibling order after the mutation or failed/no-op attempt. */
  order: readonly string[]
}

/** Result returned by explicit document reparent transactions. */
export interface VenusReparentMutationResult {
  /** Whether the node moved to a different parent or target index. */
  applied: boolean
  /** Document revision after the mutation, or the current revision for no-op/failure results. */
  revision: number
  /** Node requested for reparenting. */
  nodeId: string
  /** Parent that owned the node before the mutation; null represents the root layer. */
  fromParentId: string | null
  /** Parent that owns the node after the mutation; null represents the root layer. */
  toParentId: string | null
  /** Sibling index before the mutation, or -1 when the node was not found. */
  fromIndex: number
  /** Sibling index after the mutation in the target parent, or -1 when rejected. */
  toIndex: number
  /** Target parent-local order after the mutation or failed/no-op attempt. */
  order: readonly string[]
}

/** Broad document mutation reasons carried by the compatibility `document:changed` event. */
export type VenusDocumentChangedReason =
  | 'node-added'
  | 'node-updated'
  | 'node-removed'
  | 'structure-changed'
  | 'layer-changed'
  | 'defaults-changed'
  | 'history-restored'

/** Compatibility payload emitted after any public document revision change. */
export interface VenusDocumentChangedEvent {
  /** Document revision after the mutation. */
  revision: number
  /** Render-facing node when a single changed node is available. */
  node?: EngineRenderableNode
  /** Public document ids affected by this mutation. */
  affectedNodeIds?: readonly string[]
  /** Broad mutation reason used by app adapters and diagnostics. */
  reason?: VenusDocumentChangedReason
}

/** Payload emitted after one or more public document nodes are added. */
export interface VenusDocumentNodeAddedEvent {
  /** Document revision after the mutation. */
  revision: number
  /** Added public document node ids. */
  nodeIds: readonly string[]
  /** Parent receiving the added ids; null represents the root layer. */
  parentId: string | null
}

/** Payload emitted after one public document node receives a property patch. */
export interface VenusDocumentNodeUpdatedEvent {
  /** Document revision after the mutation. */
  revision: number
  /** Updated public document node id. */
  nodeId: string
  /** Public property names supplied by the accepted patch. */
  changedProperties: readonly string[]
  /** Highest-cost invalidation class derived from changedProperties. */
  invalidation: VenusInvalidationKind
}

/** Payload emitted after one or more public document nodes are removed. */
export interface VenusDocumentNodeRemovedEvent {
  /** Document revision after the mutation. */
  revision: number
  /** Removed public document node ids. */
  nodeIds: readonly string[]
  /** Parent that previously owned the removed ids; null represents the root layer. */
  parentId: string | null
}

/** Document structure mutation kinds that change parent/child relationships or sibling order. */
export type VenusDocumentStructureChangeReason =
  | 'group'
  | 'ungroup'
  | 'addChild'
  | 'removeChild'
  | 'reparent'
  | 'layer'

/** Payload emitted after a parent-local child list changes. */
export interface VenusDocumentStructureChangedEvent {
  /** Document revision after the mutation. */
  revision: number
  /** Parent whose child order changed; null represents the root layer. */
  parentId: string | null
  /** Parents whose child lists changed; includes parentId when omitted by older callers. */
  affectedParentIds?: readonly (string | null)[]
  /** Public document ids affected by the structure mutation. */
  affectedNodeIds: readonly string[]
  /** Parent-local order after the mutation. */
  order: readonly string[]
  /** Specific structure mutation kind. */
  reason: VenusDocumentStructureChangeReason
}

/** Payload emitted when the interaction selection set changes. */
export interface VenusSelectionChangedEvent {
  /** Selected ids after the change, in interaction insertion order. */
  selection: readonly string[]
  /** Selected ids before the change, in interaction insertion order. */
  previousSelection: readonly string[]
  /** Ids present in selection but absent from previousSelection. */
  added: readonly string[]
  /** Ids present in previousSelection but absent from selection. */
  removed: readonly string[]
}

/** Clip graph validation issue categories returned by `venus.validateClipGraph`. */
export type VenusClipGraphIssueCode =
  | 'duplicate-node-id'
  | 'missing-clip-node'
  | 'self-clip-reference'
  | 'cyclic-clip-reference'
  | 'invalid-clip-rule'
  | 'invalid-inline-clip'

/** One clip graph validation issue. */
export interface VenusClipGraphIssue {
  /** Machine-readable issue code. */
  code: VenusClipGraphIssueCode
  /** Node that owns the invalid clip metadata. */
  nodeId: string
  /** Referenced clip node id when the issue involves a graph edge. */
  clipNodeId?: string
  /** Human-readable issue summary. */
  message: string
}

/** Recursive clip dependency list for one node. */
export interface VenusClipDependency {
  /** Node whose clip chain was inspected. */
  nodeId: string
  /** Direct and transitive clip node ids in traversal order. */
  clipNodeIds: string[]
}

/** Result returned by `venus.validateClipGraph`. */
export interface VenusClipGraphValidation {
  /** True when no clip issues were detected. */
  valid: boolean
  /** Validation issues found in the scene. */
  issues: VenusClipGraphIssue[]
  /** Direct and transitive clip dependencies for clipped nodes. */
  dependencies: VenusClipDependency[]
}

/** Image resource resolution state for one engine image node. */
export type VenusImageResourceStatus =
  | 'resolved'
  | 'missing-loader'
  | 'missing-resource'
  | 'loader-error'

/** One image resource diagnostic returned by `venus.inspectImageResources`. */
export interface VenusImageResourceDiagnostic {
  /** Engine image node id. */
  nodeId: string
  /** Asset id passed to the host resource loader. */
  assetId: string
  /** Optional external URL preserved for import/export mapping. */
  assetUrl?: string
  /** Whether the current loader returned a renderable source. */
  resolved: boolean
  /** Machine-readable resolution status. */
  status: VenusImageResourceStatus
  /** Human-readable deterministic diagnostic reason. */
  reason: string
  /** Optional source crop rectangle stored on the image node. */
  sourceRect?: EngineImageNode['sourceRect']
  /** Optional natural image dimensions stored on the image node. */
  naturalSize?: EngineImageNode['naturalSize']
  /** Optional image smoothing hint stored on the image node. */
  imageSmoothing?: boolean
}

/** Aggregate image resource diagnostics for the current scene snapshot. */
export interface VenusImageResourceInspection {
  /** Number of image nodes in the current engine snapshot. */
  imageCount: number
  /** Number of image nodes resolved by the current host loader. */
  resolvedCount: number
  /** Number of image nodes that are not currently render-resolved. */
  missingCount: number
  /** True when every image node is resolved. */
  allResolved: boolean
  /** Per-image diagnostic entries in render traversal order. */
  diagnostics: VenusImageResourceDiagnostic[]
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
  'document:changed': VenusDocumentChangedEvent
  'document:node-added': VenusDocumentNodeAddedEvent
  'document:node-updated': VenusDocumentNodeUpdatedEvent
  'document:node-removed': VenusDocumentNodeRemovedEvent
  'document:structure-changed': VenusDocumentStructureChangedEvent
  'layer:changed': VenusLayerMutationResult
  resized: {width: number; height: number}
  'render:before': {revision: number}
  'render:after': {revision: number}
  'backend:fallback': VenusBackendFallback
  hit: {point: {x: number; y: number}; phase: 'hover' | 'click'; tolerance: number; result: VenusDetailedHitTestResult | null}
  'selection:changed': VenusSelectionChangedEvent
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
export type VenusFrameNode = Extract<VenusNode, {type: 'frame'}>

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
    /** Font family name used for the primary text style. */
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    /** Font style variant used for the primary text style. */
    fontStyle?: EngineTextStyle['fontStyle']
    lineHeight?: number
    /** Letter spacing in local node units. */
    letterSpacing?: number
    /** Horizontal text alignment inside the text box. */
    align?: EngineTextStyle['align']
    /** Vertical text alignment inside the text box. */
    verticalAlign?: EngineTextStyle['verticalAlign']
    shadow?: EngineShadow
  } & VenusTransformableNodeBase
  | {
    /** Bounds-owned container node. Frame bounds are authored; child geometry remains independent. */
    type: 'frame'
    x?: number
    y?: number
    width: number
    height: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    fills?: readonly VenusPaint[]
    strokes?: readonly VenusPaint[]
    strokeAlign?: VenusStrokeAlign
    strokeDashArray?: readonly number[]
    strokeCap?: 'butt' | 'round' | 'square'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    cornerRadius?: number
    cornerRadii?: {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number}
    shadow?: EngineShadow
    children: VenusNode[]
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
    /** Draws closed point-list polygon or star geometry. Bounds edits rescale points. */
    type: 'polygon' | 'star'
    x?: number
    y?: number
    width: number
    height: number
    /** Ordered polygon vertices. */
    points?: readonly {x: number; y: number}[]
    /** Whether the polygon/star is closed (defaults to true). */
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
    /** Optional resolved external URI preserved for export and adapters. */
    assetUrl?: string
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
const DEFAULT_VENUS_TEXT_FONT_FAMILY = 'Inter, ui-sans-serif, system-ui'
const DEFAULT_VENUS_TEXT_FONT_SIZE = 24
const DEFAULT_VENUS_TEXT_FONT_WEIGHT = 700
const DEFAULT_VENUS_CLIP_WIDTH = 160
const DEFAULT_VENUS_CLIP_HEIGHT = 120
const ELLIPSE_CLIP_RADIUS_APPROXIMATION = 999

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

  if (['text', 'runs', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'align', 'verticalAlign'].includes(root)) {
    return 'text'
  }

  if (['assetId', 'assetUrl', 'sourceRect', 'naturalSize', 'imageSmoothing'].includes(root)) {
    return 'paint'
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

  if (node.type === 'line' || node.type === 'polygon' || node.type === 'star' || node.type === 'path') {
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

/**
 * Collects assigned public ids from a Venus document subtree for event payloads.
 * @param node Root document node to inspect.
 */
const collectVenusDocumentNodeIds = (node: VenusNode): string[] => {
  const ids = node.id ? [node.id] : []

  if (node.type === 'frame' || node.type === 'group') {
    return [
      ...ids,
      ...node.children.flatMap(collectVenusDocumentNodeIds),
    ]
  }

  if (node.type === 'clip' || node.type === 'mask') {
    return [
      ...ids,
      ...collectVenusDocumentNodeIds(node.clipPath),
      ...node.children.flatMap(collectVenusDocumentNodeIds),
    ]
  }

  return ids
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

  if (node.type === 'frame') {
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
 * @param node Stored document node whose authored geometry may be rescaled.
 * @param patch Public geometry patch being applied to the node.
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

  if (node.type === 'polygon' || node.type === 'star' || node.type === 'path') {
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
 * Normalizes rectangle dimensions so overlap tests can accept dragged negative widths/heights.
 * @param rect Rectangle that may contain negative dimensions.
 */
const normalizeSelectionRect = (rect: VenusSelectionRect): EngineRect => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x
  const y = rect.height < 0 ? rect.y + rect.height : rect.y
  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

const engineRectToOverlayBounds = (rect: EngineRect): VenusOverlayRectBounds => ({
  minX: rect.x,
  minY: rect.y,
  maxX: rect.x + rect.width,
  maxY: rect.y + rect.height,
})

/**
 * Returns whether two axis-aligned rectangles overlap.
 * @param left First rectangle to compare.
 * @param right Second rectangle to compare.
 */
const rectsIntersect = (left: EngineRect, right: EngineRect): boolean => {
  return left.x <= right.x + right.width
    && left.x + left.width >= right.x
    && left.y <= right.y + right.height
    && left.y + left.height >= right.y
}

/**
 * Returns whether the outer rectangle fully contains the inner rectangle.
 * @param outer Candidate containing rectangle.
 * @param inner Candidate contained rectangle.
 */
const rectContains = (outer: EngineRect, inner: EngineRect): boolean => {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height
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

/**
 * Creates a stable layer mutation result for events, services, and future history patches.
 * @param nodeId Node requested for movement.
 * @param parentId Parent whose child order was inspected; null means root.
 * @param fromIndex Sibling index before the attempted mutation.
 * @param toIndex Sibling index after the attempted mutation.
 * @param applied Whether the sibling order changed.
 * @param revision Current document revision for the result.
 * @param order Sibling order associated with the result.
 */
const createVenusLayerMutationResult = (
  nodeId: string,
  parentId: string | null,
  fromIndex: number,
  toIndex: number,
  applied: boolean,
  revision: number,
  order: readonly string[],
): VenusLayerMutationResult => ({
  applied,
  revision,
  parentId,
  nodeId,
  fromIndex,
  toIndex,
  order: [...order],
})

/**
 * Creates a stable reparent mutation result for structure transactions.
 * @param nodeId Node requested for reparenting.
 * @param fromParentId Parent that owned the node before mutation.
 * @param toParentId Target parent requested by the caller.
 * @param fromIndex Sibling index before mutation.
 * @param toIndex Sibling index after mutation in the target parent.
 * @param applied Whether the node moved or changed sibling index.
 * @param revision Current document revision for the result.
 * @param order Target parent order associated with the result.
 */
const createVenusReparentMutationResult = (
  nodeId: string,
  fromParentId: string | null,
  toParentId: string | null,
  fromIndex: number,
  toIndex: number,
  applied: boolean,
  revision: number,
  order: readonly string[],
): VenusReparentMutationResult => ({
  applied,
  revision,
  nodeId,
  fromParentId,
  toParentId,
  fromIndex,
  toIndex,
  order: [...order],
})

/**
 * Resolves point geometry from clipPath nodes that can be represented by the current EngineClipShape path form.
 * @param clipPath Venus document node used as a clip source.
 */
const resolveVenusClipPathPoints = (clipPath: VenusNode): readonly {x: number; y: number}[] | null => {
  if (
    (clipPath.type === 'line'
      || clipPath.type === 'polygon'
      || clipPath.type === 'star'
      || clipPath.type === 'path')
    && clipPath.points
    && clipPath.points.length >= 2
  ) {
    return clipPath.points.map((point) => ({x: point.x, y: point.y}))
  }

  if (clipPath.type === 'path' && clipPath.bezierPoints && clipPath.bezierPoints.length >= 2) {
    return clipPath.bezierPoints.map((point) => ({x: point.anchor.x, y: point.anchor.y}))
  }

  return null
}

/**
 * Resolves closed/open semantics for point-authored clip paths.
 * @param clipPath Venus document node used as a clip source.
 */
const resolveVenusClipPathClosed = (clipPath: VenusNode): boolean => {
  if (clipPath.type === 'line') {
    return false
  }

  if (clipPath.type === 'path') {
    return clipPath.closed !== false
  }

  return true
}

/**
 * Converts a Venus clipPath document node to inline engine clip geometry.
 * @param clipPath Venus document node used as a clip source.
 */
const createVenusInlineClipShape = (clipPath: VenusNode): EngineClipShape => {
  const points = resolveVenusClipPathPoints(clipPath)
  if (points) {
    return {
      kind: 'path',
      points,
      closed: resolveVenusClipPathClosed(clipPath),
    }
  }

  const clipPathX = 'x' in clipPath ? clipPath.x ?? 0 : 0
  const clipPathY = 'y' in clipPath ? clipPath.y ?? 0 : 0
  const clipPathWidth = 'width' in clipPath && typeof clipPath.width === 'number' ? clipPath.width : DEFAULT_VENUS_CLIP_WIDTH
  const clipPathHeight = 'height' in clipPath && typeof clipPath.height === 'number' ? clipPath.height : DEFAULT_VENUS_CLIP_HEIGHT

  return {
    kind: 'rect',
    rect: {
      x: clipPathX,
      y: clipPathY,
      width: clipPathWidth,
      height: clipPathHeight,
    },
    radius: clipPath.type === 'ellipse'
      ? ELLIPSE_CLIP_RADIUS_APPROXIMATION
      : clipPath.type === 'rect'
        ? clipPath.cornerRadius
        : undefined,
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

  if (node.type === 'frame') {
    const effects = resolveAppearanceEffects(node)
    const strokeStyle = resolveAppearanceStroke(node, {
      strokes: node.strokes,
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    })
    const frameBounds = {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}
    const background: EngineShapeNode = {
      id: `${id}__frame_background`,
      type: 'shape',
      shape: 'rect',
      ...frameBounds,
      fill: node.fill ?? defaults.fillColor,
      stroke: node.stroke ?? defaults.strokeColor,
      strokeWidth: strokeStyle.strokeWidth,
      fills: resolveAppearanceFills(node, node.fills) as EngineShapeNode['fills'],
      strokes: strokeStyle.strokes as EngineShapeNode['strokes'],
      strokeAlign: strokeStyle.strokeAlign,
      strokeDashArray: strokeStyle.strokeDashArray,
      strokeCap: strokeStyle.strokeCap,
      strokeJoin: strokeStyle.strokeJoin,
      hitTargetId: id,
      cornerRadius: node.cornerRadius,
      cornerRadii: node.cornerRadii,
    }

    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: resolveNodeBlendMode(node),
      shadow: effects.shadow,
      innerShadow: effects.innerShadow,
      layerBlur: effects.layerBlur,
      transform: createVenusTransform(node, frameBounds),
      children: [
        {
          ...background,
          fillConfig: {color: background.fill},
          strokeConfig: {color: background.stroke, width: background.strokeWidth},
        },
        ...node.children.map((child, index) => toEngineNode(child, `${id}-child-${index}`, defaults)),
      ],
    }
  }

  if (node.type === 'clip' || node.type === 'mask') {
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
      clip: {
        clipShape: createVenusInlineClipShape(node.clipPath),
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
        fontFamily: node.fontFamily ?? DEFAULT_VENUS_TEXT_FONT_FAMILY,
        fontSize: node.fontSize ?? DEFAULT_VENUS_TEXT_FONT_SIZE,
        fontWeight: node.fontWeight ?? DEFAULT_VENUS_TEXT_FONT_WEIGHT,
        fontStyle: node.fontStyle,
        lineHeight: node.lineHeight,
        letterSpacing: node.letterSpacing,
        align: node.align,
        verticalAlign: node.verticalAlign,
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

  if (node.type === 'polygon' || node.type === 'star') {
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
      assetUrl: node.assetUrl,
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
    const addedNodeIds = collectVenusDocumentNodeIds(storedNode)
    this.emit('document:node-added', {revision: this.revision, nodeIds: addedNodeIds, parentId: null})
    this.emit('document:changed', {
      revision: this.revision,
      node: engineNode,
      affectedNodeIds: addedNodeIds,
      reason: 'node-added',
    })
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

    const changedProperties = Object.keys(patch)
    if (changedProperties.length === 0) {
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
    this.emit('document:node-updated', {
      revision: this.revision,
      nodeId: id,
      changedProperties,
      invalidation: classifyVenusNodeMutation(changedProperties),
    })
    this.emit('document:changed', {
      revision: this.revision,
      node: engineNode,
      affectedNodeIds: [id],
      reason: 'node-updated',
    })
    this.scheduleRender()
  }

  /**
   * @name Venus.remove
   * @description Removes one document node or subtree by id from its parent-local child list.
   * @example Usage
   * venus.add({id: 'temp', type: 'rect', width: 80, height: 40})
   * venus.remove('temp')
   * @param id Stable node id to remove.
   * @returns Nothing.
   */
  remove(id: string): void {
    const node = this.nodeById.get(id)
    if (!node) {
      return
    }

    const parentId = this.parentById.get(id) ?? null
    const siblings = this.resolveSiblingNodes(parentId)
    const index = siblings?.indexOf(node) ?? -1
    if (!siblings || index < 0) {
      return
    }

    this.recordHistory()
    const removedNodeIds = collectVenusDocumentNodeIds(node)
    const nextSiblings = [
      ...siblings.slice(0, index),
      ...siblings.slice(index + 1),
    ]
    this.replaceSiblingNodes(parentId, nextSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:node-removed', {revision: this.revision, nodeIds: removedNodeIds, parentId})
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedParentIds: [parentId],
      affectedNodeIds: removedNodeIds,
      order: this.getDocumentLayerOrder(parentId),
      reason: 'removeChild',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds: removedNodeIds,
      reason: 'node-removed',
    })
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
    this.emit('document:changed', {revision: this.revision, reason: 'defaults-changed'})
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
    this.emit('document:changed', {revision: this.revision, reason: 'defaults-changed'})
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
    const uniqueIds = this.normalizeDocumentStructureSelection(ids)
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
    const affectedNodeIds = [groupNode.id ?? '', ...uniqueIds].filter((nodeId) => nodeId.length > 0)
    this.emit('document:node-added', {revision: this.revision, nodeIds: [groupNode.id ?? ''].filter((nodeId) => nodeId.length > 0), parentId})
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedNodeIds,
      order: this.getDocumentLayerOrder(parentId),
      reason: 'group',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds,
      reason: 'structure-changed',
    })
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
    const childIds = children.map((child) => child.id).filter((childId): childId is string => Boolean(childId))
    const affectedNodeIds = [id, ...childIds]
    this.emit('document:node-removed', {revision: this.revision, nodeIds: [id], parentId})
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedNodeIds,
      order: this.getDocumentLayerOrder(parentId),
      reason: 'ungroup',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds,
      reason: 'structure-changed',
    })
    this.scheduleRender()
    return children.map((child) => createVenusNodeProxy(this, child.id ?? '', child.type))
  }

   /**
   * @name Venus.addChild
   * @description Adds a child node to a frame, group, clip, or mask container.
   * @example Usage
   * const child = venus.addChild('group-id', {type: 'rect', width: 60, height: 40})
   * child.x = 20
   * @param parentId Parent frame, group, clip, or mask id.
   * @param child Child document node to append.
   * @returns Typed proxy for the newly added child.
   */
  addChild(parentId: string, child: VenusNode): VenusNodeProxy {
    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'frame' && parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      throw new Error(`Parent "${parentId}" not found or is not a container (frame/group/clip/mask)`)
    }

    sanitizeStructureGroupNode(child)
    this.recordHistory()
    const storedChild = this.ensureNodeId(child)
    parent.children = [...(parent.children ?? []), storedChild]
    this.rebuildRenderNodes()
    this.revision += 1
    const addedNodeIds = collectVenusDocumentNodeIds(storedChild)
    this.emit('document:node-added', {revision: this.revision, nodeIds: addedNodeIds, parentId})
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedNodeIds: addedNodeIds,
      order: this.getDocumentLayerOrder(parentId),
      reason: 'addChild',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds: addedNodeIds,
      reason: 'structure-changed',
    })
    this.scheduleRender()
    return createVenusNodeProxy(this, storedChild.id ?? '', storedChild.type)
  }

  /**
   * @name Venus.removeChild
   * @description Removes a child node from a frame, group, clip, or mask container by child id.
   * @example Usage
   * venus.removeChild('group-id', 'child-id')
   * await venus.render()
   * @param parentId Parent frame, group, clip, or mask id.
   * @param childId Child node id to remove.
   * @returns Nothing.
   */
  removeChild(parentId: string, childId: string): void {
    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'frame' && parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
      return
    }

    if (!(parent.children ?? []).some((child) => child.id === childId)) {
      return
    }

    this.recordHistory()
    const removedChild = (parent.children ?? []).find((child) => child.id === childId)
    const removedNodeIds = removedChild ? collectVenusDocumentNodeIds(removedChild) : [childId]
    parent.children = (parent.children ?? []).filter((c) => c.id !== childId)
    this.rebuildRenderNodes()
    this.revision += 1
    this.emit('document:node-removed', {revision: this.revision, nodeIds: removedNodeIds, parentId})
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedNodeIds: removedNodeIds,
      order: this.getDocumentLayerOrder(parentId),
      reason: 'removeChild',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds: removedNodeIds,
      reason: 'structure-changed',
    })
    this.scheduleRender()
  }

  /**
   * @name Venus.reparent
   * @description Moves one node into a new frame/group/clip/mask parent or back to the root layer.
   * @example Usage
   * const result = venus.reparent('rect-1', 'group-1', 0)
   * @param id Node id to move.
   * @param parentId Target parent id, or null for the root layer.
   * @param index Optional insertion index in the target parent-local child list.
   * @returns Reparent mutation metadata.
   */
  reparent(id: string, parentId: string | null, index?: number): VenusReparentMutationResult {
    return this.reparentDocumentNode(id, parentId, index)
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

  /**
   * Returns a raw VenusNode from the internal store. Called by VenusNodeProxy getters.
   * @param id Stable node id to inspect.
   */
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
    const base = this._requireModuleApi<{ getLayerIndex(id: string): number }>('base')
    return base.getLayerIndex(id)
  }

  /**
   * @name Venus.getLayerOrder
   * @description Returns sibling node ids for one parent. Larger indexes render above smaller indexes.
   * @example Usage
   * const rootOrder = venus.getLayerOrder()
   * const groupOrder = venus.getLayerOrder('group-1')
   * @param parentId Parent id, or null/omitted for root nodes.
   * @returns Ordered sibling node ids.
   */
  getLayerOrder(parentId: string | null = null): string[] {
    const base = this._requireModuleApi<{ getLayerOrder(parentId?: string | null): string[] }>('base')
    return base.getLayerOrder(parentId)
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
    const base = this._requireModuleApi<{ moveLayer(id: string, index: number): VenusLayerMutationResult }>('base')
    return base.moveLayer(id, index).toIndex
  }

  /**
   * @name Venus.moveBefore
   * @description Moves one node immediately before a sibling target.
   * @example Usage
   * venus.moveBefore('card', 'background')
   * @param id Node id to move.
   * @param targetId Sibling node id to move before.
   * @returns Applied sibling index, or -1 when either node cannot be moved.
   */
  moveBefore(id: string, targetId: string): number {
    const base = this._requireModuleApi<{ moveBefore(id: string, targetId: string): VenusLayerMutationResult }>('base')
    return base.moveBefore(id, targetId).toIndex
  }

  /**
   * @name Venus.moveAfter
   * @description Moves one node immediately after a sibling target.
   * @example Usage
   * venus.moveAfter('card', 'background')
   * @param id Node id to move.
   * @param targetId Sibling node id to move after.
   * @returns Applied sibling index, or -1 when either node cannot be moved.
   */
  moveAfter(id: string, targetId: string): number {
    const base = this._requireModuleApi<{ moveAfter(id: string, targetId: string): VenusLayerMutationResult }>('base')
    return base.moveAfter(id, targetId).toIndex
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
    const base = this._requireModuleApi<{ bringForward(id: string): VenusLayerMutationResult }>('base')
    return base.bringForward(id).toIndex
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
    const base = this._requireModuleApi<{ sendBackward(id: string): VenusLayerMutationResult }>('base')
    return base.sendBackward(id).toIndex
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
    const base = this._requireModuleApi<{ bringToFront(id: string): VenusLayerMutationResult }>('base')
    return base.bringToFront(id).toIndex
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
    const base = this._requireModuleApi<{ sendToBack(id: string): VenusLayerMutationResult }>('base')
    return base.sendToBack(id).toIndex
  }

  /**
   * @name Venus.validateClipGraph
   * @description Validates clip references, cycles, rules, and inline clip geometry.
   * @example Usage
   * const result = venus.validateClipGraph()
   * @param snapshot Optional scene snapshot. Defaults to the current document snapshot.
   * @returns Clip graph validation result.
   */
  validateClipGraph(snapshot: EngineSceneSnapshot = this.snapshot()): VenusClipGraphValidation {
    const nodes = this.collectEngineNodes(snapshot.nodes)
    const nodeById = new Map<string, EngineRenderableNode>()
    const issues: VenusClipGraphIssue[] = []

    for (const node of nodes) {
      if (nodeById.has(node.id)) {
        issues.push({
          code: 'duplicate-node-id',
          nodeId: node.id,
          message: `Duplicate node id "${node.id}" prevents deterministic clip graph resolution`,
        })
      }
      nodeById.set(node.id, node)
    }

    for (const node of nodes) {
      this.validateNodeClipMetadata(node, nodeById, issues)
    }

    for (const node of nodes) {
      const cycle = this.resolveClipCycle(node.id, nodeById)
      if (cycle) {
        issues.push({
          code: 'cyclic-clip-reference',
          nodeId: node.id,
          clipNodeId: cycle[1],
          message: `Clip graph contains a cycle: ${cycle.join(' -> ')}`,
        })
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      dependencies: nodes
        .map((node) => ({
          nodeId: node.id,
          clipNodeIds: this.resolveClipDependencies(node.id, snapshot),
        }))
        .filter((entry) => entry.clipNodeIds.length > 0),
    }
  }

  /**
   * @name Venus.resolveClipDependencies
   * @description Resolves direct and transitive clip node ids for one node.
   * @example Usage
   * const clipIds = venus.resolveClipDependencies('image-1')
   * @param nodeId Node id whose clip chain should be inspected.
   * @param snapshot Optional scene snapshot. Defaults to the current document snapshot.
   * @returns Clip node ids in traversal order.
   */
  resolveClipDependencies(nodeId: string, snapshot: EngineSceneSnapshot = this.snapshot()): string[] {
    const nodeById = new Map(this.collectEngineNodes(snapshot.nodes).map((node) => [node.id, node]))
    const dependencies: string[] = []
    const visited = new Set<string>()
    let current = nodeById.get(nodeId)

    while (current?.clip?.clipNodeId) {
      const clipNodeId = current.clip.clipNodeId
      dependencies.push(clipNodeId)
      if (visited.has(clipNodeId)) {
        break
      }
      visited.add(clipNodeId)
      current = nodeById.get(clipNodeId)
    }

    return dependencies
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

  /**
   * @name Venus.inspectImageResources
   * @description Reports whether image nodes can be resolved by the current host resource loader.
   * @example Usage
   * const resources = venus.inspectImageResources()
   * console.log(resources.missingCount)
   * @returns Per-image resource diagnostics for the current engine snapshot.
   */
  inspectImageResources(): VenusImageResourceInspection {
    const diagnostics: VenusImageResourceDiagnostic[] = []
    const loader = this.parameters.resource?.loader
    this.collectImageResourceDiagnostics(this.nodes, diagnostics, loader)

    const resolvedCount = diagnostics.filter((diagnostic) => diagnostic.resolved).length
    return {
      imageCount: diagnostics.length,
      resolvedCount,
      missingCount: diagnostics.length - resolvedCount,
      allResolved: resolvedCount === diagnostics.length,
      diagnostics,
    }
  }

  private collectImageResourceDiagnostics(
    nodes: readonly EngineRenderableNode[],
    diagnostics: VenusImageResourceDiagnostic[],
    loader: EngineResourceLoader | undefined,
  ): void {
    for (const node of nodes) {
      if (node.type === 'image') {
        diagnostics.push(this.inspectImageNodeResource(node, loader))
        continue
      }

      if (node.type === 'group') {
        this.collectImageResourceDiagnostics(node.children, diagnostics, loader)
      }
    }
  }

  private inspectImageNodeResource(
    node: EngineImageNode,
    loader: EngineResourceLoader | undefined,
  ): VenusImageResourceDiagnostic {
    const base = {
      nodeId: node.id,
      assetId: node.assetId,
      assetUrl: node.assetUrl,
      sourceRect: node.sourceRect,
      naturalSize: node.naturalSize,
      imageSmoothing: node.imageSmoothing,
    }

    if (!loader) {
      return {
        ...base,
        resolved: false,
        status: 'missing-loader',
        reason: `No resource loader is configured for image asset "${node.assetId}"`,
      }
    }

    try {
      const source = loader.resolveImage(node.assetId)
      if (source) {
        return {
          ...base,
          resolved: true,
          status: 'resolved',
          reason: `Image asset "${node.assetId}" resolved by resource loader`,
        }
      }

      return {
        ...base,
        resolved: false,
        status: 'missing-resource',
        reason: `Resource loader returned no image for asset "${node.assetId}"`,
      }
    } catch (error) {
      return {
        ...base,
        resolved: false,
        status: 'loader-error',
        reason: error instanceof Error
          ? `Resource loader failed for asset "${node.assetId}": ${error.message}`
          : `Resource loader failed for asset "${node.assetId}": ${String(error)}`,
      }
    }
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
    const userModules = parameters.modules ?? []
    const explicitBaseModule = userModules.find((module) => module.name === 'base')
    const modules = explicitBaseModule
      ? [
          explicitBaseModule,
          ...userModules.filter((module) => module !== explicitBaseModule),
        ]
      : [createVenusBaseModule(), ...userModules]
    this.installModules(modules)
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
      group: (ids: readonly string[], options?: VenusGroupOptions) => this.group(ids, options),
      ungroup: (id: string) => this.ungroup(id),
      addChild: (parentId: string, child: VenusNode) => this.addChild(parentId, child),
      removeChild: (parentId: string, childId: string) => this.removeChild(parentId, childId),
      reparent: (id: string, parentId: string | null, index?: number) => this.reparent(id, parentId, index),
      getLayerIndex: (id: string) => this.getDocumentLayerIndex(id),
      getLayerOrder: (parentId: string | null = null) => this.getDocumentLayerOrder(parentId),
      moveLayer: (id: string, index: number) => this.moveDocumentLayer(id, index),
      moveBefore: (id: string, targetId: string) => this.moveDocumentBefore(id, targetId),
      moveAfter: (id: string, targetId: string) => this.moveDocumentAfter(id, targetId),
      bringForward: (id: string) => this.moveDocumentLayer(id, this.getDocumentLayerIndex(id) + 1),
      sendBackward: (id: string) => this.moveDocumentLayer(id, this.getDocumentLayerIndex(id) - 1),
      bringToFront: (id: string) => this.moveDocumentLayer(id, this.getDocumentSiblingCount(id) - 1),
      sendToBack: (id: string) => this.moveDocumentLayer(id, 0),
      validateClipGraph: (snapshot?: EngineSceneSnapshot) => this.validateClipGraph(snapshot),
      resolveClipDependencies: (nodeId: string, snapshot?: EngineSceneSnapshot) => this.resolveClipDependencies(nodeId, snapshot),
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

  /**
   * Throws when an optional module API is used without installing that module.
   * @param moduleName Optional module name required by the caller.
   */
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
    this.emit('document:changed', {revision: this.revision, reason: 'history-restored'})
    this.scheduleRender()
  }

  /**
   * Resolves one node's sibling index without mutating document state.
   * @param id Node id to inspect.
   */
  private getDocumentLayerIndex(id: string): number {
    const node = this.nodeById.get(id)
    if (!node) {
      return -1
    }

    const siblings = this.resolveSiblingNodes(this.parentById.get(id) ?? null)
    return siblings?.indexOf(node) ?? -1
  }

  /**
   * Resolves sibling ids for one parent-local layer list.
   * @param parentId Parent id, or null for the root layer.
   */
  private getDocumentLayerOrder(parentId: string | null = null): string[] {
    const siblings = this.resolveSiblingNodes(parentId)
    return siblings?.map((node) => node.id).filter((id): id is string => Boolean(id)) ?? []
  }

  /**
   * Resolves the number of siblings in the node's current parent-local layer list.
   * @param id Node id whose sibling list should be counted.
   */
  private getDocumentSiblingCount(id: string): number {
    const siblings = this.resolveSiblingNodes(this.parentById.get(id) ?? null)
    return siblings?.length ?? 0
  }

  /**
   * Moves a node between parent-local child lists without changing authored geometry.
   * @param id Node id to move.
   * @param toParentId Target parent id, or null for the root layer.
   * @param index Optional target child index. Defaults to appending in the target parent.
   */
  private reparentDocumentNode(id: string, toParentId: string | null, index?: number): VenusReparentMutationResult {
    const node = this.nodeById.get(id)
    const fromParentId = this.parentById.get(id) ?? null
    const sourceSiblings = this.resolveSiblingNodes(fromParentId)
    const fromIndex = node && sourceSiblings ? sourceSiblings.indexOf(node) : -1
    const targetSiblings = this.resolveSiblingNodes(toParentId)
    const rejectedOrder = this.getDocumentLayerOrder(toParentId)

    if (!node || !sourceSiblings || fromIndex < 0 || !targetSiblings) {
      return createVenusReparentMutationResult(id, fromParentId, toParentId, fromIndex, -1, false, this.revision, rejectedOrder)
    }

    if (toParentId === id || this.isDocumentAncestor(id, toParentId)) {
      return createVenusReparentMutationResult(id, fromParentId, toParentId, fromIndex, -1, false, this.revision, rejectedOrder)
    }

    if (fromParentId === toParentId) {
      if (index === undefined) {
        return createVenusReparentMutationResult(id, fromParentId, toParentId, fromIndex, fromIndex, false, this.revision, this.getDocumentLayerOrder(fromParentId))
      }

      const layerResult = this.moveDocumentLayer(id, index)
      return createVenusReparentMutationResult(
        id,
        fromParentId,
        toParentId,
        layerResult.fromIndex,
        layerResult.toIndex,
        layerResult.applied,
        layerResult.revision,
        layerResult.order,
      )
    }

    const targetIndex = Number.isFinite(index)
      ? Math.max(0, Math.min(targetSiblings.length, Math.trunc(index as number)))
      : targetSiblings.length

    this.recordHistory()
    const nextSourceSiblings = [
      ...sourceSiblings.slice(0, fromIndex),
      ...sourceSiblings.slice(fromIndex + 1),
    ]
    const nextTargetSiblings = [
      ...targetSiblings.slice(0, targetIndex),
      node,
      ...targetSiblings.slice(targetIndex),
    ]
    this.replaceSiblingNodes(fromParentId, nextSourceSiblings)
    this.replaceSiblingNodes(toParentId, nextTargetSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    const affectedParentIds = Array.from(new Set([fromParentId, toParentId]))
    const affectedNodeIds = collectVenusDocumentNodeIds(node)
    const order = this.getDocumentLayerOrder(toParentId)

    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId: toParentId,
      affectedParentIds,
      affectedNodeIds,
      order,
      reason: 'reparent',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds,
      reason: 'structure-changed',
    })
    this.scheduleRender()

    return createVenusReparentMutationResult(id, fromParentId, toParentId, fromIndex, order.indexOf(id), true, this.revision, order)
  }

  /**
   * Moves a node inside its parent-local layer list and returns mutation metadata.
   * @param id Node id to move.
   * @param index Requested sibling index; clamped to the current sibling range.
   */
  private moveDocumentLayer(id: string, index: number): VenusLayerMutationResult {
    const node = this.nodeById.get(id)
    if (!node) {
      return createVenusLayerMutationResult(id, null, -1, -1, false, this.revision, [])
    }

    const parentId = this.parentById.get(id) ?? null
    const siblings = this.resolveSiblingNodes(parentId)
    const currentIndex = siblings?.indexOf(node) ?? -1
    if (!siblings || currentIndex < 0) {
      return createVenusLayerMutationResult(id, parentId, -1, -1, false, this.revision, [])
    }

    const currentOrder = this.getDocumentLayerOrder(parentId)
    const targetIndex = Number.isFinite(index)
      ? Math.max(0, Math.min(siblings.length - 1, Math.trunc(index)))
      : currentIndex
    if (targetIndex === currentIndex) {
      return createVenusLayerMutationResult(id, parentId, currentIndex, currentIndex, false, this.revision, currentOrder)
    }

    this.recordHistory()
    const nextSiblings = [...siblings]
    nextSiblings.splice(currentIndex, 1)
    nextSiblings.splice(targetIndex, 0, node)
    this.replaceSiblingNodes(parentId, nextSiblings)
    this.rebuildRenderNodes()
    this.revision += 1
    const result = createVenusLayerMutationResult(id, parentId, currentIndex, targetIndex, true, this.revision, this.getDocumentLayerOrder(parentId))
    this.emit('layer:changed', result)
    this.emit('document:structure-changed', {
      revision: this.revision,
      parentId,
      affectedNodeIds: [id],
      order: result.order,
      reason: 'layer',
    })
    this.emit('document:changed', {
      revision: this.revision,
      affectedNodeIds: [id],
      reason: 'layer-changed',
    })
    this.scheduleRender()
    return result
  }

  /**
   * Moves one node immediately before a sibling target.
   * @param id Node id to move.
   * @param targetId Sibling target id.
   */
  private moveDocumentBefore(id: string, targetId: string): VenusLayerMutationResult {
    return this.moveDocumentBesideSibling(id, targetId, 'before')
  }

  /**
   * Moves one node immediately after a sibling target.
   * @param id Node id to move.
   * @param targetId Sibling target id.
   */
  private moveDocumentAfter(id: string, targetId: string): VenusLayerMutationResult {
    return this.moveDocumentBesideSibling(id, targetId, 'after')
  }

  /**
   * Resolves before/after layer movement while rejecting cross-parent moves.
   * @param id Node id to move.
   * @param targetId Sibling target id.
   * @param placement Whether the moved node should land before or after the target.
   */
  private moveDocumentBesideSibling(id: string, targetId: string, placement: 'before' | 'after'): VenusLayerMutationResult {
    if (id === targetId) {
      const parentId = this.parentById.get(id) ?? null
      const index = this.getDocumentLayerIndex(id)
      return createVenusLayerMutationResult(id, parentId, index, index, false, this.revision, this.getDocumentLayerOrder(parentId))
    }

    const parentId = this.parentById.get(id) ?? null
    if ((this.parentById.get(targetId) ?? null) !== parentId) {
      return createVenusLayerMutationResult(id, parentId, this.getDocumentLayerIndex(id), -1, false, this.revision, this.getDocumentLayerOrder(parentId))
    }

    const siblings = this.resolveSiblingNodes(parentId)
    const node = this.nodeById.get(id)
    const target = this.nodeById.get(targetId)
    const currentIndex = node && siblings ? siblings.indexOf(node) : -1
    const targetIndex = target && siblings ? siblings.indexOf(target) : -1
    if (!siblings || currentIndex < 0 || targetIndex < 0) {
      return createVenusLayerMutationResult(id, parentId, currentIndex, -1, false, this.revision, this.getDocumentLayerOrder(parentId))
    }

    const nextIndex = placement === 'before'
      ? (currentIndex < targetIndex ? targetIndex - 1 : targetIndex)
      : (currentIndex < targetIndex ? targetIndex : targetIndex + 1)
    return this.moveDocumentLayer(id, nextIndex)
  }

  /**
   * Returns true when `ancestorId` owns `nodeId` somewhere in its subtree.
   * @param ancestorId Possible ancestor node id.
   * @param nodeId Possible descendant node id.
   */
  private isDocumentAncestor(ancestorId: string, nodeId: string | null): boolean {
    let currentId = nodeId
    while (currentId) {
      if (currentId === ancestorId) {
        return true
      }
      currentId = this.parentById.get(currentId) ?? null
    }
    return false
  }

  /**
   * Normalizes structural selections by removing descendants of selected ancestors.
   * @param ids Candidate public document ids from a product selection.
   */
  private normalizeDocumentStructureSelection(ids: readonly string[]): string[] {
    const uniqueIds = Array.from(new Set(ids))
    const selectedSet = new Set(uniqueIds)
    const order = this.resolveDocumentOrderIndex()

    uniqueIds.forEach((id) => {
      if (!this.nodeById.has(id)) {
        throw new Error(`Node "${id}" not found`)
      }
    })

    return uniqueIds
      .filter((id) => !this.hasSelectedDocumentAncestor(id, selectedSet))
      .sort((a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER))
  }

  private hasSelectedDocumentAncestor(id: string, selectedSet: ReadonlySet<string>): boolean {
    let parentId = this.parentById.get(id) ?? null
    while (parentId) {
      if (selectedSet.has(parentId)) {
        return true
      }
      parentId = this.parentById.get(parentId) ?? null
    }
    return false
  }

  private resolveDocumentOrderIndex(): Map<string, number> {
    const order = new Map<string, number>()
    let index = 0
    const visit = (node: VenusNode) => {
      if (node.id) {
        order.set(node.id, index)
        index += 1
      }
      if (node.type === 'frame' || node.type === 'group') {
        node.children.forEach(visit)
        return
      }
      if (node.type === 'clip' || node.type === 'mask') {
        visit(node.clipPath)
        node.children.forEach(visit)
      }
    }
    this.documentNodes.forEach(visit)
    return order
  }

  private collectEngineNodes(nodes: readonly EngineRenderableNode[]): EngineRenderableNode[] {
    const result: EngineRenderableNode[] = []

    for (const node of nodes) {
      result.push(node)
      if (node.type === 'group') {
        result.push(...this.collectEngineNodes(node.children))
      }
    }

    return result
  }

  private validateNodeClipMetadata(
    node: EngineRenderableNode,
    nodeById: ReadonlyMap<string, EngineRenderableNode>,
    issues: VenusClipGraphIssue[],
  ): void {
    const clip = node.clip
    if (!clip) {
      return
    }

    if (clip.rule !== undefined && clip.rule !== 'nonzero' && clip.rule !== 'evenodd') {
      issues.push({
        code: 'invalid-clip-rule',
        nodeId: node.id,
        message: `Node "${node.id}" has invalid clip rule "${String(clip.rule)}"`,
      })
    }

    if (clip.clipNodeId) {
      if (clip.clipNodeId === node.id) {
        issues.push({
          code: 'self-clip-reference',
          nodeId: node.id,
          clipNodeId: clip.clipNodeId,
          message: `Node "${node.id}" cannot clip itself`,
        })
      } else if (!nodeById.has(clip.clipNodeId)) {
        issues.push({
          code: 'missing-clip-node',
          nodeId: node.id,
          clipNodeId: clip.clipNodeId,
          message: `Node "${node.id}" references missing clip node "${clip.clipNodeId}"`,
        })
      }
    }

    if (clip.clipShape && !this.isValidInlineClipShape(clip.clipShape)) {
      issues.push({
        code: 'invalid-inline-clip',
        nodeId: node.id,
        message: `Node "${node.id}" has invalid inline clip geometry`,
      })
    }
  }

  private isValidInlineClipShape(clipShape: NonNullable<EngineRenderableNode['clip']>['clipShape']): boolean {
    if (!clipShape) {
      return true
    }

    if (clipShape.kind === 'rect') {
      return Number.isFinite(clipShape.rect.x)
        && Number.isFinite(clipShape.rect.y)
        && Number.isFinite(clipShape.rect.width)
        && Number.isFinite(clipShape.rect.height)
        && clipShape.rect.width > 0
        && clipShape.rect.height > 0
    }

    return clipShape.points.length >= 2
      && clipShape.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  }

  private resolveClipCycle(
    nodeId: string,
    nodeById: ReadonlyMap<string, EngineRenderableNode>,
  ): string[] | null {
    const path: string[] = []
    const seenIndexById = new Map<string, number>()
    let currentId: string | undefined = nodeId

    while (currentId) {
      const seenIndex = seenIndexById.get(currentId)
      if (seenIndex !== undefined) {
        return [...path.slice(seenIndex), currentId]
      }

      seenIndexById.set(currentId, path.length)
      path.push(currentId)
      currentId = nodeById.get(currentId)?.clip?.clipNodeId
    }

    return null
  }

  private resolveSiblingNodes(parentId: string | null): VenusNode[] | null {
    if (!parentId) {
      return this.documentNodes
    }

    const parent = this.nodeById.get(parentId)
    if (!parent || (parent.type !== 'frame' && parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
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
    if (!parent || (parent.type !== 'frame' && parent.type !== 'group' && parent.type !== 'clip' && parent.type !== 'mask')) {
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

    if (node.type === 'frame' || node.type === 'group') {
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
   * @name Venus.exportPNG
   * @description Exports the current canvas as a PNG data URL.
   * @example Usage
   * const url = await venus.exportPNG({ scale: 2 })
   * @param options Optional PNG export settings.
   * @param options.scale Output scale factor (default 1).
   * @param options.background Background color (default transparent).
   * @returns PNG data URL.
   */
  async exportPNG(options?: VenusPngExportOptions): Promise<string> {
    const exp = this._requireModuleApi<{ toPNG(o?: VenusPngExportOptions): Promise<string> }>('export')
    return exp.toPNG(options)
  }

  /**
   * @name Venus.exportJPEG
   * @description Exports the current canvas as a JPEG data URL.
   * @example Usage
   * const url = await venus.exportJPEG({ quality: 0.9, background: '#ffffff' })
   * @param options Optional JPEG export settings.
   * @param options.scale Output scale factor (default 1).
   * @param options.quality JPEG quality 0–1 (default 0.92).
   * @param options.background Background color (default white).
   * @returns JPEG data URL.
   */
  async exportJPEG(options?: VenusJpegExportOptions): Promise<string> {
    const exp = this._requireModuleApi<{ toJPEG(o?: VenusJpegExportOptions): Promise<string> }>('export')
    return exp.toJPEG(options)
  }

  /**
   * @name Venus.exportSVG
   * @description Exports the current document as an SVG string.
   * @example Usage
   * const svg = await venus.exportSVG({ embedImages: true })
   * @param options Optional SVG export settings.
   * @param options.embedImages Writes image asset ids to href even when they are not URLs.
   * @param options.pretty Whether to emit line breaks between top-level SVG nodes.
   * @returns SVG string.
   */
  async exportSVG(options?: VenusSvgExportOptions): Promise<string> {
    const exp = this._requireModuleApi<{ toSVG(o?: VenusSvgExportOptions): Promise<string> }>('export')
    return exp.toSVG(options)
  }

  /**
   * @name Venus.exportNode
   * @description Exports one document node and its subtree as SVG.
   * @example Usage
   * const svg = await venus.exportNode('card')
   * @param id Document node id to export.
   * @param options SVG serialization and cropping options.
   * @returns SVG string.
   */
  async exportNode(id: string, options: VenusScopedSvgExportOptions = {}): Promise<string> {
    const exp = this._requireModuleApi<{
      toSVGSnapshot(snapshot: EngineSceneSnapshot, options?: VenusSvgExportOptions): Promise<string>
    }>('export')
    const snapshot = this.createScopedExportSnapshot(new Set([id]), options, `Cannot export node "${id}": node not found`)
    return exp.toSVGSnapshot(snapshot, this.resolveScopedSvgOptions(snapshot.nodes, options))
  }

  /**
   * @name Venus.exportSelection
   * @description Exports the current selected nodes as SVG.
   * @example Usage
   * const svg = await venus.exportSelection()
   * @param options SVG serialization and cropping options.
   * @returns SVG string.
   */
  async exportSelection(options: VenusScopedSvgExportOptions = {}): Promise<string> {
    const exp = this._requireModuleApi<{
      toSVGSnapshot(snapshot: EngineSceneSnapshot, options?: VenusSvgExportOptions): Promise<string>
    }>('export')
    const selectedIds = this.getSelection()
    const snapshot = this.createScopedExportSnapshot(selectedIds, options, 'Cannot export selection: selection is empty')
    return exp.toSVGSnapshot(snapshot, this.resolveScopedSvgOptions(snapshot.nodes, options))
  }

  /**
   * @name Venus.toPNG
   * @description Backward-compatible alias for `venus.exportPNG`.
   * @example Usage
   * const url = await venus.exportPNG({ scale: 2 })
   * @param options Optional PNG export settings.
   * @param options.scale Output scale factor (default 1).
   * @param options.background Background color (default transparent).
   * @returns PNG data URL.
   */
  async toPNG(options?: VenusPngExportOptions): Promise<string> {
    return this.exportPNG(options)
  }

  /**
   * @name Venus.toJPEG
   * @description Backward-compatible alias for `venus.exportJPEG`.
   * @example Usage
   * const url = await venus.exportJPEG({ quality: 0.9, background: '#ffffff' })
   * @param options Optional JPEG export settings.
   * @param options.scale Output scale factor (default 1).
   * @param options.quality JPEG quality 0–1 (default 0.92).
   * @param options.background Background color (default white).
   * @returns JPEG data URL.
   */
  async toJPEG(options?: VenusJpegExportOptions): Promise<string> {
    return this.exportJPEG(options)
  }

  /**
   * @name Venus.toSVG
   * @description Backward-compatible alias for `venus.exportSVG`.
   * @example Usage
   * const svg = await venus.exportSVG({ embedImages: true })
   * @param options Optional SVG export settings.
   * @param options.embedImages Writes image asset ids to href even when they are not URLs.
   * @param options.pretty Whether to emit line breaks between top-level SVG nodes.
   * @returns SVG string.
   */
  async toSVG(options?: VenusSvgExportOptions): Promise<string> {
    return this.exportSVG(options)
  }

  private createScopedExportSnapshot(
    ids: ReadonlySet<string>,
    options: VenusScopedSvgExportOptions,
    emptyMessage: string,
  ): EngineSceneSnapshot {
    const nodes = this.filterEngineNodesByIds(this.nodes, ids)
    if (nodes.length === 0) {
      throw new Error(emptyMessage)
    }

    const scopedOptions = this.resolveScopedSvgOptions(nodes, options)
    return {
      ...this.createSnapshot(),
      width: scopedOptions.viewBox?.width ?? this.createSnapshot().width,
      height: scopedOptions.viewBox?.height ?? this.createSnapshot().height,
      nodes,
    }
  }

  private resolveScopedSvgOptions(
    nodes: readonly EngineRenderableNode[],
    options: VenusScopedSvgExportOptions,
  ): VenusSvgExportOptions {
    if (options.viewBox || options.trimToContent === false) {
      return options
    }

    const bounds = resolveEngineNodesBounds(nodes)
    if (!bounds) {
      return options
    }

    return {
      ...options,
      viewBox: {
        x: bounds.x,
        y: bounds.y,
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height),
      },
    }
  }

  private filterEngineNodesByIds(
    nodes: readonly EngineRenderableNode[],
    ids: ReadonlySet<string>,
  ): EngineRenderableNode[] {
    const result: EngineRenderableNode[] = []

    for (const node of nodes) {
      if (ids.has(node.id)) {
        result.push(node)
        continue
      }

      if (node.type !== 'group') {
        continue
      }

      const children = this.filterEngineNodesByIds(node.children, ids)
      if (children.length > 0) {
        result.push({...node, children})
      }
    }

    return result
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
   * @param options.respectClip Keeps clipped-out content from being hit. Defaults to true.
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
   * @param options.respectClip Keeps clipped-out content from being hit. Defaults to true.
   * @returns Ordered hit results with target, region, anchor, center, and bounds metadata.
   */
  hitTestAll(point: {x: number, y: number}, options: VenusHitTestOptions = {}): VenusDetailedHitTestResult[] {
    this.requireModuleInstalled('hitTest')
    return this.resolveDetailedHits(point, resolveVenusHitTestOptions(options))
  }

  /**
   * @name Venus.querySelectionInRect
   * @description Returns document node ids whose world bounds match a rectangle query.
   * @example Usage
   * const ids = venus.querySelectionInRect({x: 0, y: 0, width: 240, height: 180})
   * @param rect Query rectangle in document or screen coordinates.
   * @param options Query policy.
   * @param options.coordinateSpace Coordinate space of rect. Document space is the default.
   * @param options.mode Selection geometry policy. Intersect is the default; contain requires full containment.
   * @param options.includeLocked Includes locked nodes in query results.
   * @param options.includeHidden Includes nodes with visible false.
   * @param options.includeContainers Includes structure/container nodes such as group, clip, and mask.
   * @returns Matching node ids in render traversal order.
   */
  querySelectionInRect(
    rect: VenusSelectionRect,
    options: VenusSelectionRectQueryOptions = {},
  ): string[] {
    this.requireModuleInstalled('interaction')
    return this.resolveSelectionRectCandidateIds(rect, options)
  }

  /**
   * @name Venus.selectInRect
   * @description Applies rectangle query results to the current selection.
   * @example Usage
   * const ids = venus.selectInRect({x: 0, y: 0, width: 240, height: 180})
   * @param rect Query rectangle in document or screen coordinates.
   * @param options Selection and query policy.
   * @param options.selectionMode How query results update the current selection.
   * @returns The selection ids after applying the query.
   */
  selectInRect(
    rect: VenusSelectionRect,
    options: VenusSelectInRectOptions = {},
  ): string[] {
    this.requireModuleInstalled('interaction')
    const ids = this.resolveSelectionRectCandidateIds(rect, options)
    const currentSelection = new Set(this.getSelection())
    const nextSelection = new Set(options.selectionMode === 'replace' ? [] : currentSelection)

    switch (options.selectionMode ?? 'replace') {
      case 'add':
        ids.forEach((id) => nextSelection.add(id))
        break
      case 'subtract':
        ids.forEach((id) => nextSelection.delete(id))
        break
      case 'toggle':
        ids.forEach((id) => {
          if (nextSelection.has(id)) {
            nextSelection.delete(id)
          } else {
            nextSelection.add(id)
          }
        })
        break
      case 'replace':
      default:
        ids.forEach((id) => nextSelection.add(id))
        break
    }

    this.setSelection([...nextSelection])
    return [...this.getSelection()]
  }

  /**
   * @name Venus.getSelectionOverlay
   * @description Returns style-free selection overlay geometry for the current selection.
   * @example Usage
   * const overlay = venus.getSelectionOverlay()
   * @param options Optional ids override; defaults to the interaction selection snapshot.
   * @param options.ids Optional ids to inspect instead of the current interaction selection.
   * @returns Selection bounds and outline geometry, or null when no selected bounds exist.
   */
  getSelectionOverlay(options: VenusSelectionOverlayOptions = {}): VenusSelectionOverlay | null {
    this.requireModuleInstalled('interaction')
    const selectedIds = [...(options.ids ?? this.getSelection())]
    const bounds = this.resolveNodeIdsAggregateBounds(selectedIds)
    if (!bounds) {
      return null
    }

    const overlayBounds = engineRectToOverlayBounds(bounds)
    return {
      selectedIds,
      bounds: overlayBounds,
      outline: {
        kind: 'rect',
        bounds: overlayBounds,
      },
      revision: this.revision,
    }
  }

  /**
   * @name Venus.getHoverOverlay
   * @description Returns style-free hover overlay geometry for a node id or topmost hit point.
   * @example Usage
   * const overlay = venus.getHoverOverlay({nodeId: 'rect-1'})
   * @param options Hover source options.
   * @param options.nodeId Node id to outline.
   * @param options.point Screen-space point used to resolve a hit when no node id is supplied.
   * @param options.hitOptions Hit-test options used when point is supplied.
   * @returns Hover bounds and outline geometry, or null when no node can be resolved.
   */
  getHoverOverlay(options: VenusHoverOverlayOptions): VenusHoverOverlay | null {
    this.requireModuleInstalled('interaction')
    const hit = options.nodeId
      ? undefined
      : options.point
        ? this.hitTest(options.point, options.hitOptions)
        : null
    const nodeId = options.nodeId ?? hit?.nodeId
    if (!nodeId) {
      return null
    }

    const bounds = this.resolveNodeIdsAggregateBounds([nodeId])
    if (!bounds) {
      return null
    }

    const overlayBounds = engineRectToOverlayBounds(bounds)
    return {
      nodeId,
      bounds: overlayBounds,
      outline: {
        kind: 'rect',
        bounds: overlayBounds,
      },
      hit: hit ?? undefined,
      revision: this.revision,
    }
  }

  private resolveDetailedHits(
    point: {x: number; y: number},
    options: ReturnType<typeof resolveVenusHitTestOptions>,
  ): VenusDetailedHitTestResult[] {
    return resolveVenusDetailedHits({
      point,
      options,
      hits: this.engine?.hitTestAll(point, options.tolerance, {respectClip: options.respectClip}) ?? [],
      resolveNode: (id) => this._rawNode(id),
      resolveBounds: getNodeBounds,
    })
  }

  private resolveSelectionRectCandidateIds(
    rect: VenusSelectionRect,
    options: VenusSelectionRectQueryOptions,
  ): string[] {
    const queryRect = this.resolveSelectionQueryRect(rect, options.coordinateSpace)
    const mode = options.mode ?? 'intersect'
    const ids: string[] = []

    this.visitSelectionCandidates(this.nodes, IDENTITY_TRANSFORM, {hidden: false, locked: false}, (node, bounds, state) => {
      const sourceNode = this._rawNode(node.id)
      const isContainer = node.type === 'group'
      if (!sourceNode) {
        return
      }
      if (state.locked && options.includeLocked !== true) {
        return
      }
      if (state.hidden && options.includeHidden !== true) {
        return
      }
      if (isContainer && options.includeContainers === false) {
        return
      }

      const matches = mode === 'contain'
        ? rectContains(queryRect, bounds)
        : rectsIntersect(queryRect, bounds)
      if (matches) {
        ids.push(node.id)
      }
    })

    return ids
  }

  private resolveNodeIdsAggregateBounds(ids: readonly string[]): EngineRect | null {
    if (ids.length === 0) {
      return null
    }

    const selectedIds = new Set(ids)
    let aggregate: EngineRect | null = null

    this.visitSelectionCandidates(this.nodes, IDENTITY_TRANSFORM, {hidden: false, locked: false}, (node, bounds) => {
      if (!selectedIds.has(node.id)) {
        return
      }
      aggregate = aggregate ? unionEngineBounds(aggregate, bounds) : bounds
    })

    return aggregate
  }

  private resolveSelectionQueryRect(
    rect: VenusSelectionRect,
    coordinateSpace: VenusSelectionRectQueryOptions['coordinateSpace'] = 'document',
  ): EngineRect {
    if (coordinateSpace !== 'screen') {
      return normalizeSelectionRect(rect)
    }

    const corners = [
      unprojectVenusCameraPoint(this.viewport, {x: rect.x, y: rect.y}),
      unprojectVenusCameraPoint(this.viewport, {x: rect.x + rect.width, y: rect.y}),
      unprojectVenusCameraPoint(this.viewport, {x: rect.x, y: rect.y + rect.height}),
      unprojectVenusCameraPoint(this.viewport, {x: rect.x + rect.width, y: rect.y + rect.height}),
    ]
    const minX = Math.min(...corners.map((point) => point.x))
    const minY = Math.min(...corners.map((point) => point.y))
    const maxX = Math.max(...corners.map((point) => point.x))
    const maxY = Math.max(...corners.map((point) => point.y))
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  private visitSelectionCandidates(
    nodes: readonly EngineRenderableNode[],
    parentMatrix: EngineTransform2D['matrix'],
    inheritedState: {hidden: boolean; locked: boolean},
    visitor: (node: EngineRenderableNode, bounds: EngineRect, state: {hidden: boolean; locked: boolean}) => void,
  ): EngineRect | null {
    let aggregate: EngineRect | null = null

    for (const node of nodes) {
      const nodeMatrix = multiplyTransformMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_TRANSFORM)
      const sourceNode = this._rawNode(node.id)
      const state = {
        hidden: inheritedState.hidden || sourceNode?.visible === false,
        locked: inheritedState.locked || sourceNode?.locked === true,
      }
      const bounds = node.type === 'group'
        ? this.visitSelectionCandidates(node.children, nodeMatrix, state, visitor)
        : resolveLeafNodeWorldBounds(node, nodeMatrix)

      if (!bounds) {
        continue
      }

      visitor(node, bounds, state)
      aggregate = aggregate ? unionEngineBounds(aggregate, bounds) : bounds
    }

    return aggregate
  }

  // ── Selection (delegates to interaction module) ──────────────────────────

  /**
   * @name Venus.getSelection
   * @description Returns a stable snapshot of the selected document node ids.
   * @example Usage
   * const ids = [...venus.getSelection()]
   * @returns Read-only selected id set.
   */
  getSelection(): ReadonlySet<string> {
    const interaction = this._requireModuleApi<{ getSelection(): ReadonlySet<string> }>('interaction')
    return interaction.getSelection()
  }

  /**
   * @name Venus.setSelection
   * @description Replaces the current selection with the provided document node ids.
   * @example Usage
   * venus.setSelection(['rect-1', 'ellipse-2'])
   * @param ids Document node ids to select.
   */
  setSelection(ids: readonly string[]): void {
    const interaction = this._requireModuleApi<{
      getSelection(): ReadonlySet<string>
      setSelection(ids: readonly string[]): void
    }>('interaction')
    const previousSelection = interaction.getSelection()
    interaction.setSelection(ids)
    this.emitSelectionChanged(previousSelection, interaction.getSelection())
  }

  /**
   * @name Venus.select
   * @description Selects one or more document node ids.
   * @example Usage
   * venus.select('rect-1')
   * venus.select(['rect-1', 'ellipse-2'])
   * @param ids A single node id or an array of node ids to select.
   */
  select(ids: string | readonly string[]): void {
    const interaction = this._requireModuleApi<{
      getSelection(): ReadonlySet<string>
      select(ids: string | readonly string[]): void
    }>('interaction')
    const previousSelection = interaction.getSelection()
    interaction.select(ids)
    this.emitSelectionChanged(previousSelection, interaction.getSelection())
  }

  /**
   * @name Venus.deselect
   * @description Deselects one or more document node ids.
   * @example Usage
   * venus.deselect('rect-1')
   * @param ids A single node id or an array of node ids to deselect.
   */
  deselect(ids: string | readonly string[]): void {
    const interaction = this._requireModuleApi<{
      getSelection(): ReadonlySet<string>
      deselect(ids: string | readonly string[]): void
    }>('interaction')
    const previousSelection = interaction.getSelection()
    interaction.deselect(ids)
    this.emitSelectionChanged(previousSelection, interaction.getSelection())
  }

  /**
   * @name Venus.selectAll
   * @description Selects every root-level document node.
   * @example Usage
   * venus.selectAll()
   */
  selectAll(): void {
    const interaction = this._requireModuleApi<{
      getSelection(): ReadonlySet<string>
      selectAll(): void
    }>('interaction')
    const previousSelection = interaction.getSelection()
    interaction.selectAll()
    this.emitSelectionChanged(previousSelection, interaction.getSelection())
  }

  /**
   * @name Venus.clearSelection
   * @description Clears the current selection.
   * @example Usage
   * venus.clearSelection()
   */
  clearSelection(): void {
    const interaction = this._requireModuleApi<{
      getSelection(): ReadonlySet<string>
      clearSelection(): void
    }>('interaction')
    const previousSelection = interaction.getSelection()
    interaction.clearSelection()
    this.emitSelectionChanged(previousSelection, interaction.getSelection())
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

  private emitSelectionChanged(
    previousSelection: ReadonlySet<string>,
    nextSelection: ReadonlySet<string>,
  ): void {
    if (
      previousSelection.size === nextSelection.size &&
      [...previousSelection].every((id) => nextSelection.has(id))
    ) {
      return
    }

    this.emit('selection:changed', {
      selection: [...nextSelection],
      previousSelection: [...previousSelection],
      added: [...nextSelection].filter((id) => !previousSelection.has(id)),
      removed: [...previousSelection].filter((id) => !nextSelection.has(id)),
    })
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
