import type { EngineBackend } from "../../backend/backend";
import type { EngineBackendSurface, EngineResolvedBackendMode } from "../backend-contracts";
import type { EngineBackendCacheFallbackReason } from "../fallbackTaxonomy";
import type { EngineMaterialEntity } from "../../orchestration/api/public-types/material.types";

/**
 * Declares one backend diagnostics payload emitted by native adapters per frame.
 */
export interface EngineBackendFrameDiagnostics {
  /** WebGL render path classification for the latest submitted frame. */
  webglRenderPath: "model-complete" | "packet" | "none";
  /** WebGPU render path classification for the latest submitted frame. */
  webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
  /** Native WebGPU submissions attempted in the latest frame. */
  webgpuNativeSubmissionAttemptedCount: number;
  /** Native WebGPU submissions that completed in the latest frame. */
  webgpuNativeSubmissionSuccessCount: number;
  /** Native WebGPU submissions that failed in the latest frame. */
  webgpuNativeSubmissionFailureCount: number;
  /** Cumulative native WebGPU submissions completed since engine boot. */
  webgpuNativeSubmissionTotalCount: number;
  /** Cumulative native WebGPU submissions failed since engine boot. */
  webgpuNativeSubmissionTotalFailureCount: number;
  /** Native rect-batch eligible primitive count observed in the latest frame. */
  webgpuNativeRectBatchEligibleCount: number;
  /** Native rect-batch rejection reason for the latest frame. */
  webgpuNativeRectBatchRejectedReason:
    | "none"
    | "scene-empty"
    | "group-node-unsupported"
    | "non-shape-node-unsupported"
    | "non-rect-shape-unsupported"
    | "shape-style-unsupported"
    | "shape-transform-unsupported";
  /** Native WebGL mesh primitives observed in the latest frame payload. */
  webglNativeMeshAttemptedCount: number;
  /** Native WebGL mesh primitives submitted to draw calls in the latest frame. */
  webglNativeMeshSubmittedCount: number;
  /** Native WebGL mesh pipeline compile count for the latest frame. */
  webglNativeMeshPipelineCompileCount: number;
  /** Native WebGL mesh pipeline reuse count for the latest frame. */
  webglNativeMeshPipelineReuseCount: number;
  /** Native WebGL mesh primitives rejected in the latest frame. */
  webglNativeMeshRejectedCount: number;
  /** Native WebGL mesh rejections caused by invalid position streams. */
  webglNativeMeshRejectedInvalidPositionCount: number;
  /** Native WebGL mesh rejections caused by invalid index streams. */
  webglNativeMeshRejectedInvalidIndexCount: number;
  /** Native WebGL mesh rejections caused by insufficient non-indexed streams. */
  webglNativeMeshRejectedInsufficientStreamCount: number;
  /** Native WebGL mesh rejections caused by unsupported topology tokens. */
  webglNativeMeshRejectedUnsupportedTopologyCount: number;
  /** Topology tokens supported by native WebGL mesh submission path. */
  webglNativeMeshSupportedTopologies: ReadonlyArray<"triangles" | "lines" | "points">;
  /** Topology tokens rejected by native WebGL mesh submission path. */
  webglNativeMeshRejectedTopologies: ReadonlyArray<"triangles" | "lines" | "points">;
  /** Number of line-topology meshes observed by planning hook while submission is disabled. */
  webglNativeMeshLineTopologyPlannedCount: number;
  /** Number of line-topology meshes entering preflight validation. */
  webglNativeMeshLineTopologyPreflightAttemptedCount: number;
  /** Number of line-topology meshes passing preflight validation. */
  webglNativeMeshLineTopologyPreflightPassedCount: number;
  /** Number of line-topology meshes failing preflight validation. */
  webglNativeMeshLineTopologyPreflightRejectedCount: number;
  /** Number of line-topology preflight rejections caused by invalid position streams. */
  webglNativeMeshLineTopologyPreflightRejectedInvalidPositionCount: number;
  /** Number of line-topology preflight rejections caused by invalid index streams. */
  webglNativeMeshLineTopologyPreflightRejectedInvalidIndexCount: number;
  /** Number of line-topology preflight rejections caused by insufficient non-indexed streams. */
  webglNativeMeshLineTopologyPreflightRejectedInsufficientStreamCount: number;
  /** Number of line-topology meshes entering diagnostics-only draw-plan synthesis. */
  webglNativeMeshLineTopologyDrawPlanAttemptedCount: number;
  /** Number of synthetic line draw commands produced for diagnostics-only planning. */
  webglNativeMeshLineTopologyDrawPlanCommandCount: number;
  /** Number of line-topology meshes deferred because line submission is still disabled. */
  webglNativeMeshLineTopologySubmissionDeferredCount: number;
  /** Number of line-topology meshes reaching draw submission stage. */
  webglNativeMeshLineTopologySubmissionAttemptedCount: number;
  /** Number of line draw commands reaching submission stage as GL.LINES segments. */
  webglNativeMeshLineTopologySubmissionAttemptedCommandCount: number;
  /** Number of line-topology meshes successfully submitted as GL.LINES draws. */
  webglNativeMeshLineTopologySubmissionSucceededCount: number;
  /** Number of line draw commands successfully submitted as GL.LINES segments. */
  webglNativeMeshLineTopologySubmissionSucceededCommandCount: number;
  /** Ratio of successful line commands over attempted line commands in current frame diagnostics. */
  webglNativeMeshLineTopologySubmissionCommandSuccessRate: number;
  /** Ratio of attempted line commands over draw-plan command count in current frame diagnostics. */
  webglNativeMeshLineTopologySubmissionPlanCoverageRate: number;
  /** Number of planned line commands that did not end as successful submissions. */
  webglNativeMeshLineTopologySubmissionDrawPlanWastedCommandCount: number;
  /** Number of line-topology meshes failing GL.LINES submission after preflight. */
  webglNativeMeshLineTopologySubmissionFailedCount: number;
  /** Number of line draw commands that failed submission as GL.LINES segments. */
  webglNativeMeshLineTopologySubmissionFailedCommandCount: number;
  /** Number of line-topology meshes blocked because submission gate is disabled. */
  webglNativeMeshLineTopologySubmissionGateBlockedCount: number;
  /** Gate state token indicating whether line submission was enabled for current frame diagnostics. */
  webglNativeMeshLineTopologySubmissionGateState: "enabled" | "disabled";
  /** Compact line-topology submission outcome token for current frame diagnostics. */
  webglNativeMeshLineTopologySubmissionOutcome: "none" | "deferred-gate-disabled" | "submitted" | "failed";
  /** Number of line-topology submission failures caused by missing GL.LINES primitive token. */
  webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCount: number;
  /** Number of failed line commands caused by missing GL.LINES primitive token. */
  webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: number;
  /** Number of line-topology submission failures caused by insufficient stream data. */
  webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCount: number;
  /** Number of failed line commands caused by insufficient stream data. */
  webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCommandCount: number;
  /** Latest line-topology submission failure reason recorded in current frame. */
  webglNativeMeshLineTopologySubmissionFailureReason: "none" | "missing-lines-primitive" | "insufficient-stream";
  /** Compact line submission failure summary tuple for telemetry exporters. */
  webglNativeMeshLineTopologySubmissionFailureSummary: {
    /** Total line submission failures observed in current frame. */
    failedCount: number;
    /** Latest line submission failure reason observed in current frame. */
    latestReason: "none" | "missing-lines-primitive" | "insufficient-stream";
    /** Histogram bucket count for missing GL.LINES primitive failures. */
    missingLinesPrimitiveCount: number;
    /** Histogram bucket count for insufficient stream failures. */
    insufficientStreamCount: number;
  };
  /** Compact line-topology submission efficiency summary tuple for telemetry exporters. */
  webglNativeMeshLineTopologySubmissionEfficiencySummary: {
    /** Ratio of successful line commands over attempted line commands in current frame (0–1). */
    commandSuccessRate: number;
    /** Ratio of attempted line commands over draw-plan command count in current frame (0–1). */
    planCoverageRate: number;
    /** Number of planned line commands that did not end as successful submissions. */
    drawPlanWastedCommandCount: number;
  };
  /** Native WebGL mesh rejections caused by capability-gate failures. */
  webglNativeMeshCapabilityGateCount: number;
  /** Active light count in the current frame scene for parity telemetry. */
  activeLightCount: number;
  /** Total mesh draw calls submitted across all backends in the current frame. */
  meshDrawCallCount: number;
  /** Mesh/material pairs carrying texture references in native mesh payload. */
  webglNativeMaterialTextureCandidateCount: number;
  /** Texture candidates that also carry usable UV streams. */
  webglNativeMaterialTextureUvReadyCount: number;
  /** Material textures bound by native mesh path in the current frame. */
  webglNativeMaterialTextureBindingCount: number;
  /** Estimated bytes uploaded for native material textures in the current frame. */
  webglNativeMaterialTextureUploadBytes: number;
  /** Native material texture cache hits in the current frame. */
  webglNativeMaterialTextureCacheHitCount: number;
  /** Native material texture cache misses in the current frame. */
  webglNativeMaterialTextureCacheMissCount: number;
  /** Native material texture decode failures in the current frame. */
  webglNativeMaterialTextureDecodeFailureCount: number;
  /** Latest native material texture decode failure reason. */
  webglNativeMaterialTextureDecodeFailureReason: "none" | "image-load-failed";
  /** Latest material texture binding fallback reason. */
  webglNativeMaterialTextureFallbackReason:
    | "none"
    | "missing-material"
    | "missing-uv"
    | "texture-upload-not-implemented"
    | "decode-failed";
  /** Rich-feature capability gate reason emitted by WebGL adapter for the latest frame. */
  webglFeatureCapabilityGateReason?:
    | "none"
    | "image-node-unsupported"
    | "clip-node-unsupported"
    | "text-style-unsupported"
    | "shadow-style-unsupported"
    | "gradient-style-unsupported";
  /** Rich-feature capability gate reason emitted by WebGPU adapter for the latest frame. */
  webgpuFeatureCapabilityGateReason?:
    | "none"
    | "image-node-unsupported"
    | "clip-node-unsupported"
    | "text-style-unsupported"
    | "shadow-style-unsupported"
    | "gradient-style-unsupported";
  /** Cache-hit count for the latest frame emitted by backend-local reuse logic. */
  cacheHits: number;
  /** Shadow map count rendered in the current frame for parity telemetry. */
  shadowMapCount: number;
  /** Shadow draw calls submitted in the current frame for parity telemetry. */
  shadowDrawCallCount: number;
  /** Shadow texture memory in bytes for parity telemetry. */
  shadowTextureBytes: number;
  /** Instanced draw calls attempted in the current frame. */
  instancedDrawAttemptedCount: number;
  /** Instanced draw calls successfully submitted in the current frame. */
  instancedDrawSucceededCount: number;
  /** Instanced draw calls rejected in the current frame. */
  instancedDrawRejectedCount: number;
  /** Cache-miss count for the latest frame emitted by backend-local reuse logic. */
  cacheMisses: number;
  /** Frame-reuse hit count for the latest frame emitted by backend-local reuse logic. */
  frameReuseHits: number;
  /** Frame-reuse miss count for the latest frame emitted by backend-local reuse logic. */
  frameReuseMisses: number;
  /** L0 preview hit count for the latest frame. */
  l0PreviewHitCount: number;
  /** L0 preview miss count for the latest frame. */
  l0PreviewMissCount: number;
  /** L1 composite hit count for the latest frame. */
  l1CompositeHitCount: number;
  /** L1 composite miss count for the latest frame. */
  l1CompositeMissCount: number;
  /** L2 tile-cache hit count for the latest frame. */
  l2TileHitCount: number;
  /** L2 tile-cache miss count for the latest frame. */
  l2TileMissCount: number;
  /** Cache fallback reason token for the latest frame. */
  cacheFallbackReason: EngineBackendCacheFallbackReason;
  /** Tile-cache entry count tracked for the latest frame. */
  tileCacheSize: number;
  /** Dirty tile count tracked for the latest frame. */
  tileDirtyCount: number;
  /** Total bytes estimated for tile cache footprint. */
  tileCacheTotalBytes: number;
  /** Tile upload count tracked for the latest frame. */
  tileUploadCount: number;
  /** Tile render count tracked for the latest frame. */
  tileRenderCount: number;
  /** Visible tile count tracked for the latest frame. */
  visibleTileCount: number;
  /** Pending tile scheduler task count at frame completion. */
  tileSchedulerPendingCount: number;
  /** Estimated total GPU texture bytes tracked by backend. */
  gpuTextureBytes: number;
  /** Estimated image texture bytes tracked by backend. */
  imageTextureBytes: number;
  /** Preview reuse timing in milliseconds for the latest frame. */
  webglPreviewReuseMs: number;
  /** Plan build timing in milliseconds for the latest frame. */
  webglPlanBuildMs: number;
  /** Texture upload timing in milliseconds for the latest frame. */
  webglTextureUploadMs: number;
  /** Draw submit timing in milliseconds for the latest frame. */
  webglDrawSubmitMs: number;
  /** Snapshot capture timing in milliseconds for the latest frame. */
  webglSnapshotCaptureMs: number;
  /** Model render fallback timing in milliseconds for the latest frame. */
  webglModelRenderMs: number;
  /** Preview execution mode from old-engine reuse path semantics. */
  webglPreviewExecutionMode: "affine-snapshot" | "temporal-reprojection-required";
  /** Source marker for preview execution mode diagnostics. */
  webglPreviewExecutionSource: "backend-native" | "engine-cache-fallback-taxonomy";
  /** Budget pressure bucket for the latest frame. */
  webglBudgetPressure: "low" | "medium" | "high";
  /** Human-readable pressure reason derived from budget-threshold signals. */
  webglBudgetPressureReason: string;
  /** Source marker for budget pressure diagnostics. */
  webglBudgetPressureSource: "backend-native" | "engine-frame-budget";
  /** Draw submit budget in milliseconds. */
  webglDrawSubmitBudgetMs: number;
  /** Texture upload budget in bytes per frame. */
  webglTextureUploadBudgetBytes: number;
  /** Texture upload total budget in bytes. */
  webglTextureUploadTotalBudgetBytes: number;
  /** Image texture upload count budget per frame. */
  webglImageTextureUploadBudgetCount: number;
  /** Text texture upload count budget per frame. */
  webglTextTextureUploadBudgetCount: number;
  /** Tile preload budget in milliseconds per frame. */
  webglTilePreloadBudgetMs: number;
  /** Tile preload upload budget per frame. */
  webglTilePreloadBudgetUploads: number;
  /** Overlay pass budget in milliseconds per frame. */
  webglOverlayPassBudgetMs: number;
  /** Whether draw submit budget was exceeded. */
  webglDrawSubmitBudgetExceeded: boolean;
  /** Whether texture upload budget was exceeded. */
  webglTextureUploadBudgetExceeded: boolean;
  /** Whether overlay budget was exceeded. */
  webglOverlayBudgetExceeded: boolean;
  /** Predictor direction X component for current frame. */
  webglPredictorDirectionX: number;
  /** Predictor direction Y component for current frame. */
  webglPredictorDirectionY: number;
  /** Predictor speed in pixels per second. */
  webglPredictorSpeedPxPerSec: number;
  /** Predictor confidence in range [0, 1]. */
  webglPredictorConfidence: number;
  /** Predictor preload ring size for current frame. */
  webglPredictorPreloadRing: number;
  /** Predictor overscan in CSS pixels. */
  webglPredictorOverscanCssPx: number;
  /** Predictive preload enqueue count for current frame. */
  webglPredictivePreloadEnqueueCount: number;
  /** Predictive preload processed count for current frame. */
  webglPredictivePreloadProcessedCount: number;
  /** Predictive preload pruned count for current frame. */
  webglPredictivePreloadPrunedCount: number;
  /** Whether high-zoom text SLA check executed for current frame. */
  webglHighZoomTextSlaChecked: boolean;
  /** High-zoom text SLA scale threshold. */
  webglHighZoomTextSlaScale: number;
  /** High-zoom text SLA violation count for current frame. */
  webglHighZoomTextSlaViolationCount: number;
  /** Deferred text texture count for current frame. */
  webglDeferredTextTextureCount: number;
  /** Number of pan predictive schedule requests issued this frame. */
  panScheduleRequestCount: number;
  /** Number of synchronous tile rebuild operations issued this frame. */
  tileSynchronousRebuildCount: number;
}

