import type {
  EngineBackendMode,
  EngineCreateOptions,
  EngineRuntimeAdapter,
  EngineSurface,
} from "./public-types";
import type { Canvas2DBackendAdapterHooks as Canvas2DBackendHooks } from "../../backend/adapters/canvas2dBackendAdapter";

/**
 * Boolean-or-object toggle pattern used by staged performance options.
 */
export type EnginePerformanceToggle<TOptions> = boolean | TOptions;

/**
 * Overscan options used by render-planning and visibility padding.
 */
export interface EngineOverscanOptions {
  /** Enables overscan padding around the viewport query. */
  enabled?: boolean;
  /** Extra border in CSS pixels applied to query bounds. */
  borderPx?: number;
}

/**
 * Culling options used by visibility planning.
 */
export interface EngineCullingOptions {
  /** Enables visibility culling in planning. */
  enabled?: boolean;
}

/**
 * Structured performance options payload.
 */
export interface EnginePerformanceOptionsObject {
  /** Overscan behavior for viewport queries. */
  overscan?: EnginePerformanceToggle<EngineOverscanOptions>;
  /** Visibility culling behavior. */
  culling?: EnginePerformanceToggle<EngineCullingOptions>;
}

/**
 * Public performance options contract.
 */
export type EnginePerformanceOptions = boolean | EnginePerformanceOptionsObject;

/**
 * Normalized performance options consumed by canonical planning.
 */
export interface ResolvedEnginePerformanceOptions {
  /** Whether culling is enabled for planning. */
  culling: boolean;
  /** Overscan border in CSS pixels. */
  overscanBorderPx: number;
}

/**
 * Viewport mutation payload.
 */
export interface EngineViewportOptions {
  /** Viewport width in CSS pixels. */
  viewportWidth?: number;
  /** Viewport height in CSS pixels. */
  viewportHeight?: number;
  /** Viewport x offset in world coordinates. */
  offsetX?: number;
  /** Viewport y offset in world coordinates. */
  offsetY?: number;
  /** Viewport scale factor. */
  scale?: number;
}

/**
 * Canonical engine creation contract for staged runtime assembly.
 */
export interface CreateEngineOptions extends EngineCreateOptions {
  /** Optional viewport initialization payload. */
  viewport?: EngineViewportOptions;
  /** Optional performance options for planning defaults. */
  performance?: EnginePerformanceOptions;
  /** Optional explicit backend request. */
  backend?: EngineBackendMode;
  /** Optional explicit runtime adapter override. */
  runtimeAdapter?: EngineRuntimeAdapter;
  /** Optional surface override for host migrations. */
  surface: EngineSurface;
  /**
   * Optional canvas2d backend hooks used by host adapter integrations.
   */
  canvas2d?: Canvas2DBackendHooks;
}

/**
 * Resolves normalized performance options from staged create-engine options.
 * @param options Engine creation options carrying performance toggles.
 */
export function resolveEnginePerformanceOptions(
  options: Pick<CreateEngineOptions, "performance">,
): ResolvedEnginePerformanceOptions {
  const performance = options.performance;
  if (performance === undefined) {
    return {
      culling: true,
      overscanBorderPx: 96,
    };
  }
  if (typeof performance === "boolean") {
    return {
      culling: performance,
      overscanBorderPx: performance ? 96 : 0,
    };
  }

  const cullingToggle = performance.culling;
  const overscanToggle = performance.overscan;

  const culling =
    typeof cullingToggle === "boolean"
      ? cullingToggle
      : (cullingToggle?.enabled ?? true);
  const overscanBorderPx =
    typeof overscanToggle === "boolean"
      ? (overscanToggle ? 96 : 0)
      : (overscanToggle?.enabled ?? true)
        ? Math.max(0, overscanToggle?.borderPx ?? 96)
        : 0;

  return {
    culling,
    overscanBorderPx,
  };
}
