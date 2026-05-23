import type { EngineHandle } from "./public-types";

type EngineLifecycleViewFacadeDependencies = {
  emitEvent: (type: string, payload: unknown) => void;
  isMounted: () => boolean;
  setMountTarget: (target: Parameters<EngineHandle["mount"]>[0] | null) => void;
  getDeveloperConfig: () => Record<string, unknown>;
  setDeveloperConfig: (config: Record<string, unknown>) => void;
  getViewportLayout: () => ReturnType<EngineHandle["getViewportLayout"]>;
  setViewportLayout: (layout: Parameters<EngineHandle["setViewportLayout"]>[0]) => void;
  getInteractionState: () => ReturnType<EngineHandle["getConfig"]>["interactionState"];
  getTransformPreview: () => ReturnType<EngineHandle["getConfig"]>["transformPreview"];
  getAnnotationCount: () => number;
  getMediaSourceCount: () => number;
  getMediaTimeMs: () => number;
  getBackendPreference: () => ReturnType<EngineHandle["getConfig"]>["backendPreference"];
  getRuntimeBackendDebugOptions: () => ReturnType<EngineHandle["getConfig"]>["runtimeBackendDebugOptions"];
  runtimeStart: () => void;
  runtimeStop: () => void;
  runtimePause: () => void;
  runtimeResume: () => void;
  markInteractionSet: () => void;
  resizeRuntime: (width: number, height: number) => ReturnType<EngineHandle["resize"]>;
  resizeViewport: (width: number, height: number) => void;
  resolveViewportSnapshot: () => ReturnType<EngineHandle["getView"]>;
  applyViewPatch: (view: Parameters<EngineHandle["setView"]>[0]) => ReturnType<EngineHandle["setView"]>;
  getViewportState: () => { scale: number; offsetX: number; offsetY: number };
  getQuality: () => ReturnType<EngineHandle["getQuality"]>;
  setQuality: (profile: Parameters<EngineHandle["setQuality"]>[0]) => void;
  getFrameBudget: () => number;
  setFrameBudget: (budget: number) => void;
  defaultDebugEnabled: boolean;
};

/**
 * Builds lifecycle and viewport-oriented engine APIs while preserving current event emission semantics.
 * @param dependencies Shared state accessors and runtime delegates from createEngine.
 */
export function createEngineLifecycleViewFacade(
  dependencies: EngineLifecycleViewFacadeDependencies,
): Pick<
  EngineHandle,
  | "ready"
  | "mount"
  | "unmount"
  | "configure"
  | "getConfig"
  | "resetConfig"
  | "start"
  | "stop"
  | "pause"
  | "resume"
  | "resize"
  | "setView"
  | "getView"
  | "fitToBounds"
  | "resetView"
  | "setViewportLayout"
  | "getViewportLayout"
  | "screenToWorld"
  | "worldToScreen"
  | "setQuality"
  | "getQuality"
  | "setFrameBudget"
  | "getFrameBudget"
