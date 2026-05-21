import type { EngineCoreModule } from "../../core/module/module-contracts";
import type { EngineRuntimeProfile } from "../profile-contracts";
import {
  engineObservabilityModule,
  engineSchedulerModule,
} from "../base/base-runtime-profile";

/**
 * Document capability module for headless mutation and replay workloads.
 */
export const engineDocumentModule: EngineCoreModule = {
  id: "core.document",
  provides: ["document.graph", "document.transactions"],
};

/**
 * Compiler capability module that turns document changes into runtime updates.
 */
export const engineCompilerModule: EngineCoreModule = {
  id: "core.compiler",
  provides: ["compiler.incremental"],
  requires: ["document.graph"],
};

/**
 * Runtime world capability module that owns compiled runtime state.
 */
export const engineWorldModule: EngineCoreModule = {
  id: "core.world",
  provides: ["world.runtime-state"],
  requires: ["compiler.incremental"],
};

/**
 * Headless profile for Node.js, replay, tests, and server-side deterministic runs.
 */
export const headlessRuntimeProfile: EngineRuntimeProfile = {
  id: "headless-runtime",
  target: "headless",
  strictness: "strict",
  modules: [
    engineSchedulerModule,
    engineObservabilityModule,
    engineDocumentModule,
    engineCompilerModule,
    engineWorldModule,
  ],
  requiredCapabilities: [
    "scheduler.frame-phases",
    "observability.diagnostics",
    "document.graph",
    "compiler.incremental",
    "world.runtime-state",
  ],
  backendPriority: ["headless"],
};
