import type {
  EnginePoint,
  EngineRect,
  EngineSceneSnapshot,
  EngineTextNode,
} from '../scene/types.ts'

export type EngineBackend = 'canvas2d' | 'webgl'
export type EngineRenderQuality = 'full' | 'interactive'

export interface EngineInteractionPreviewConfig {
  // Enables temporary affine preview from last rendered frame during interaction.
  enabled?: boolean
  // `interaction`: allow pan/zoom preview; `zoom-only`: only scale gestures.
  mode?: 'interaction' | 'zoom-only'
  // Max allowed preview scale step against cached frame before falling back.
  maxScaleStep?: number
  // Max allowed translation in pixels before falling back.
  maxTranslatePx?: number
}

export interface EngineViewportState {
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  matrix: readonly [number, number, number, number, number, number, number, number, number]
}

export interface EngineRenderStats {
  drawCount: number
  visibleCount: number
  culledCount: number
  engineFrameQuality?: EngineRenderQuality
  groupCollapseCount?: number
  groupCollapseCulledCount?: number
  cacheHits: number
  cacheMisses: number
  frameReuseHits: number
  frameReuseMisses: number
  frameMs: number
  webglRenderPath?: 'model-complete' | 'packet'
  webglInteractiveTextFallbackCount?: number
  webglTextTextureUploadCount?: number
  webglTextTextureUploadBytes?: number
  webglTextCacheHitCount?: number
  webglPrecomputedTextCacheKeyCount?: number
  webglFallbackTextCacheKeyCount?: number
  webglFrameReuseEdgeRedrawCount?: number
  webglImageTextureUploadCount?: number
  webglImageTextureUploadBytes?: number
  webglImageDownsampledUploadCount?: number
  webglImageDownsampledUploadBytesSaved?: number
  webglDeferredImageTextureCount?: number
  webglCompositeUploadBytes?: number
  l0PreviewHitCount?: number
  l0PreviewMissCount?: number
  l1CompositeHitCount?: number
  l1CompositeMissCount?: number
  l2TileHitCount?: number
  l2TileMissCount?: number
  cacheFallbackReason?: string
  // Tile cache diagnostics
  tileCacheSize?: number
  tileDirtyCount?: number
  tileCacheTotalBytes?: number
  // Initial render diagnostics
  initialRenderPhase?: string
  initialRenderProgress?: number
  // Dirty region tracking diagnostics
  dirtyRegionCount?: number
  dirtyTileCount?: number
  incrementalUpdateCount?: number
  canvas2dTrivialPathFastPathCount?: number
  canvas2dContourParseCount?: number
  canvas2dSingleLineTextFastPathCount?: number
  canvas2dPrecomputedTextLineHeightCount?: number
}

export interface EngineRendererCapabilities {
  backend: EngineBackend
  // Indicates whether per-run style layout/render is supported beyond plain text.
  textRuns: boolean
  // Indicates image clip fidelity support (clip rect/path/mask semantics).
  imageClip: boolean
  culling: boolean
  lod: boolean
}

export interface EngineResourceLoader {
  resolveImage(assetId: string): CanvasImageSource | null
}

export interface EngineTextLayout {
  lines: Array<{
    text: string
    width: number
    ascent: number
    descent: number
    baselineY: number
  }>
  bounds: EngineRect
}

export interface EngineTextLayoutContext {
  measureText(text: string, node: EngineTextNode): { width: number; ascent: number; descent: number }
}

export interface EngineTextShaper {
  layout(node: EngineTextNode, context: EngineTextLayoutContext): EngineTextLayout
  hitTest?(node: EngineTextNode, point: EnginePoint, layout: EngineTextLayout): { runIndex: number; offset: number } | null
}

export interface EngineRendererContext {
  // `interactive` allows renderers to trade fidelity for responsiveness during
  // high-frequency gestures (pan/zoom/drag).
  quality: EngineRenderQuality
  // Explicit LOD toggle used by planner/renderer detail-degradation gates.
  // When false, LOD-specific simplifications should be bypassed.
  lodEnabled?: boolean
  // Pixel ratio used by renderers to map CSS-space viewport math to backing
  // store resolution on high-DPI displays.
  pixelRatio?: number
  loader?: EngineResourceLoader
  textShaper?: EngineTextShaper
  // Optional: dirty regions for incremental tile updates.
  // When provided, renderers can use this to optimize which tiles to re-render.
  dirtyRegions?: Array<{
    zoomLevel?: number
    bounds: EngineRect
  }>
  // Optional: viewport-scoped coarse candidates from the engine frame plan.
  // Render planning can use this to avoid traversing obviously offscreen work.
  framePlanCandidateIds?: readonly string[]
  framePlanVersion?: number
  // Optional: node ids that should bypass aggressive collapse/degradation.
  // App/runtime can use this for selected or actively edited objects.
  protectedNodeIds?: readonly string[]
}

export interface EngineRenderFrame {
  scene: EngineSceneSnapshot
  viewport: EngineViewportState
  context: EngineRendererContext
}

export interface EngineRenderer {
  readonly id: string
  readonly capabilities: EngineRendererCapabilities
  init?(): void | Promise<void>
  resize?(width: number, height: number): void
  setInteractionPreview?(config?: EngineInteractionPreviewConfig): void
  render(frame: EngineRenderFrame): EngineRenderStats | Promise<EngineRenderStats>
  dispose?(): void
}
