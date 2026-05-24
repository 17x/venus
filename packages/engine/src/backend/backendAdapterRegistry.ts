import type {
  EngineBackendSurface,
  EngineResolvedBackendMode,
} from "./backend-contracts";
import {
  createCanvas2DBackendAdapter,
  type Canvas2DBackendAdapterHooks,
} from "../backend/adapters/canvas2dBackendAdapter";
import {
  createNoopBackendAdapter,
  type NoopBackendAdapterHooks,
} from "../backend/adapters/noopBackendAdapter";
import { createWebGLBackendAdapter } from "../backend/adapters/webglBackendAdapter";
import { createWebGPUBackendAdapter } from "../backend/adapters/webgpuBackendAdapter";
import type { EngineBackend } from "./backend";

/**
 * Declares one runtime creation context passed into backend adapters.
 */
export interface EngineBackendAdapterContext {
  /** Render surface snapshot used by backend construction. */
  surface: EngineBackendSurface;
  /** Optional Canvas2D draw hook contract used by canvas adapters. */
  canvas2d?: Canvas2DBackendAdapterHooks;
  /** Optional no-op present hook contract used by webgl/webgpu/headless stubs. */
  noop?: NoopBackendAdapterHooks;
}

/**
 * Declares one backend adapter used to materialize runtime backend instances.
 */
export interface EngineBackendAdapter {
  /** Backend mode this adapter can construct. */
  mode: EngineResolvedBackendMode;
  /** Creates one backend instance for the provided runtime context. */
  create: (context: EngineBackendAdapterContext) => EngineBackend;
}

/**
 * Returns default backend adapter registry used by canonical runtime assembly.
 */
export function createDefaultEngineBackendAdapters(): readonly EngineBackendAdapter[] {
  return [
    {
      mode: "canvas2d",
      create: (context) => createCanvas2DBackendAdapter(context.surface, context.canvas2d),
    },
    {
      mode: "webgpu",
      create: (context) =>
        createWebGPUBackendAdapter(context.surface, context.noop),
    },
    {
      mode: "webgl",
      create: (context) =>
        createWebGLBackendAdapter(context.surface, context.noop),
    },
    {
      mode: "headless",
      create: (context) => createNoopBackendAdapter("headless", context.noop),
    },
  ];
}

/**
 * Resolves one backend instance from selected mode and adapter registry.
 * @param mode Resolved backend mode from backend selector.
 * @param context Runtime construction context for adapter-backed backend creation.
 * @param adapters Ordered backend adapter registry.
 */
export function resolveEngineBackendFromAdapters(
  mode: EngineResolvedBackendMode,
  context: EngineBackendAdapterContext,
  adapters: readonly EngineBackendAdapter[] = createDefaultEngineBackendAdapters(),
): EngineBackend {
  for (const adapter of adapters) {
    if (adapter.mode !== mode) {
      continue;
    }
    return adapter.create(context);
  }

  // Keep runtime deterministic even when adapter registry drifts by falling back
  // to no-op backend for the requested resolved mode.
  return createNoopBackendAdapter(mode, context.noop);
}
