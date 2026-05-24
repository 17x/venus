import type { EngineBackend } from "../../backend/backend";
import type { EngineBackendSurface, EngineResolvedBackendMode } from "../backend-contracts";
import type { EngineBackendCacheFallbackReason } from "../fallbackTaxonomy";

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
  /** Cache-hit count for the latest frame emitted by backend-local reuse logic. */
  cacheHits: number;
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
    renderFrame(_timestampMs) {
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
