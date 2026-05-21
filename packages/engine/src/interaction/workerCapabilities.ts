/**
 * Declares worker capability contracts through canonical interaction namespace.
 */
export type {
  ResolveWorkerModeOptions as ResolveEngineWorkerModeOptions,
  WorkerCapabilities as EngineWorkerCapabilities,
  WorkerEnvironment as EngineWorkerEnvironment,
  WorkerMode as EngineWorkerMode,
  WorkerModeResolution as EngineWorkerModeResolution,
} from "@venus/lib/worker";

/**
 * Re-exports worker mode resolver through canonical interaction namespace.
 */
export { resolveWorkerMode as resolveEngineWorkerMode } from "@venus/lib/worker";
