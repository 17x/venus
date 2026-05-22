import type {
  EngineHandle,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
} from "./public-types";

type EngineDiagnosticsReplayFacadeDependencies = {
  resolveMetrics: () => ReturnType<EngineHandle["getMetrics"]>;
  setDiagnosticsEnabledFlag: (enabled: boolean) => void;
  emitEvent: (type: string, payload: unknown) => void;
  captureDebugFrameOutput: () => ReturnType<EngineHandle["captureDebugFrame"]>;
  createRuntimeReplayToken: (
    scope: Parameters<EngineHandle["createReplayToken"]>[0],
  ) => EngineRuntimeReplayTokenOutput;
  replayRuntimeToken: (
    token: Parameters<EngineHandle["replay"]>[0],
  ) => EngineRuntimeReplayOutput;
  resolvePublicDiagnostics: () => ReturnType<EngineHandle["getDiagnostics"]>;
  isDiagnosticsEnabled: () => boolean;
  getOverlayCount: () => number;
  captureFrame: () => ReturnType<EngineHandle["captureFrame"]>;
  resolveStats: () => ReturnType<EngineHandle["getStats"]>;
  getBackendInfo: () => ReturnType<EngineHandle["getBackendInfo"]>;
};

/**
 * Assembles diagnostics and replay API methods while preserving legacy event telemetry semantics.
 * @param dependencies Shared state readers/writers and side-effect emitters from createEngine closure.
 */
export function createEngineDiagnosticsReplayFacade(
  dependencies: EngineDiagnosticsReplayFacadeDependencies,
): Pick<
  EngineHandle,
  | "getMetrics"
  | "setDiagnosticsEnabled"
  | "captureDebugFrame"
  | "createReplayToken"
  | "replay"
  | "getDiagnostics"
  | "captureFrame"
  | "getStats"
  | "getBackendInfo"
> {
  const {
    resolveMetrics,
    setDiagnosticsEnabledFlag,
    emitEvent,
    captureDebugFrameOutput,
    createRuntimeReplayToken,
    replayRuntimeToken,
    resolvePublicDiagnostics,
    isDiagnosticsEnabled,
    getOverlayCount,
    captureFrame,
    resolveStats,
    getBackendInfo,
  } = dependencies;

  return {
    /**
     * Returns deterministic metric counters used by diagnostics surfaces.
     */
    getMetrics() {
      return resolveMetrics();
    },
    /**
     * Enables/disables diagnostics payload enrichment and emits warning on disable.
     * @param enabled Whether diagnostics payload enrichment remains enabled.
     */
    setDiagnosticsEnabled(enabled) {
      setDiagnosticsEnabledFlag(enabled);
      if (!enabled) {
        emitEvent("engine.diagnostics.warning", {
          code: "ENGINE_DIAGNOSTICS_DISABLED",
        });
      }
    },
    /**
     * Captures debug frame payload and emits diagnostics capture-ready event.
     */
    captureDebugFrame() {
      const output = captureDebugFrameOutput();
      emitEvent("engine.diagnostics.captureReady", output);
      return output;
    },
    /**
     * Creates replay token and emits replay-started event payload.
     * @param scope Optional replay token scope object.
     */
    createReplayToken(scope) {
      const token = createRuntimeReplayToken(scope);
      emitEvent("engine.replay.started", {
        scope,
        token: token.token,
      });
      return token;
    },
    /**
     * Replays one token and emits replay completion/failure event payloads.
     * @param token Replay token string accepted by runtime replay subsystem.
     */
    replay(token) {
      try {
        const replayResult = replayRuntimeToken(token);
        // Emits failed event for rejected tokens to keep replay outcome observability explicit.
        if (!replayResult.accepted) {
          emitEvent("engine.replay.failed", {
            token,
            error: "ENGINE_REPLAY_REJECTED_TOKEN",
          });
          return replayResult;
        }
        emitEvent("engine.replay.completed", {
          token,
          accepted: replayResult.accepted,
        });
        return replayResult;
      } catch (error) {
        emitEvent("engine.replay.failed", {
          token,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    /**
     * Resolves diagnostics payload and applies enrichment guard when diagnostics are disabled.
     */
    getDiagnostics() {
      const diagnostics = resolvePublicDiagnostics();
      if (!isDiagnosticsEnabled()) {
        return {
          ...diagnostics,
          framePlan: undefined,
          hitPlan: undefined,
        };
      }
      return {
        ...diagnostics,
        overlays: {
          count: getOverlayCount(),
        },
      };
    },
    /**
     * Captures one runtime frame token and emits diagnostics capture-ready event.
     */
    captureFrame() {
      const output = captureFrame();
      emitEvent("engine.diagnostics.captureReady", output);
      return output;
    },
    /**
     * Returns runtime and governance statistics consumed by tooling surfaces.
     */
    getStats() {
      return resolveStats();
    },
    /**
     * Returns active backend information from the runtime shell.
     */
    getBackendInfo() {
      return getBackendInfo();
    },
  };
}
