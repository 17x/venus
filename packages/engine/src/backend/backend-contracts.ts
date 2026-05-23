import type {
  EngineProtocolBackendMode,
  EngineProtocolResolvedBackendMode,
} from "../platform/protocol/backend/backend-mode";
import type {
  EngineProtocolBackendSelectionResult,
  EngineProtocolCreateOptions,
  EngineProtocolSurface,
} from "../platform/protocol/backend/backend-selection";

/**
 * Backend mode contract owned by backend layer.
 */
export type EngineBackendMode = EngineProtocolBackendMode;

/**
 * Concrete backend mode contract owned by backend layer.
 */
export type EngineResolvedBackendMode = EngineProtocolResolvedBackendMode;

/**
 * Surface contract consumed by backend adapters and probes.
 */
export type EngineBackendSurface = EngineProtocolSurface;

/**
 * Backend-selection options contract consumed by backend selector module.
 */
export type EngineBackendCreateOptions = EngineProtocolCreateOptions;

/**
 * Backend-selection result contract produced by backend selector module.
 */
export type EngineBackendSelectionResult = EngineProtocolBackendSelectionResult;
