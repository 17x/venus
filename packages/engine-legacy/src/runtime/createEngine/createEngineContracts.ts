import type { EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts'
import type {
  EngineBackend, EngineCanvasSurfaceFactory, EngineFrameBudget, EngineInteractionPreviewConfig, EngineRenderQuality,
  EngineRenderSurfaceSize, EngineRenderStats, EngineResourceLoader, EngineTextShaper,
} from '../../renderer/types/index.ts'
import type { EngineSceneStoreDiagnostics, EngineSceneStoreTransaction } from '../../scene/store/store.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineHitPlan } from '../../scene/hitPlan.ts'
import type {
  EngineVisibleSet, EngineVisibilityLodPlan, EngineVisibility3DPolicyDecision,
  EngineVisibilityFrustum3DOcclusionResolver, EngineVisibilityFrustum3DQuery, EngineVisibilityFrustum3DResolver,
} from '../../visibility/index.ts'
import type { EngineHitTestResult } from '../../scene/hitTest/hitTest.ts'
import type { EngineRayHitResolutionResult } from '../../scene/hit/contracts.ts'
import type { EngineNodeId, EngineRect, EngineRenderableNode, EngineSceneSnapshot } from '../../scene/types/types.ts'
import type { EngineRay3 } from '../../math/dimension/types.ts'
import type { EngineScenePatchApplyResult, EngineScenePatchBatch } from '../../scene/patch/patch.ts'
import type { EngineClock } from '../../time/index.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineTileConfig } from '../../renderer/tileManager/index.ts'
import type { EngineInitialRenderConfig } from '../../renderer/initialRender/index.ts'
import type { EngineEasingDefinition } from '../../animation/index.ts'
import type {
  EngineDeviceCapabilityProfile, EngineGraphicsSettings, EnginePerformanceSettings, EngineProfileName,
  EngineQualityPresetName, EngineRuntimeSettings,
} from '../../settings/index.ts'
import type { EngineCamera3DSnapshot } from '../../camera/camera3dControllers/camera3dControllers.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase, EngineInteractionMutationKind } from './strategy/strategy.ts'
import type { EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import type { EnginePerformanceGateStatus } from './performanceGate.ts'
import type { EngineRuntimeDiagnosticsWebGPU } from './createEngineWebGPUDiagnostics.ts'
import type { EngineCreateVisibilityOcclusionDiagnostics } from './createEngineVisibilityOcclusionDiagnostics.ts'

/**
 * Boolean-or-object toggles used by performance option sections.
 */
export type EnginePerformanceToggle<TOptions> = boolean | TOptions

/**
 * Culling performance options.
 */
export interface EngineCullingOptions {
  enabled?: boolean
}

/**
 * Overscan performance options.
 */
export interface EngineOverscanOptions {
  enabled?: boolean
  borderPx?: number
}

/**
 * Structured performance options payload.
 */
export interface EnginePerformanceOptionsObject {
  overscan?: EnginePerformanceToggle<EngineOverscanOptions>
  tiles?: EnginePerformanceToggle<EngineTileConfig>
  culling?: EnginePerformanceToggle<EngineCullingOptions>
  lod?: EnginePerformanceToggle<EngineLodConfig>
}

/**
 * Public performance options contract.
 */
export type EnginePerformanceOptions = boolean | EnginePerformanceOptionsObject

/**
 * Normalized performance options consumed by runtime and renderer.
 */
export interface ResolvedEnginePerformanceOptions {
  culling: boolean
  lodConfig: EngineLodConfig | undefined
  tileConfig: EngineTileConfig | undefined
}

/**
 * Renderer configuration options for createEngine.
 */
export interface EngineRenderOptions {
  backend?: EngineBackend
  quality?: EngineRenderQuality
  webglClearColor?: readonly [number, number, number, number]
  dpr?: number | 'auto'
  pixelRatio?: number | 'auto'
  maxPixelRatio?: number
  webglAntialias?: boolean
  lod?: EngineLodConfig
  tileConfig?: EngineTileConfig
  initialRender?: EngineInitialRenderConfig
  interactionPreview?: EngineInteractionPreviewConfig
  /**
   * Compatibility-only 2D model-composite lane toggle.
   * Defaults to false so the primary runtime path stays on packet/frustum-first flow.
   */
  modelCompleteComposite?: boolean
  shortlist?: {
    enabled?: boolean
    minSceneNodes?: number
    ratioThreshold?: number
    hysteresisRatio?: number
    stableFrameCount?: number
  }
  layeredBridgeEnabled?: boolean
}

/**
 * Resource adapter options for createEngine.
 */
export interface EngineResourceOptions {
  loader?: EngineResourceLoader
  textShaper?: EngineTextShaper
}

/**
 * Debug callback options for createEngine.
 */
export interface EngineDebugOptions {
  onStats?: (stats: EngineRenderStats) => void
}

/**
 * Viewport mutation options.
 */
export interface EngineViewportOptions {
  viewportWidth?: number
  viewportHeight?: number
  offsetX?: number
  offsetY?: number
  scale?: number
}

/**
 * Camera animation options.
 */
export interface EngineCameraAnimationOptions {
  durationMs?: number
  easing?: EngineEasingDefinition
  cachePreviewOnly?: boolean
}

/**
 * Resize payload.
 */
export interface EngineResizeOptions extends EngineRenderSurfaceSize {}

/**
 * Host adapter hooks.
 */
export interface EngineHostEnvironment {
  resolvePixelRatio?: () => number
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
}

/**
 * Visibility adapter hooks for 3D frustum and occlusion resolution.
 */
export interface EngineVisibilityOptions {
  /** Optional callback used by true 3D frustum culling implementations. */
  queryFrustum3D?: EngineVisibilityFrustum3DResolver
  /** Optional callback used by true 3D occlusion filtering implementations. */
  queryFrustum3DOcclusion?: EngineVisibilityFrustum3DOcclusionResolver
}

/**
 * Hit adapter hooks for staged 2D-to-3D hit resolver migration.
 */
export interface EngineHitOptions {
  /** Optional callback used by native 3D ray-hit implementations. */
  resolveRay3D?: (query: {ray: EngineRay3; maxDistance?: number}) => EngineRayHitResolutionResult
}

/**
 * Camera 3D runtime options for staged camera-controller wiring.
 */
export interface EngineCamera3DOptions {
  /** Optional initial 3D camera snapshot tracked by runtime diagnostics and facade APIs. */
  snapshot?: EngineCamera3DSnapshot | null
}

/**
 * Runtime camera animation state.
 */
export interface EngineCameraAnimationState {
  active: boolean
  cachePreviewOnly: boolean
  previewHitCount: number
  previewMissCount: number
}

/**
 * Settings override options for createEngine.
 */
export interface EngineSettingsOptions {
  profile?: EngineProfileName
  preset?: EngineQualityPresetName
  graphics?: Partial<EngineGraphicsSettings>
  performance?: Partial<EnginePerformanceSettings>
  runtime?: Partial<EngineRuntimeSettings>
  capability?: Partial<EngineDeviceCapabilityProfile>
}

/**
 * Spatial indexing options used by scene-store bootstrap.
 */
export interface EngineSpatialOptions {
  /** Declares target spatial index dimension mode. */
  dimension?: '2d' | '3d'
}

/**
 * Root createEngine options contract.
 */
export interface CreateEngineOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  initialScene?: EngineSceneSnapshot
  viewport?: EngineViewportOptions
  culling?: boolean
  lod?: EngineLodConfig
  overscan?: EngineOverscanOptions
  performance?: EnginePerformanceOptions
  render?: EngineRenderOptions
  resource?: EngineResourceOptions
  debug?: EngineDebugOptions
  settings?: EngineSettingsOptions
  spatial?: EngineSpatialOptions
  /** Optional 3D camera state used by staged camera-controller runtime wiring. */
  camera3d?: EngineCamera3DOptions
  visibility?: EngineVisibilityOptions
  hit?: EngineHitOptions
  clock?: EngineClock
  host?: EngineHostEnvironment
}

/**
 * Runtime diagnostics snapshot exposed by engine facade.
 */
export interface EngineRuntimeDiagnostics {
  backend: EngineBackend
  renderStats: EngineRenderStats | null
  /** Aggregates WebGPU execution and fallback telemetry derived from latest render stats. */
  webgpu: EngineRuntimeDiagnosticsWebGPU
  pixelRatio: number
  outputPixelRatio: number
  /** Exposes resource cache pressure and streaming backlog diagnostics. */
  resource: {
    /** Total GPU texture bytes retained by renderer caches. */
    gpuTextureBytes: number
    /** Image texture bytes retained by image caches. */
    imageTextureBytes: number
    /** Texture upload bytes submitted by the latest frame. */
    textureUploadBytes: number
    /** Texture upload byte budget available to the latest frame. */
    textureUploadBudgetBytes: number
    /** Normalized upload budget utilization in range [0, 1]. */
    textureUploadBudgetUtilization: number
    /** True when the renderer reported upload budget pressure. */
    textureUploadBudgetExceeded: boolean
    /** Pending asynchronous tile/resource scheduling backlog count. */
    tileSchedulerPendingCount: number
    /** Normalized streaming backlog pressure in range [0, 1]. */
    streamingLoad: number
  }
  /** Exposes scene-level performance profile and pass-cost diagnostics. */
  performanceProfile: {
    /** Total frame time reported by the renderer. */
    frameMs: number
    /** Flattened scene node count from the latest frame plan. */
    sceneNodeCount: number
    /** Visible node count reported by the latest renderer frame. */
    visibleCount: number
    /** Culled node count reported by the latest renderer frame. */
    culledCount: number
    /** Normalized culled / total-scene ratio. */
    cullingRatio: number
    /** Draw submission count reported by the latest renderer frame. */
    drawCount: number
    /** Normalized draw-count pressure per visible node. */
    drawDensity: number
    /** Normalized cache hit rate from latest renderer stats. */
    cacheHitRate: number
    /** Renderer pass timing breakdown in milliseconds. */
    passCosts: {
      /** Geometry/frame plan build time. */
      planBuildMs: number
      /** Texture upload time. */
      textureUploadMs: number
      /** Draw submission time. */
      drawSubmitMs: number
      /** Snapshot capture time. */
      snapshotCaptureMs: number
      /** Model-complete render time. */
      modelRenderMs: number
      /** Sum of known pass timing fields. */
      knownPassTotalMs: number
    }
    /** Normalized budget utilization signals for pass and upload budgets. */
    budgetUtilization: {
      /** Draw submit budget utilization. */
      drawSubmit: number
      /** Texture upload byte budget utilization. */
      textureUploadBytes: number
      /** Overlay pass budget utilization. */
      overlayPass: number
    }
  }
  scene: EngineSceneStoreDiagnostics
  framePlan: EngineFramePlan | null
  hitPlan: EngineHitPlan | null
  /** Exposes 3D hit resolver capability state for diagnostics dashboards. */
  hit3dPolicy: {
    /** Marks whether a native 3D ray resolver callback is currently configured. */
    hasRayResolver: boolean
  }
  shortlist: {
    active: boolean
    candidateRatio: number
    appliedCandidateCount: number
    pendingState: boolean | null
    pendingFrameCount: number
    toggleCount: number
    debounceBlockedToggleCount: number
    minSceneNodes: number
    ratioThreshold: number
    hysteresisRatio: number
    enterRatioThreshold: number
    leaveRatioThreshold: number
    stableFrameCount: number
  }
  viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>
  /** Exposes staged 3D camera runtime state without changing renderer execution. */
  camera3d: {
    /** True when a 3D camera snapshot is currently registered. */
    active: boolean
    /** Controller family that produced the active snapshot. */
    controller: EngineCamera3DSnapshot['controller'] | 'none'
    /** Projection kind for the active snapshot. */
    projectionKind: EngineCamera3DSnapshot['projection']['kind'] | 'none'
    /** Active camera position for diagnostics dashboards. */
    position: EngineCamera3DSnapshot['pose']['position'] | null
    /** Active camera target for diagnostics dashboards. */
    target: EngineCamera3DSnapshot['pose']['target'] | null
  }
  visibility3dPolicy: EngineVisibility3DPolicyDecision
  /** Exposes pressure-aware visibility LOD counts derived from latest frame-plan candidates. */
  visibilityLod: EngineVisibilityLodPlan
  /** Exposes staged hierarchical occlusion diagnostics derived from latest frame-plan candidates. */
  visibilityOcclusion: EngineCreateVisibilityOcclusionDiagnostics
  cameraAnimation: EngineCameraAnimationState
  strategy: {
    phase: EngineRenderStrategyPhase
    interactionActive: boolean
    quality: EngineRenderQuality
    lastInteractionKind: EngineInteractionMutationKind
    lastInteractionElapsedMs: number
  }
  predictor: {
    directionX: number
    directionY: number
    speedPxPerSec: number
    confidence: number
  }
  budget: {
    pressure: EngineFrameBudgetPressure
    drawSubmitBudgetMs: number
    textureUploadBudgetBytes: number
    textureUploadTotalBudgetBytes: number
    imageTextureUploadMaxCount: number
    textTextureUploadMaxCount: number
    tilePreloadBudgetMs: number
    tilePreloadMaxUploads: number
    overlayPassBudgetMs: number
  }
  strategySnapshot: {
    lane: EngineRenderStrategyPhase
    budgetPressure: EngineFrameBudgetPressure
    fallbackReason: EngineRenderFallbackReason | null
    predictorConfidence: number
    previewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required' | 'unknown'
  }
  settleSharpness: {
    pending: boolean
    remainingDeadlineMs: number
    forceSharpFrame: boolean
    metCount: number
    missCount: number
    lastLatencyMs: number
    lastMissLatencyMs: number
    highZoomTextSlaCheckedCount: number
    highZoomTextSlaViolationCount: number
  }
  policy: {
    profile: EngineProfileName
    preset: EngineQualityPresetName
    renderScale: number
    pressureScore: number
    scalerDecisionReason: string
  }
  qos: {
    profile: EngineProfileName
    stablePhase: EngineRenderStrategyPhase
    pressure: EngineFrameBudgetPressure
    budget: EngineFrameBudget
    degradationLevel: string
    fallbackReason: EngineRenderFallbackReason | null
    trace: string
    guardTriggers: string[]
  }
  performanceGate: EnginePerformanceGateStatus
}

/**
 * Engine facade contract.
 */
export interface Engine {
  loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult
  applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult
  transaction(
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ): EngineScenePatchApplyResult | null
  queryViewportCandidates(padding?: number): EngineNodeId[]
  queryVisibleSet(padding?: number): EngineVisibleSet
  queryFrustumVisibleSet(query: EngineVisibilityFrustum3DQuery): EngineVisibleSet
  queryPointCandidates(point: {x: number; y: number}, tolerance?: number): EngineNodeId[]
  prepareFramePlan(padding?: number): EngineFramePlan
  prepareHitPlan(point: {x: number; y: number}, tolerance?: number): EngineHitPlan
  query(bounds: EngineRect): EngineNodeId[]
  hitTest2D(point: {x: number; y: number}, tolerance?: number): EngineHitTestResult | null
  hitTestRay(ray: EngineRay3, maxDistance?: number): EngineHitTestResult | null
  hitTest(point: {x: number; y: number}, tolerance?: number): EngineHitTestResult | null
  getNode(nodeId: EngineNodeId): EngineRenderableNode | null
  getSnapshot(): EngineSceneSnapshot
  setViewport(next: EngineViewportOptions): EngineCanvasViewportState
  panBy(deltaX: number, deltaY: number): EngineCanvasViewportState
  zoomTo(scale: number, anchor?: {x: number; y: number}): EngineCanvasViewportState
  /** Registers or replaces the active 3D camera snapshot tracked by runtime diagnostics. */
  setCamera3DSnapshot(snapshot: EngineCamera3DSnapshot | null): void
  /** Returns the active 3D camera snapshot, if one is registered. */
  getCamera3DSnapshot(): EngineCamera3DSnapshot | null
  /** Clears the active 3D camera snapshot. */
  clearCamera3DSnapshot(): void
  startCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void
  updateCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void
  stopCameraAnimation(options?: {commitTarget?: boolean}): void
  resize(size: EngineResizeOptions): EngineCanvasViewportState
  setProtectedNodeIds(nodeIds?: readonly EngineNodeId[]): void
  setInteractionActiveNodeIds(nodeIds?: readonly EngineNodeId[]): void
  setOverlayNodes(nodes?: readonly EngineOverlayDrawNode[]): void
  setResourceLoader(loader?: EngineResourceLoader): void
  setTextShaper(textShaper?: EngineTextShaper): void
  markDirtyBounds(bounds: EngineRect, zoomLevel?: number): void
  renderFrame(): Promise<EngineRenderStats>
  start(): void
  stop(): void
  isRunning(): boolean
  getDiagnostics(): EngineRuntimeDiagnostics
  dispose(): void
}
