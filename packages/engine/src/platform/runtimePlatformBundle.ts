import type { RuntimeAdapterSet } from "./runtimeAdapters.contract";
import {
  createBrowserRuntimeAdapterSet,
  type BrowserRuntimeBoundary,
} from "./browserRuntimeAdapters";
import {
  createNodeRuntimeAdapterSet,
  type NodeRuntimeBoundary,
} from "./nodeRuntimeAdapters";

/**
 * Supported platform targets in the first-stage platform split.
 */
export type EngineRuntimePlatformTarget = "browser" | "node";

/**
 * Input boundaries used to resolve one runtime adapter set by target.
 */
export interface RuntimePlatformBundleInput {
  /** Target platform used to choose adapter creation path. */
  target: EngineRuntimePlatformTarget;
  /** Browser boundary hooks required when target is browser. */
  browserBoundary?: BrowserRuntimeBoundary;
  /** Node boundary hooks required when target is node. */
  nodeBoundary?: NodeRuntimeBoundary;
}

/**
 * Resolves one platform adapter set for browser or node runtime hosts.
 * @param input Target and host boundaries used to build adapter set.
 * @returns Runtime adapter set for the requested host target.
 */
export function resolveRuntimePlatformBundle(
  input: RuntimePlatformBundleInput,
): RuntimeAdapterSet {
  if (input.target === "browser") {
    if (!input.browserBoundary) {
      throw new Error("Browser runtime target requires browserBoundary.");
    }
    return createBrowserRuntimeAdapterSet(input.browserBoundary);
  }

  if (!input.nodeBoundary) {
    throw new Error("Node runtime target requires nodeBoundary.");
  }

  return createNodeRuntimeAdapterSet(input.nodeBoundary);
}
