import type {
  EngineBackendMode,
} from "../api/public-types";
import type {
  EngineCapabilityId,
  EngineCoreModule,
  EngineRuntimeStrictness,
} from "../core/module/module-contracts";
import type { EngineDocumentChangeSet } from "../document/document-contracts";
import type { EngineViewportState } from "../view/viewportFacade";
import type { EngineInteractionMutationKind } from "../render-runtime/strategy";

/**
 * Host or scenario target represented by one runtime profile.
 */
export type EngineRuntimeProfileTarget =
  | "base"
  | "headless"
  | "browser"
  | "electron"
  | "node"
  | "test"
  | "scenario";

/**
 * Backend priority list used by profile metadata and backend selection policy.
 */
export type EngineBackendPriority = readonly EngineBackendMode[];

/**
 * One recorded interaction event used by scenario replay manifests.
 */
export interface EngineScenarioReplayInputEvent {
  /** Event timestamp in milliseconds relative to scenario replay start. */
  atMs: number;
  /** Interaction mutation kind to replay. */
  kind: EngineInteractionMutationKind;
  /** Optional horizontal delta used by pan-like events. */
  deltaX?: number;
  /** Optional vertical delta used by pan-like events. */
  deltaY?: number;
  /** Optional zoom scale used by zoom-like events. */
  scale?: number;
}

/**
 * Recorded replay payload for one scenario profile.
 */
export interface EngineScenarioReplayManifest {
  /** Ordered document change-sets used during deterministic replay. */
  documentChangeSets: readonly EngineDocumentChangeSet[];
  /** Ordered viewport snapshots used during deterministic replay. */
  viewportStates: readonly EngineViewportState[];
  /** Ordered interaction events used during deterministic replay. */
  inputEvents: readonly EngineScenarioReplayInputEvent[];
}

/**
 * Expected diagnostics snapshot recorded for one scenario profile.
 */
export interface EngineScenarioDiagnosticsSnapshot {
  /** Deterministic module activation order expected from runtime assembly. */
  moduleActivationOrder: readonly string[];
  /** Requested backend mode for backend-selection snapshot checks. */
  backendRequested: EngineBackendMode;
  /** Resolved backend mode expected from backend-selection snapshot checks. */
  backendResolved: EngineBackendMode;
  /** Expected fallback reason expected from backend-selection snapshot checks. */
  backendFallbackReason: string | null;
}

/**
 * Scenario manifest metadata used by replay and diagnostics conformance tests.
 */
export interface EngineScenarioProfileManifest {
  /** Stable scenario manifest id for traceability. */
  id: string;
  /** Human-readable scenario description. */
  description: string;
  /** Recorded replay payload for scenario replays. */
  replay: EngineScenarioReplayManifest;
  /** Expected diagnostics snapshot for profile runtime and backend selection checks. */
  diagnostics: EngineScenarioDiagnosticsSnapshot;
}

/**
 * Declarative manifest that assembles modules into one runtime profile.
 */
export interface EngineRuntimeProfile {
  /**
   * Stable profile id used in diagnostics and tests.
   */
  id: string;
  /**
   * Runtime host or scenario class this profile targets.
   */
  target: EngineRuntimeProfileTarget;
  /**
   * Missing capability behavior for APIs assembled from this profile.
   */
  strictness: EngineRuntimeStrictness;
  /**
   * Ordered modules activated by this profile.
   */
  modules: readonly EngineCoreModule[];
  /**
   * Capabilities the profile itself requires before runtime start.
   */
  requiredCapabilities?: readonly EngineCapabilityId[];
  /**
   * Capabilities the profile may use when present.
   */
  optionalCapabilities?: readonly EngineCapabilityId[];
  /**
   * Backend priority metadata used by runtime assembly and diagnostics.
   */
  backendPriority?: EngineBackendPriority;
  /**
   * Scenario label for benchmark, replay, or product-specific profile variants.
   */
  scenario?: string;
  /**
   * Optional scenario manifest metadata for replay and diagnostics conformance.
   */
  scenarioManifest?: EngineScenarioProfileManifest;
}

/**
 * Input used when checking one API against an assembled profile capability set.
 */
export interface EngineCapabilityAccessInput {
  /**
   * Profile being checked.
   */
  profile: EngineRuntimeProfile;
  /**
   * Capability required by the API call.
   */
  capabilityId: EngineCapabilityId;
}

/**
 * Result of one profile capability access check.
 */
export interface EngineCapabilityAccessResult {
  /**
   * Whether the requested capability exists in the profile.
   */
  available: boolean;
  /**
   * Whether strict mode should throw for this missing capability.
   */
  shouldThrow: boolean;
  /**
    * Whether non-strict mode should emit a warning for this missing capability.
   */
  shouldWarn: boolean;
  /**
   * Diagnostic message for missing capability behavior.
   */
  message: string | null;
}
