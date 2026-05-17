import type { EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts'
import { createWebGLEngineRenderer } from '../../gpu/webgl/index.ts'
import { createWebGPUEngineRenderer } from '../../gpu/webgpu/index.ts'
import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderQuality,
  EngineRendererContext,
  EngineResourceLoader,
  EngineTextShaper,
} from '../../renderer/types/index.ts'
import type { EngineRect, EngineNodeId } from '../../scene/types/types.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type {
  CreateEngineOptions,
  ResolvedEnginePerformanceOptions,
} from './createEngineContracts.ts'

/**
 * Captures renderer instance and mutable renderer context initialized at startup.
 */
export interface CreateEngineRendererBootstrap {
  /** Resolved renderer backend instance. */
  renderer: ReturnType<typeof createWebGLEngineRenderer> | ReturnType<typeof createWebGPUEngineRenderer>
  /** Shared mutable renderer context passed to per-frame render payloads. */
  renderContext: EngineRendererContext & {
    /** Frame quality lane used by renderer detail policy. */
    quality: EngineRenderQuality
    /** LOD enable flag consumed by strategy and renderer lanes. */
    lodEnabled: boolean
    /** Interaction active hint for preview lanes. */
    interactionActive?: boolean
    /** Device pixel ratio used by side targets. */
    pixelRatio: number
    /** Main output pixel ratio used by final surface. */
    outputPixelRatio: number
    /** Optional runtime resource loader. */
    loader?: EngineResourceLoader
    /** Optional runtime text shaper. */
    textShaper?: EngineTextShaper
    /** Optional dirty regions for partial redraw flows. */
    dirtyRegions?: Array<{zoomLevel?: number; bounds: EngineRect}>
    /** Optional shortlist candidate ids from frame planning. */
    framePlanCandidateIds?: readonly EngineNodeId[]
    /** Optional frame plan version. */
    framePlanVersion?: number
    /** Optional protected node ids for planner guarding. */
    protectedNodeIds?: readonly EngineNodeId[]
    /** Optional active interaction node ids for layered routing. */
    interactionActiveNodeIds?: readonly EngineNodeId[]
    /** Optional runtime overlay nodes. */
    overlayNodes?: readonly EngineOverlayDrawNode[]
    /** Optional frame budget payload for renderer lanes. */
    frameBudget?: EngineFrameBudget
    /** Optional pressure tier that produced current budget. */
    frameBudgetPressure?: EngineFrameBudgetPressure
    /** Optional interaction predictor snapshot. */
    interactionPredictor?: EngineInteractionPredictorState
  }
}

/**
 * Resolves renderer backend and renderer context at engine startup.
 * @param options Engine creation options.
 * @param resolvedPerformance Normalized performance capability options.
 * @param resolvedLodEnabled Resolved LOD enable flag.
 * @param pixelRatio Initial pixel ratio.
 * @param outputPixelRatio Initial output pixel ratio.
 * @returns Renderer bootstrap snapshot.
 */
export function resolveCreateEngineRendererBootstrap(
  options: CreateEngineOptions,
  resolvedPerformance: ResolvedEnginePerformanceOptions,
  resolvedLodEnabled: boolean,
  pixelRatio: number,
  outputPixelRatio: number,
): CreateEngineRendererBootstrap {
  const requestedBackend = options.render?.backend ?? 'webgl'
  const createRendererOptions = {
    canvas: options.canvas,
    createCanvasSurface: options.host?.createCanvasSurface,
    enableCulling: resolvedPerformance.culling,
    clearColor: options.render?.webglClearColor,
    antialias: options.render?.webglAntialias ?? true,
    modelCompleteComposite: options.render?.modelCompleteComposite ?? true,
    lod: resolvedPerformance.lodConfig,
    tileConfig: resolvedPerformance.tileConfig,
    initialRender: options.render?.initialRender,
    interactionPreview: options.render?.interactionPreview,
  }
  const renderer = requestedBackend === 'webgpu'
    ? createWebGPUEngineRenderer(createRendererOptions)
    : createWebGLEngineRenderer(createRendererOptions)

  const renderContext = {
    quality: resolvedLodEnabled
      ? (options.render?.quality ?? 'full')
      : 'full',
    lodEnabled: resolvedLodEnabled,
    pixelRatio,
    outputPixelRatio,
    loader: options.resource?.loader,
    textShaper: options.resource?.textShaper,
  }

  return {
    renderer,
    renderContext,
  }
}
