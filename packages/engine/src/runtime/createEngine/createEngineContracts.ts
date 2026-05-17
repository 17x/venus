import type { EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts'
import type {
  EngineBackend,
  EngineCanvasSurfaceFactory,
  EngineFrameBudget,
  EngineInteractionPreviewConfig,
  EngineRenderQuality,
  EngineRenderSurfaceSize,
  EngineRenderStats,
  EngineResourceLoader,
  EngineTextShaper,
} from '../../renderer/types/index.ts'
import type { EngineSceneStoreDiagnostics, EngineSceneStoreTransaction } from '../../scene/store/store.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineHitPlan } from '../../scene/hitPlan.ts'
import type { EngineVisibleSet, EngineVisibility3DPolicyDecision, EngineVisibilityFrustum3DQuery } from '../../visibility/index.ts'
import type { EngineHitTestResult } from '../../scene/hitTest/hitTest.ts'
import type {
  EngineNodeId,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../../scene/types/types.ts'
import type { EngineRay3 } from '../../math/dimension/types.ts'
import type { EngineScenePatchApplyResult, EngineScenePatchBatch } from '../../scene/patch/patch.ts'
import type { EngineClock } from '../../time/index.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineTileConfig } from '../../renderer/tileManager/index.ts'
import type { EngineInitialRenderConfig } from '../../renderer/initialRender/index.ts'
import type { EngineEasingDefinition } from '../../animation/index.ts'
import type {
  EngineDeviceCapabilityProfile,
  EngineGraphicsSettings,
  EnginePerformanceSettings,
  EngineProfileName,
  EngineQualityPresetName,
  EngineRuntimeSettings,
} from '../../settings/index.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase, EngineInteractionMutationKind } from './strategy/strategy.ts'
import type { EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import type { EnginePerformanceGateStatus } from './performanceGate.ts'

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
  clock?: EngineClock
  host?: EngineHostEnvironment
}

/**
 * Runtime diagnostics snapshot exposed by engine facade.
 */
export interface EngineRuntimeDiagnostics {
  backend: EngineBackend
  renderStats: EngineRenderStats | null
  pixelRatio: number
  outputPixelRatio: number
  scene: EngineSceneStoreDiagnostics
  framePlan: EngineFramePlan | null
  hitPlan: EngineHitPlan | null
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
  visibility3dPolicy: EngineVisibility3DPolicyDecision
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
