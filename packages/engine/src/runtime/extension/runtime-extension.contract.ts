/**
 * Runtime extension API level classifications.
 */
export type EngineRuntimeExtensionLevel = "developer";

/**
 * Runtime extension API stability classifications.
 */
export type EngineRuntimeExtensionStability = "beta";

/**
 * Error codes reserved for runtime extension APIs.
 */
export type EngineRuntimeExtensionErrorCode =
  | "ENGINE_EXTENSION_INVALID_PLUGIN"
  | "ENGINE_EXTENSION_DUPLICATE_PLUGIN"
  | "ENGINE_EXTENSION_NOT_FOUND";

/**
 * Canonical extension/plugin runtime state tokens.
 */
export type EngineExtensionState = "registered" | "active" | "errored" | "disposed";

/**
 * Public plugin definition contract accepted by engine.extension.register.
 */
export interface EngineExtensionPlugin {
  /** Stable plugin identifier. */
  id: string;
  /** Optional plugin display name for diagnostics output. */
  name?: string;
  /** Optional plugin version token for compatibility diagnostics. */
  version?: string;
}

/**
 * Extension register output contract.
 */
export interface EngineExtensionRegisterOutput {
  /** Registered plugin id. */
  pluginId: string;
  /** Current plugin lifecycle state after registration. */
  state: EngineExtensionState;
}

/**
 * Extension unregister output contract.
 */
export interface EngineExtensionUnregisterOutput {
  /** True when plugin existed and was removed. */
  removed: boolean;
}

/**
 * Extension list item output contract.
 */
export interface EngineExtensionListItem {
  /** Stable plugin identifier. */
  pluginId: string;
  /** Current plugin lifecycle state. */
  state: EngineExtensionState;
}

/**
 * Extension get-state output contract.
 */
export interface EngineExtensionGetStateOutput {
  /** Stable plugin identifier. */
  pluginId: string;
  /** Current plugin lifecycle state. */
  state: EngineExtensionState;
}

/**
 * API descriptor contract for one runtime extension endpoint.
 */
export interface EngineRuntimeExtensionApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.extension.register"
    | "engine.extension.unregister"
    | "engine.extension.list"
    | "engine.extension.getState";
  /** API layering classification. */
  level: EngineRuntimeExtensionLevel;
  /** API stability tag. */
  stability: EngineRuntimeExtensionStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeExtensionErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime extension descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_EXTENSION_API = {
  register: {
    name: "engine.extension.register",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EXTENSION_INVALID_PLUGIN", "ENGINE_EXTENSION_DUPLICATE_PLUGIN"],
    determinism: "Same plugin id and same registry state yield the same registration result.",
  },
  unregister: {
    name: "engine.extension.unregister",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EXTENSION_NOT_FOUND"],
    determinism: "Same plugin id and same registry state yield the same removal result.",
  },
  list: {
    name: "engine.extension.list",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same registry state yields the same ordered plugin list.",
  },
  getState: {
    name: "engine.extension.getState",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EXTENSION_NOT_FOUND"],
    determinism: "Same plugin id and same registry state yield the same plugin state output.",
  },
} as const satisfies Readonly<
  Record<"register" | "unregister" | "list" | "getState", EngineRuntimeExtensionApiDescriptor>
>;

/**
 * Resolves one runtime extension API descriptor by key.
 * @param apiKey Descriptor key from the runtime extension descriptor map.
 */
export function resolveEngineRuntimeExtensionApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_EXTENSION_API,
): EngineRuntimeExtensionApiDescriptor {
  return ENGINE_RUNTIME_EXTENSION_API[apiKey];
}
