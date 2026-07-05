import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest/hitTest.ts'

/**
 * Declares axis-aligned bounds payload returned by engine geometry queries.
 */
export interface EngineGeometryBounds {
  /** Stores minimum x in world coordinates. */
  minX: number
  /** Stores minimum y in world coordinates. */
  minY: number
  /** Stores maximum x in world coordinates. */
  maxX: number
  /** Stores maximum y in world coordinates. */
  maxY: number
}

/**
 * Declares one outline geometry payload that vector can render selectively.
 */
export interface EngineGeometryOutline {
  /** Stores shape form so vector can branch without parsing points heuristically. */
  kind: 'polyline' | 'bounds'
  /** Stores point list for polyline outlines. */
  points?: EngineEditorPoint[]
  /** Stores bounds fallback for bbox outlines. */
  bounds?: EngineGeometryBounds
  /** Stores whether the point list should be rendered as closed. */
  closed: boolean
}

/**
 * Declares guide/hint message semantics emitted by engine hit geometry queries.
 */
export interface EngineGeometryHint {
  /** Stores hint kind so vector can map to guide text/icon policy. */
  kind: 'hover-line' | 'hover-anchor'
  /** Stores human-readable hint text suggested by engine. */
  label: string
  /** Stores world-space anchor point for guide positioning. */
  point: EngineEditorPoint
  /** Stores optional path anchor index when kind is hover-anchor. */
  anchorIndex?: number
  /** Stores optional segment index when kind is hover-line. */
  segmentIndex?: number
}

/**
 * Declares one node geometry payload in the unified response.
 */
export interface EngineGeometryNodePayload {
  /** Stores node id from source document. */
  nodeId: string
  /** Stores node type for product-level strategy routing. */
  nodeType: EngineEditorHitTestNode['type']
  /** Stores transform-resolved world bounds. */
  bounds: EngineGeometryBounds
  /** Stores requested outline geometry. */
  outline: EngineGeometryOutline
  /** Stores optional additional outlines (for text lines and other detailed edges). */
  detailOutlines: EngineGeometryOutline[]
  /** Stores optional hint list near the active pointer. */
  hints: EngineGeometryHint[]
}

/**
 * Declares style-free selection overlay geometry owned by engine queries.
 */
export interface EngineGeometrySelectionOverlay {
  /** Stores selected node ids included by the aggregate geometry. */
  selectedNodeIds: string[]
  /** Stores aggregate world bounds for selected nodes. */
  bounds: EngineGeometryBounds
  /** Stores aggregate outline geometry for product styling adapters. */
  outline: EngineGeometryOutline
}

/**
 * Declares style-free hover overlay geometry owned by engine queries.
 */
export interface EngineGeometryHoverOverlay {
  /** Stores hovered node id. */
  nodeId: string
  /** Stores hovered node world bounds. */
  bounds: EngineGeometryBounds
  /** Stores hovered node outline geometry for product styling adapters. */
  outline: EngineGeometryOutline
}

/**
 * Declares marquee query bounds for coarse candidate filtering.
 */
export interface EngineGeometryMarqueeBounds {
  /** Stores minimum x in world coordinates. */
  minX: number
  /** Stores minimum y in world coordinates. */
  minY: number
  /** Stores maximum x in world coordinates. */
  maxX: number
  /** Stores maximum y in world coordinates. */
  maxY: number
}

/**
 * Declares one vector->engine geometry request contract.
 */
export interface ResolveEngineGeometryPayloadOptions {
  /** Stores flat scene nodes that participate in geometry query evaluation. */
  nodes: readonly EngineEditorHitTestNode[]
  /** Stores current hovered node id, if any. */
  hoveredNodeId?: string | null
  /** Stores selected node ids that need outline geometry in the same pass. */
  selectedNodeIds?: readonly string[]
  /** Stores optional marquee bounds for coarse candidate lookup. */
  marqueeBounds?: EngineGeometryMarqueeBounds | null
  /** Stores marquee resolve policy for final candidate acceptance. */
  marqueeMode?: 'contain' | 'intersect'
  /** Stores optional pointer in world coordinates for hint generation. */
  pointer?: EngineEditorPoint | null
  /** Stores pointer-to-geometry tolerance in world coordinates. */
  tolerance?: number
  /** Stores optional upper bound for exact point-hit candidate checks after coarse filtering. */
  maxExactCandidateCount?: number
  /** Stores clip hit-test tolerance for masked/clip-hosted shapes. */
  clipTolerance?: number
  /** Stores whether frame nodes can be resolved as pointer hit targets. */
  allowFrameSelection?: boolean
  /** Stores whether resolved point hit ids should promote topmost group ancestors. */
  preferGroupSelection?: boolean
  /** Stores strict stroke-only hit mode forwarded to shape hit-test logic. */
  strictStrokeHitTest?: boolean
  /** Stores whether point hit should fall back to top bounds candidate when exact hit is empty. */
  preferPointBoundsFallback?: boolean
  /** Stores whether clip-bound image hosts are skipped as direct hit targets. */
  excludeClipBoundImage?: boolean
  /** Stores whether pointer-based hover should auto-resolve when hoveredNodeId is absent. */
  resolveHoveredFromPointer?: boolean
  /** Stores outline level hint to switch shape/path detail. */
  outlineLevel?: 'low' | 'medium' | 'high'
}

/**
 * Declares one unified engine geometry response consumed by vector policy.
 */
export interface EngineGeometryPayload {
  /** Stores hovered node geometry payload, if a valid hovered node exists. */
  hovered: EngineGeometryNodePayload | null
  /** Stores style-free hover overlay geometry, if a valid hovered node exists. */
  hoverOverlay: EngineGeometryHoverOverlay | null
  /** Stores pointer hit node ids sorted by visual priority (top -> bottom). */
  pointHitNodeIds: string[]
  /** Stores selected node geometry payload list preserving selected id order. */
  selected: EngineGeometryNodePayload[]
  /** Stores style-free aggregate selection overlay geometry, if selected bounds exist. */
  selectionOverlay: EngineGeometrySelectionOverlay | null
  /** Stores coarse marquee candidate ids from engine-side spatial index query. */
  marqueeCandidateNodeIds: string[]
  /** Stores marquee node ids after engine-side contain/intersect resolution. */
  marqueeResolvedNodeIds: string[]
}