> {
  const {
    emitEvent,
    isMounted,
    setMountTarget,
    getDeveloperConfig,
    setDeveloperConfig,
    getViewportLayout: resolveViewportLayout,
    setViewportLayout: applyViewportLayout,
    getInteractionState,
    getTransformPreview,
    getAnnotationCount,
    getMediaSourceCount,
    getMediaTimeMs,
    getBackendPreference,
    getRuntimeBackendDebugOptions,
    runtimeStart,
    runtimeStop,
    runtimePause,
    runtimeResume,
    markInteractionSet,
    resizeRuntime,
    resizeViewport,
    resolveViewportSnapshot,
    applyViewPatch,
    getViewportState,
    getQuality: resolveQuality,
    setQuality: applyQuality,
    getFrameBudget: resolveFrameBudget,
    setFrameBudget: applyFrameBudget,
    defaultDebugEnabled,
  } = dependencies;

  return {
    /**
     * Resolves engine readiness and emits lifecycle-ready event payload.
     */
    async ready() {
      emitEvent("engine.lifecycle.ready", {
        mounted: isMounted(),
      });
      return Promise.resolve();
    },
    /**
     * Mounts engine host target and emits lifecycle-mounted event payload.
     * @param target Mount host descriptor consumed by runtime shell.
     */
    mount(target) {
      emitEvent("engine.lifecycle.beforeMount", {
        mounted: isMounted(),
      });
      setMountTarget(target);
      emitEvent("engine.lifecycle.mounted", {
        mounted: true,
      });
    },
    /**
     * Unmounts engine host target and emits lifecycle-unmounted event payload.
     */
    unmount() {
      emitEvent("engine.lifecycle.beforeUnmount", {
        mounted: isMounted(),
      });
      setMountTarget(null);
      emitEvent("engine.lifecycle.unmounted", {
        mounted: false,
      });
    },
    /**
     * Applies partial config updates to developer configuration state.
     * @param config Partial configuration patch object.
     */
    configure(config) {
      setDeveloperConfig({
        ...getDeveloperConfig(),
        ...config,
      });
    },
    /**
     * Returns merged config snapshot with runtime-derived state fields.
     */
    getConfig() {
      return {
        ...getDeveloperConfig(),
        mounted: isMounted(),
        viewportLayout: resolveViewportLayout(),
        interactionState: getInteractionState(),
        transformPreview: getTransformPreview(),
        annotationCount: getAnnotationCount(),
        mediaSourceCount: getMediaSourceCount(),
        mediaTimeMs: getMediaTimeMs(),
        backendPreference: getBackendPreference(),
        runtimeBackendDebugOptions: getRuntimeBackendDebugOptions(),
      };
    },
    /**
     * Resets config either globally or for one key scope.
     * @param scope Optional key to reset on the developer configuration object.
     */
    resetConfig(scope) {
      if (scope && scope in getDeveloperConfig()) {
        const next = { ...getDeveloperConfig() };
        delete (next as Record<string, unknown>)[scope];
        setDeveloperConfig(next);
        return;
      }
      setDeveloperConfig({
        debug: defaultDebugEnabled,
      });
    },
    /**
     * Starts runtime loop execution.
     */
    start() {
      runtimeStart();
    },
    /**
     * Stops runtime loop execution.
     */
    stop() {
      runtimeStop();
    },
    /**
     * Pauses runtime shell frame execution.
     */
    pause() {
      runtimePause();
    },
    /**
     * Resumes runtime shell frame execution.
     */
    resume() {
      runtimeResume();
    },
    /**
     * Resizes runtime surface and emits viewport resize + view change events.
     * @param width Next viewport width in pixels.
     * @param height Next viewport height in pixels.
     */
    resize(width, height) {
      markInteractionSet();
      resizeViewport(width, height);
      const resized = resizeRuntime(width, height);
      emitEvent("engine.view.viewportResized", {
        width,
        height,
      });
      emitEvent("engine.view.changed", {
        viewport: resolveViewportSnapshot(),
      });
      return resized;
    },
    /**
     * Applies view patch and emits canonical view-changed event.
     * @param view View patch payload.
     */
    setView(view) {
      const snapshot = applyViewPatch(view);
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    /**
     * Returns current viewport snapshot.
     */
    getView() {
      return resolveViewportSnapshot();
    },
    /**
     * Fits viewport to bounds and emits canonical view-changed event.
     * @param bounds World-space bounds payload.
     */
    fitToBounds(bounds) {
      const snapshot = applyViewPatch({
        offsetX: bounds.x,
        offsetY: bounds.y,
      });
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    /**
     * Resets viewport and emits canonical view-changed event.
     */
    resetView() {
      const snapshot = applyViewPatch({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    /**
     * Sets viewport layout mode.
     * @param layout Layout mode token.
     */
    setViewportLayout(layout) {
      applyViewportLayout(layout);
    },
    /**
     * Returns active viewport layout mode.
     */
    getViewportLayout() {
      return resolveViewportLayout();
    },
    /**
     * Converts screen coordinates into world coordinates.
     * @param point Screen-space point input.
     */
    screenToWorld(point) {
      const viewport = getViewportState();
      return {
        x: point.x / Math.max(viewport.scale, 0.0001) + viewport.offsetX,
        y: point.y / Math.max(viewport.scale, 0.0001) + viewport.offsetY,
      };
    },
    /**
     * Converts world coordinates into screen coordinates.
     * @param point World-space point input.
     */
    worldToScreen(point) {
      const viewport = getViewportState();
      return {
        x: (point.x - viewport.offsetX) * viewport.scale,
        y: (point.y - viewport.offsetY) * viewport.scale,
      };
    },
    /**
     * Sets runtime quality profile.
     * @param profile Quality profile token.
     */
    setQuality(profile) {
      applyQuality(profile);
    },
    /**
     * Returns runtime quality profile.
     */
    getQuality() {
      return resolveQuality();
    },
    /**
     * Sets frame budget in milliseconds.
     * @param budget Frame budget candidate in milliseconds.
     */
    setFrameBudget(budget) {
      applyFrameBudget(budget);
    },
    /**
     * Returns frame budget in milliseconds.
     */
    getFrameBudget() {
      return resolveFrameBudget();
    },
  };
}