/**
 * Declares telemetry hooks for no-op adapter present lifecycle.
 */
export interface NoopBackendAdapterHooks {
  /** Emits when no-op present path is entered for one frame. */
  onPresentAttempt?: (timestampMs: number) => void;
  /** Emits when no-op present path completes for one frame. */
  onPresentCommitted?: (timestampMs: number) => void;
  /** Emits backend diagnostics snapshot produced by WebGL/WebGPU adapters per frame. */
  onBackendDiagnostics?: (diagnostics: EngineBackendFrameDiagnostics) => void;
  /**
   * Resolves one optional native frame payload used by WebGL/WebGPU adapters.
   */
  resolveNativeFramePayload?: (timestampMs: number) => {
    /** Viewport translation X in world-to-screen transform space. */
    translateX: number;
    /** Viewport translation Y in world-to-screen transform space. */
    translateY: number;
    /** Viewport scale in world-to-screen transform space. */
    scale: number;
    /** Ordered rectangular primitives emitted for the current frame. */
    rects: ReadonlyArray<{
      /** Rectangle origin X in world coordinates. */
      x: number;
      /** Rectangle origin Y in world coordinates. */
      y: number;
      /** Rectangle width in world coordinates. */
      width: number;
      /** Rectangle height in world coordinates. */
      height: number;
      /** Rectangle fill color token in CSS color notation. */
      fill: string;
    }>;
    /**
     * Ordered rich scene nodes emitted for model-complete rendering.
     * WebGL/WebGPU adapters may use this payload to avoid packet-only rectangle fallbacks.
     */
    nodes?: ReadonlyArray<{
      /** Stable node identifier. */
      id: string;
      /** Node kind discriminator emitted by scene adapter. */
      type: string;
      /** Optional shape kind token for shape nodes. */
      shape?: string;
      /** Optional node x coordinate. */
      x?: number;
      /** Optional node y coordinate. */
      y?: number;
      /** Optional node width. */
      width?: number;
      /** Optional node height. */
      height?: number;
      /** Optional node fill color token in CSS notation. */
      fill?: string;
      /** Optional node stroke color token in CSS notation. */
      stroke?: string;
      /** Optional node stroke width. */
      strokeWidth?: number;
      /** Optional text payload for text nodes. */
      text?: string;
      /** Optional structured text-run payload used by rich text semantics. */
      textRuns?: unknown;
      /** Optional clip path identifier used by clip-hosted render payloads. */
      clipPathId?: string;
      /** Optional clip host identifier used by clip-hosted render payloads. */
      clipId?: string;
      /** Optional shadow payload used by style-rich render features. */
      shadow?: unknown;
      /** Optional affine transform matrix payload. */
      transform?: {
        /** Optional 2D matrix tuple [a,b,c,d,e,f]. */
        matrix?: readonly [number, number, number, number, number, number] | readonly number[];
      };
      /** Optional point list for line/polygon/path shapes. */
      points?: ReadonlyArray<{ x: number; y: number }>;
      /** Optional bezier point payload for path shapes. */
      bezierPoints?: ReadonlyArray<{
        anchor: { x: number; y: number };
        cp1?: { x: number; y: number };
        cp2?: { x: number; y: number };
      }>;
    }>;
    /**
     * Ordered mesh primitives emitted for native mesh submission paths.
     * Positions are packed xyz tuples in world coordinates.
     */
    meshes?: ReadonlyArray<{
      /** Stable mesh identifier for diagnostics correlation. */
      id: string;
      /** Optional mesh topology token. Defaults to triangles when omitted. */
      topology?: "triangles" | "lines" | "points";
      /** Packed xyz vertex positions in world coordinates. */
      positions: readonly number[];
      /** Optional packed triangle indices into positions array. */
      indices?: readonly number[];
      /** Optional packed uv coordinates as [u,v, ...]. */
      uvs?: readonly number[];
      /** Optional mesh fill color token in CSS notation. */
      color?: string;
      /** Optional material id used for texture/material binding. */
      materialId?: string;
    }>;
    /** Optional graph material registry referenced by mesh primitives. */
    materials?: readonly EngineMaterialEntity[];
    /** Optional ordered runtime lights consumed by native mesh shading path. */
    lights?: ReadonlyArray<{
      id: string;
      type: string;
      intensity?: number;
    }>;
    /** Optional shared 3D camera packet consumed by native mesh projection paths. */
    camera3d?: {
      yaw: number;
      pitch: number;
      distance: number;
      targetX: number;
      targetY: number;
      targetZ: number;
      perspectiveFovY: number;
      near: number;
      far: number;
      projectionMode: "perspective" | "orthographic";
    };
    /** Enables native line-topology draw submission when true. */
    lineTopologySubmissionEnabled?: boolean;
    /**
     * Optional image registry for model-complete image node rendering.
     * Keys are asset ids emitted by scene adapters; values are loaded image elements.
     */
    images?: ReadonlyMap<string, HTMLImageElement>;
    /**
     * Optional overlay draw instructions for marquee/hover/selection/handler
     * rendering. Each instruction carries primitive type, geometry, and style.
     */
    overlays?: ReadonlyArray<{
      id: string;
      primitive: string;
      points?: ReadonlyArray<{ x: number; y: number }>;
      bounds?: { minX: number; minY: number; maxX: number; maxY: number };
      strokeColor?: string;
      strokeWidth?: number;
      strokeDash?: number[];
      fillColor?: string;
      fillOpacity?: number;
      zIndex?: number;
    }>;
    /**
     * When true, one or more nodes carry style-rich features (stroke, shadow,
     * gradient, non-rect shape, clip, points/bezier) that require model-complete
     * composition. Backends SHOULD prefer model-complete over mesh submission
     * when this flag is true.
     */
    needsComposition?: boolean;
  } | null;
}

/**
 * Creates one deterministic no-op backend owned by adapter layer.
 * @param mode Backend mode reported by the no-op backend.
 * @param hooks Optional telemetry hooks emitted around no-op present path.
 */
export function createNoopBackendAdapter(
  mode: EngineResolvedBackendMode,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface: EngineBackendSurface | null = null;

  return {
    mode,
    resize(surface) {
      // Keep the latest surface snapshot so tests can verify resize calls.
      currentSurface = surface;
    },
    async renderFrame(_timestampMs) {
      hooks?.onPresentAttempt?.(_timestampMs);
      // Intentionally no-op while adapter contracts stabilize.
      void currentSurface;
      hooks?.onPresentCommitted?.(_timestampMs);
    },
    dispose() {
      // Release stored references to make disposal behavior explicit for tests.
      currentSurface = null;
    },
  };
}
