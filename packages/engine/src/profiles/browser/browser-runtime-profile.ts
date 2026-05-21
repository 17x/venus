import type { EngineCoreModule } from "../../core/module/module-contracts";
import type { EngineRuntimeProfile } from "../profile-contracts";
import {
  engineObservabilityModule,
  engineSchedulerModule,
} from "../base/base-runtime-profile";
import {
  engineCompilerModule,
  engineDocumentModule,
  engineWorldModule,
} from "../headless/headless-runtime-profile";

/**
 * View capability module for viewport and camera state.
 */
export const engineViewModule: EngineCoreModule = {
  id: "core.view",
  provides: ["view.viewport", "view.camera"],
};

/**
 * Extraction capability module that turns runtime state into backend-neutral packets.
 */
export const engineExtractionModule: EngineCoreModule = {
  id: "core.extraction",
  provides: ["extraction.render-world"],
  requires: ["world.runtime-state", "view.viewport"],
};

/**
 * Composition capability module for document, hover, selection, overlay, and debug layers.
 */
export const engineCompositionModule: EngineCoreModule = {
  id: "core.composition",
  provides: [
    "composition.layers",
    "composition.active-layer",
    "composition.hover-layer",
    "composition.overlay-layer",
  ],
  requires: ["extraction.render-world"],
};

/**
 * Render-planning capability module for frame plans, ROI, and backend submission decisions.
 */
export const engineRenderPlanningModule: EngineCoreModule = {
  id: "core.render-planning",
  provides: ["render-planning.frame-plan"],
  requires: ["composition.layers", "scheduler.budget-policy"],
};

/**
 * Browser profile for host-presented runtimes with backend priority metadata.
 */
export const browserPlatformRuntimeProfile: EngineRuntimeProfile = {
  id: "browser-platform-runtime",
  target: "browser",
  strictness: "dev",
  modules: [
    engineSchedulerModule,
    engineObservabilityModule,
    engineDocumentModule,
    engineCompilerModule,
    engineWorldModule,
    engineViewModule,
    engineExtractionModule,
    engineCompositionModule,
    engineRenderPlanningModule,
  ],
  requiredCapabilities: [
    "scheduler.frame-phases",
    "observability.diagnostics",
    "document.graph",
    "world.runtime-state",
    "view.viewport",
    "extraction.render-world",
    "composition.layers",
    "render-planning.frame-plan",
  ],
  backendPriority: ["webgpu", "webgl", "canvas2d", "headless"],
};
