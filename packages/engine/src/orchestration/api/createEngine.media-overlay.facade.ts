import type { EngineHandle } from "./public-types";
import type { EnginePublicCapabilitiesOutput } from "./public-types";

const PICK_TOLERANCE_MULTIPLIER = 2;

/**
 * Builds media, overlay, asset, and headless-session facade methods for createEngine.
 * @param deps Mutable state bridges and event emitters consumed by this facade.
 */
export function createEngineMediaOverlayFacade(deps: {
  getOverlayNodes: () => readonly unknown[];
  setOverlayNodes: (nodes: readonly unknown[]) => void;
  setTransformPreview: (preview: unknown) => void;
  getTransformPreview: () => unknown;
  setAnnotations: (annotations: readonly unknown[]) => void;
  getAnnotations: () => readonly unknown[];
  setInvalidatePayload: (payload: unknown) => void;
  queryGraph: (bounds: { x: number; y: number; width: number; height: number }) => { nodeIds: readonly string[] };
  getGraphNodeIds: () => readonly string[];
  setInteractionState: (state: Readonly<Record<string, unknown>> | null) => void;
  markInteractionSet: () => void;
  emitEvent: (type: string, payload: unknown) => void;
  assetStates: Map<string, "loaded" | "preloaded" | "unloaded">;
  setMediaSources: (sources: readonly unknown[]) => void;
  getMediaSources: () => readonly unknown[];
  setMediaTimeMs: (timeMs: number) => void;
  getMediaTimeMs: () => number;
  resolveNow: () => number;
  getBackendPreference: () => "auto" | "webgpu" | "webgl" | "canvas2d" | "headless";
  setBackendPreference: (preference: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless") => void;
  getRuntimeCapabilitySnapshot: () => EnginePublicCapabilitiesOutput;
  createHeadlessSessionId: () => string;
  headlessSessions: Map<string, { createdAtMs: number }>;
}): Pick<
  EngineHandle,
  | "setOverlays"
  | "appendOverlays"
  | "updateOverlay"
  | "removeOverlay"
  | "clearOverlays"
  | "setTransformPreview"
  | "clearTransformPreview"
  | "setAnnotations"
  | "clearAnnotations"
  | "invalidate"
  | "pickRect"
  | "pickLasso"
  | "queryFrustum"
  | "setInteractionState"
  | "clearInteractionState"
  | "loadAssets"
  | "preloadAssets"
  | "unloadAssets"
  | "getAssetState"
  | "getAssetStats"
  | "setMediaSources"
  | "seekMedia"
  | "captureImage"
  | "captureVideoFrame"
  | "setBackendPreference"
  | "getCapabilities"
  | "createHeadlessSession"
  | "destroyHeadlessSession"
> {
  return {
    setOverlays(overlays) {
      deps.setOverlayNodes([...overlays]);
    },
    appendOverlays(overlays) {
      deps.setOverlayNodes([...deps.getOverlayNodes(), ...overlays]);
    },
    updateOverlay(overlayId, patch) {
      deps.setOverlayNodes(
        deps.getOverlayNodes().map((overlay) => {
          if (typeof overlay === "object" && overlay !== null && "id" in overlay && (overlay as { id?: unknown }).id === overlayId) {
            return {
              ...(overlay as Record<string, unknown>),
              ...patch,
            };
          }
          return overlay;
        }),
      );
    },
    removeOverlay(overlayId) {
      deps.setOverlayNodes(
        deps.getOverlayNodes().filter(
          (overlay) => !(typeof overlay === "object" && overlay !== null && "id" in overlay && (overlay as { id?: unknown }).id === overlayId),
        ),
      );
    },
    clearOverlays() {
      deps.setOverlayNodes([]);
    },
    setTransformPreview(preview) {
      deps.setTransformPreview(preview);
    },
    clearTransformPreview() {
      deps.setTransformPreview(null);
    },
    setAnnotations(nextAnnotations) {
      deps.setAnnotations([...nextAnnotations]);
    },
    clearAnnotations() {
      deps.setAnnotations([]);
    },
    invalidate(input) {
      deps.setInvalidatePayload(input ?? { reason: "manual-invalidate" });
    },
    pickRect(rect, options) {
      const tolerance = Math.max(0, options?.tolerance ?? 0);
      const queryResult = deps.queryGraph({
        x: rect.x - tolerance,
        y: rect.y - tolerance,
          width: rect.width + tolerance * PICK_TOLERANCE_MULTIPLIER,
          height: rect.height + tolerance * PICK_TOLERANCE_MULTIPLIER,
      });
      return {
        hits: queryResult.nodeIds.map((id, rank) => ({ id, rank })),
      };
    },
    pickLasso(lasso, options) {
      if (!Array.isArray(lasso.points) || lasso.points.length === 0) {
        return { hits: [] };
      }
      const xs = lasso.points.map((point) => point.x);
      const ys = lasso.points.map((point) => point.y);
      return this.pickRect(
        {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
        options,
      );
    },
    queryFrustum() {
      return {
        nodeIds: [...deps.getGraphNodeIds()].sort(),
      };
    },
    setInteractionState(state) {
      deps.setInteractionState(state);
      deps.markInteractionSet();
      deps.emitEvent("engine.interaction.stateChanged", {
        active: true,
        state,
      });
    },
    clearInteractionState() {
      deps.setInteractionState(null);
      deps.emitEvent("engine.interaction.stateChanged", {
        active: false,
      });
    },
    loadAssets(assets) {
      const outcomes: Array<{ assetId: string; state: "loaded" | "missing" }> = [];
      const total = Math.max(1, assets.length);
      let completed = 0;
      for (const asset of assets) {
        if (typeof asset.id !== "string" || asset.id.length === 0) {
          deps.emitEvent("engine.resource.loadFailed", {
            assetId: String(asset.id ?? ""),
            reason: "INVALID_ASSET_ID",
          });
          outcomes.push({
            assetId: String(asset.id ?? ""),
            state: "missing",
          });
          continue;
        }
        deps.assetStates.set(asset.id, "loaded");
        completed += 1;
        deps.emitEvent("engine.resource.loadProgress", {
          assetId: asset.id,
          completed,
          total,
        });
        outcomes.push({
          assetId: asset.id,
          state: "loaded",
        });
      }
      return outcomes;
    },
    preloadAssets(request) {
      const outcomes: Array<{ assetId: string; state: "preloaded" | "missing" }> = [];
      const total = Math.max(1, request.length);
      let completed = 0;
      for (const asset of request) {
        if (typeof asset.id !== "string" || asset.id.length === 0) {
          deps.emitEvent("engine.resource.loadFailed", {
            assetId: String(asset.id ?? ""),
            reason: "INVALID_ASSET_ID",
          });
          outcomes.push({
            assetId: String(asset.id ?? ""),
            state: "missing",
          });
          continue;
        }
        deps.assetStates.set(asset.id, "preloaded");
        completed += 1;
        deps.emitEvent("engine.resource.loadProgress", {
          assetId: asset.id,
          completed,
          total,
        });
        outcomes.push({
          assetId: asset.id,
          state: "preloaded",
        });
      }
      return outcomes;
    },
    unloadAssets(assetIds) {
      for (const assetId of assetIds) {
        if (!deps.assetStates.has(assetId)) {
          deps.emitEvent("engine.resource.loadFailed", {
            assetId,
            reason: "ASSET_NOT_FOUND",
          });
        }
        deps.assetStates.set(assetId, "unloaded");
      }
      return assetIds.map((assetId) => ({ assetId, state: "unloaded" as const }));
    },
    getAssetState(assetId) {
      return {
        assetId,
        state: deps.assetStates.get(assetId) ?? "missing",
      };
    },
    getAssetStats() {
      let loadedCount = 0;
      let preloadedCount = 0;
      for (const state of deps.assetStates.values()) {
        if (state === "loaded") {
          loadedCount += 1;
        }
        if (state === "preloaded") {
          preloadedCount += 1;
        }
      }
      return {
        loadedCount,
        preloadedCount,
        totalCount: deps.assetStates.size,
      };
    },
    setMediaSources(sources) {
      deps.setMediaSources([...sources]);
    },
    seekMedia(time) {
      if (deps.getMediaSources().length === 0) {
        deps.emitEvent("engine.streaming.backpressure", {
          reason: "NO_MEDIA_SOURCE",
        });
      }
      deps.setMediaTimeMs(Math.max(0, Number.isFinite(time) ? time : deps.getMediaTimeMs()));
    },
    captureImage() {
      return {
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      };
    },
    captureVideoFrame() {
      return {
        timestampMs: deps.resolveNow(),
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      };
    },
    setBackendPreference(preference) {
      const previousPreference = deps.getBackendPreference();
      deps.setBackendPreference(preference);
      deps.emitEvent("engine.render.backendSwitched", {
        from: previousPreference,
        to: preference,
      });
    },
    getCapabilities() {
      return deps.getRuntimeCapabilitySnapshot();
    },
    createHeadlessSession() {
      const sessionId = deps.createHeadlessSessionId();
      deps.headlessSessions.set(sessionId, { createdAtMs: deps.resolveNow() });
      return { sessionId };
    },
    destroyHeadlessSession(sessionId) {
      const destroyed = deps.headlessSessions.delete(sessionId);
      return { destroyed };
    },
  };
}
