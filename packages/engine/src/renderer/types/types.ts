import type {
  EnginePoint,
  EngineRect,
  EngineSceneSnapshot,
  EngineTextNode,
} from '../../scene/types/types.ts'
import type { EngineDimensionMode } from '../../math/dimension/types.ts'
import type {
  EngineCameraPose,
  EngineCameraProjection,
  EngineCameraProjectionKind,
} from '../../camera/contracts.ts'
import type { EngineCamera3DSnapshot } from '../../camera/camera3dControllers/camera3dControllers.ts'
import type { EngineLayeredRenderOutput } from '../../render/index.ts'
import type {EngineOverlayDrawNode} from '../../interaction/overlayCanvas.ts'
import type { EngineRenderFallbackReason } from '../fallbackTaxonomy/index.ts'

export type EngineBackend = 'canvas2d' | 'webgl' | 'webgpu'
export type EngineRenderQuality = 'full' | 'interactive'
// Base scene lane selection reflects vector-live/tile-cache/progressive-refresh mode.
export type BaseSceneRenderMode = 'vector-live' | 'tile-cache' | 'progressive-refresh'

export interface EngineInteractionPreviewConfig {
  // Enables temporary affine preview from last rendered frame during interaction.
  enabled?: boolean
  // `interaction`: allow pan/zoom preview; `zoom-only`: only scale gestures.
  mode?: 'interaction' | 'zoom-only'
  // Temporarily disables affine snapshot reuse while debugging transform drift.
  disableReuse?: boolean
  // When enabled, interactive frames prefer cache preview only and avoid
  // packet/model fallback rendering while snapshot reuse is possible.
  cacheOnly?: boolean
  // Max allowed preview scale step against cached frame before falling back.
  maxScaleStep?: number
  // Max allowed translation in pixels before falling back.
  maxTranslatePx?: number
}

// Describes per-frame budget slices resolved by engine runtime strategy.
export interface EngineFrameBudget {
  // Budget for draw submission work in the packet/tile composition lane.
  drawSubmitBudgetMs: number
  // Budget for image texture upload bytes in the current frame.
  textureUploadBudgetBytes: number
  // Budget for total texture upload bytes (image + text) in the current frame.
  textureUploadTotalBudgetBytes: number
  // Budget for number of image texture uploads in the current frame.
  imageTextureUploadMaxCount: number
  // Budget for number of text texture uploads in the current frame.
  textTextureUploadMaxCount: number
  // Budget for asynchronous tile preload scheduler work in milliseconds.
  tilePreloadBudgetMs: number
  // Budget for asynchronous tile preload upload count in the current frame.
  tilePreloadMaxUploads: number
  // Budget for overlay pass upload+draw work in milliseconds.
  overlayPassBudgetMs: number
}

// Stores internal interaction predictor output used by render prefetch policy.
export interface EngineInteractionPredictorState {
  // Unit X direction of viewport offset movement in screen-space coordinates.
  directionX: number
  // Unit Y direction of viewport offset movement in screen-space coordinates.
  directionY: number
  // Viewport movement speed in pixels per second.
  speedPxPerSec: number
  // Confidence score in range [0, 1] for predicted direction stability.
  confidence: number
}

export interface EngineViewportState {
  /** Optional dimension mode attached by runtime camera compatibility adapters. */
  dimensionMode?: EngineDimensionMode
  /** Optional camera projection kind for staged 2D/3D runtime migration. */
  projectionKind?: EngineCameraProjectionKind
  /** Optional normalized camera projection contract for future 3D paths. */
  projection?: EngineCameraProjection
  /** Optional full camera pose and derived matrix payload for future 3D paths. */
  pose?: EngineCameraPose
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  matrix: readonly [number, number, number, number, number, number, number, number, number]
}

export interface EngineRenderSurfaceSize {
  viewportWidth: number
  viewportHeight: number
  outputWidth: number
  outputHeight: number
}

export interface EngineRenderStats {
  drawCount: number
  visibleCount: number
  culledCount: number
  engineFrameQuality?: EngineRenderQuality
  baseSceneRenderMode?: BaseSceneRenderMode
  // True when tile cache is used strictly for base scene composition, not overlays.
  tileCacheBaseSceneOnly?: boolean
  groupCollapseCount?: number
  groupCollapseCulledCount?: number
  cacheHits: number
  cacheMisses: number
  // Per-frame geometry-plan cache hit count (frame-plan reuse path).
  geometryCacheHitCount?: number
  // Per-frame geometry-plan cache miss count (plan rebuild path).
  geometryCacheMissCount?: number
  // Rolling geometry-plan cache hit-rate observed by planner.
  geometryCacheHitRate?: number
  frameReuseHits: number
  frameReuseMisses: number
  frameMs: number
  // Number of leaf scene nodes considered by the WebGPU 3D pass planner.
  webgpu3DPassCandidateCount?: number
  // Number of material/lighting/geometry batches produced by the WebGPU 3D pass planner.
  webgpu3DPassBatchCount?: number
  // Number of candidates unsupported by the native WebGPU 3D pass planner.
  webgpu3DPassUnsupportedCount?: number
  // Native WebGPU 3D pass coverage ratio in range [0, 1].
  webgpu3DPassNativeCoverageRatio?: number
  // Number of planned WebGPU 3D pass batches eligible for instanced submission.
  webgpu3DPassInstancedBatchCount?: number
  // Number of planned WebGPU 3D pass batches requiring scene-light bindings.
  webgpu3DPassLitBatchCount?: number
  // Number of planned WebGPU 3D pass batches that render unlit.
  webgpu3DPassUnlitBatchCount?: number
  // Estimated material uniform bytes required by planned WebGPU 3D bindings.
  webgpu3DBindingMaterialUniformBytes?: number
  // Estimated light uniform bytes required by planned WebGPU 3D bindings.
  webgpu3DBindingLightUniformBytes?: number
  // Estimated instance uniform bytes required by planned WebGPU 3D bindings.
  webgpu3DBindingInstanceUniformBytes?: number
  // Estimated total uniform bytes required by planned WebGPU 3D bindings.
  webgpu3DBindingTotalUniformBytes?: number
  // True when initialized WebGPU adapter/device supports timestamp-query.
  webgpuGpuTimingSupported?: boolean
  // Current GPU timing sample state; sampled timings require timestamp query instrumentation.
  webgpuGpuTimingSampleState?: 'unsupported' | 'supported-uninstrumented' | 'sampled' | 'failed'
  // Current timestamp-query lifecycle plan state before GPU timing readback is available.
  webgpuGpuTimingQueryPlanState?: 'unsupported' | 'missing-query-set' | 'ready-unresolved'
  // Number of timestamp writes expected by the current query lifecycle plan.
  webgpuGpuTimingQueryWriteCount?: number
  // Number of timestamp writes emitted during the latest native WebGPU pass.
  webgpuGpuTimingLastWriteCount?: number
  // Number of timestamp query resolve commands emitted during the latest native WebGPU pass.
  webgpuGpuTimingLastResolveCount?: number
  // Number of timestamp buffer copy commands emitted during the latest native WebGPU pass.
  webgpuGpuTimingLastCopyCount?: number
  // Bytes reserved for timestamp readback during the latest native WebGPU pass.
  webgpuGpuTimingReadbackBufferBytes?: number
  // Last sampled GPU frame duration in milliseconds when timestamp instrumentation has produced data.
  webgpuGpuFrameMs?: number
  // True when the current WebGPU frame received a 3D camera snapshot.
  webgpuCamera3DActive?: boolean
  // Controller family for the current WebGPU frame camera snapshot.
  webgpuCamera3DController?: EngineCamera3DSnapshot['controller'] | 'none'
  // Projection kind for the current WebGPU frame camera snapshot.
  webgpuCamera3DProjectionKind?: EngineCamera3DSnapshot['projection']['kind'] | 'none'
  // Byte size of the WebGPU-ready camera uniform payload for the current frame.
  webgpuCamera3DUniformBytes?: number
  // Float count of the WebGPU-ready camera uniform payload for the current frame.
  webgpuCamera3DUniformFloatCount?: number
  webglRenderPath?: 'model-complete' | 'packet'
  webglInteractiveTextFallbackCount?: number
  webglTextTextureUploadCount?: number
  webglTextTextureUploadBytes?: number
  webglTextCacheHitCount?: number
  webglPrecomputedTextCacheKeyCount?: number
  webglFallbackTextCacheKeyCount?: number
  webglFrameReuseEdgeRedrawCount?: number
  webglPreviewReuseMs?: number
  webglPlanBuildMs?: number
  webglTextureUploadMs?: number
  webglDrawSubmitMs?: number
  webglSnapshotCaptureMs?: number
  webglModelRenderMs?: number
  webglBudgetPressure?: 'low' | 'medium' | 'high'
  webglDrawSubmitBudgetMs?: number
  webglTextureUploadBudgetBytes?: number
  webglTextureUploadTotalBudgetBytes?: number
  webglImageTextureUploadBudgetCount?: number
  webglTextTextureUploadBudgetCount?: number
  webglTilePreloadBudgetMs?: number
  webglTilePreloadBudgetUploads?: number
  webglOverlayPassBudgetMs?: number
  webglDrawSubmitBudgetExceeded?: boolean
  webglTextureUploadBudgetExceeded?: boolean
  webglOverlayBudgetExceeded?: boolean
  // Predictor unit X direction sampled for the current frame.
  webglPredictorDirectionX?: number
  // Predictor unit Y direction sampled for the current frame.
  webglPredictorDirectionY?: number
  // Predictor speed estimate in pixels per second.
  webglPredictorSpeedPxPerSec?: number
  // Predictor confidence score for direction stability.
  webglPredictorConfidence?: number
  // Predictor-driven preload ring applied in tile prefetch.
  webglPredictorPreloadRing?: number
  // Predictor-driven overscan in CSS px applied to queue cancellation.
  webglPredictorOverscanCssPx?: number
  // Number of predictor-driven preload requests enqueued this frame.
  webglPredictivePreloadEnqueueCount?: number
  // Number of predictor-driven preload requests processed this frame.
  webglPredictivePreloadProcessedCount?: number
  // Number of predictor-driven preload requests pruned as stale this frame.
  webglPredictivePreloadPrunedCount?: number
  webglHighZoomTextSlaChecked?: boolean
  webglHighZoomTextSlaScale?: number
  webglHighZoomTextSlaViolationCount?: number
  webglImageTextureUploadCount?: number
  webglImageTextureUploadBytes?: number
  webglImageDownsampledUploadCount?: number
  webglImageDownsampledUploadBytesSaved?: number
  webglDeferredImageTextureCount?: number
  webglDeferredTextTextureCount?: number
  webglCompositeUploadBytes?: number
  l0PreviewHitCount?: number
  l0PreviewMissCount?: number
  l1CompositeHitCount?: number
  l1CompositeMissCount?: number
  l2TileHitCount?: number
  l2TileMissCount?: number
  cacheFallbackReason?: EngineRenderFallbackReason
  // Preview execution mode for the interaction snapshot lane.
  webglPreviewExecutionMode?: 'affine-snapshot' | 'temporal-reprojection-required'
  // Strategy lane captured at stats emission for diagnostics joins.
  strategySnapshotLane?: 'static' | 'pan' | 'zoom' | 'camera' | 'settling'
  // Budget pressure captured at stats emission for diagnostics joins.
  strategySnapshotBudgetPressure?: 'low' | 'medium' | 'high'
  // Effective fallback reason captured in strategy snapshot telemetry.
  strategySnapshotFallbackReason?: EngineRenderFallbackReason | null
  // Predictor confidence captured in strategy snapshot telemetry.
  strategySnapshotPredictorConfidence?: number
  cameraAnimationActive?: boolean
  cameraAnimationCachePreviewOnly?: boolean
  cameraAnimationPreviewHitCount?: number
  cameraAnimationPreviewMissCount?: number
  // Tile cache diagnostics
  tileCacheSize?: number
  tileDirtyCount?: number
  tileCacheTotalBytes?: number
  tileUploadCount?: number
  tileRenderCount?: number
  visibleTileCount?: number
  // Scheduler backlog helps diagnose visible/preload queue pressure.
  tileSchedulerPendingCount?: number
  // Pan-time tile requests enqueued asynchronously (schedule-only, no in-frame rebuild).
  panScheduleRequestCount?: number
  // Synchronous tile rebuild operations executed in the current frame.
  tileSynchronousRebuildCount?: number
  gpuTextureBytes?: number
  imageTextureBytes?: number
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
  // Number of native WebGPU submit attempts in the current frame.
  webgpuNativeSubmissionAttemptedCount?: number
  // Number of native WebGPU submit successes in the current frame.
  webgpuNativeSubmissionSuccessCount?: number
  // Number of native WebGPU submit failures in the current frame.
  webgpuNativeSubmissionFailureCount?: number
  // Cumulative native WebGPU submit successes since renderer init.
  webgpuNativeSubmissionTotalCount?: number
  // Cumulative native WebGPU submit failures since renderer init.
  webgpuNativeSubmissionTotalFailureCount?: number
  // Current WebGPU execution route for this frame.
  webgpuRenderPath?: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch'
  // Number of nodes eligible for native WebGPU rect-batch execution in this frame.
  webgpuNativeRectBatchEligibleCount?: number
  // Reason why native WebGPU rect-batch could not be used for this frame.
  webgpuNativeRectBatchRejectedReason?:
    | 'none'
    | 'scene-empty'
    | 'group-node-unsupported'
    | 'non-shape-node-unsupported'
    | 'non-rect-shape-unsupported'
    | 'shape-style-unsupported'
    | 'shape-transform-unsupported'
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

export interface EngineCanvasSurfaceFactory {
  createSurface(width: number, height: number): HTMLCanvasElement | OffscreenCanvas | null
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
  // Optional: true when frame is in active interaction lane (pan/zoom/drag).
  // Renderers can use this to throttle heavy paths even if quality stays `full`.
  interactionActive?: boolean
  // Pixel ratio used by renderers to map CSS-space viewport math to backing
  // store resolution for side render targets on high-DPI displays.
  pixelRatio?: number
  // Main-canvas output pixel ratio stays app-owned and stable across
  // interaction phases so renderers can decouple final output from side LOD.
  outputPixelRatio?: number
  // Optional staged 3D camera snapshot for native renderer camera-uniform preparation.
  camera3DSnapshot?: EngineCamera3DSnapshot | null
  loader?: EngineResourceLoader
  textShaper?: EngineTextShaper
  // Optional: dirty regions for incremental tile updates.
  // When provided, renderers can use this to optimize which tiles to re-render.
  dirtyRegions?: Array<{
    zoomLevel?: number
    // Optional previous bounds for move/transform updates.
    previousBounds?: EngineRect
    bounds: EngineRect
  }>
  // Optional: viewport-scoped coarse candidates from the engine frame plan.
  // Render planning can use this to avoid traversing obviously offscreen work.
  framePlanCandidateIds?: readonly string[]
  framePlanVersion?: number
  // Optional: node ids that should bypass aggressive collapse/degradation.
  // App/runtime can use this for selected or actively edited objects.
  protectedNodeIds?: readonly string[]
  // Optional: node ids that must render through active layer during editing.
  // Runtime can keep this scoped to transform/property-edit windows.
  interactionActiveNodeIds?: readonly string[]
  // Optional: runtime-provided overlay nodes rendered by the engine overlay pass.
  overlayNodes?: readonly EngineOverlayDrawNode[]
  // Optional: engine-internal frame budget slices for renderer lanes.
  frameBudget?: EngineFrameBudget
  // Optional: engine-internal pressure level that produced the budget decision.
  frameBudgetPressure?: 'low' | 'medium' | 'high'
  // Optional: internal predictor state used by renderer-side prefetch tuning.
  interactionPredictor?: EngineInteractionPredictorState
  // Optional: compatibility bridge output from layered pipeline during migration.
  layeredRender?: EngineLayeredRenderOutput
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
  resize?(size: EngineRenderSurfaceSize): void
  setInteractionPreview?(config?: EngineInteractionPreviewConfig): void
  render(frame: EngineRenderFrame): EngineRenderStats | Promise<EngineRenderStats>
  dispose?(): void
}
