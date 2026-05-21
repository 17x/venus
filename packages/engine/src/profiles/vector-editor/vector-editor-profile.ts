import type { EngineCoreModule } from "../../core/module/module-contracts";
import type { EngineRuntimeProfile } from "../profile-contracts";
import {
  engineCompositionModule,
  engineExtractionModule,
  engineRenderPlanningModule,
  engineViewModule,
} from "../browser/browser-runtime-profile";
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
 * Spatial capability module for viewport candidate queries and large-scene bounds.
 */
export const engineSpatialModule: EngineCoreModule = {
  id: "core.spatial",
  provides: ["spatial.index", "spatial.viewport-query"],
  requires: ["world.runtime-state"],
};

/**
 * Visibility capability module for visible sets, overscan, and zoom-aware culling.
 */
export const engineVisibilityModule: EngineCoreModule = {
  id: "core.visibility",
  provides: ["visibility.visible-set", "visibility.overscan"],
  requires: ["spatial.index", "view.viewport"],
};

/**
 * Picking capability module for broad/narrow hit stacks and hover targeting.
 */
export const enginePickingModule: EngineCoreModule = {
  id: "core.picking",
  provides: ["picking.hit-test", "picking.hit-stack"],
  requires: ["spatial.viewport-query", "view.viewport"],
};

/**
 * Interaction capability module for normalized input, tools, and command output.
 */
export const engineInteractionModule: EngineCoreModule = {
  id: "core.interaction",
  provides: ["interaction.input-routing", "interaction.command-buffer"],
  requires: ["picking.hit-test", "document.transactions"],
};

/**
 * Vector editor profile preserving current app parity requirements during migration.
 */
export const vectorEditorRuntimeProfile: EngineRuntimeProfile = {
  id: "vector-editor-runtime",
  target: "scenario",
  strictness: "dev",
  scenario: "vector-editor",
  modules: [
    engineSchedulerModule,
    engineObservabilityModule,
    engineDocumentModule,
    engineCompilerModule,
    engineWorldModule,
    engineViewModule,
    engineSpatialModule,
    engineVisibilityModule,
    enginePickingModule,
    engineInteractionModule,
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
    "spatial.index",
    "visibility.visible-set",
    "picking.hit-test",
    "interaction.command-buffer",
    "composition.hover-layer",
    "composition.overlay-layer",
    "render-planning.frame-plan",
  ],
  optionalCapabilities: [
    "backend.webgpu",
    "backend.webgl",
    "backend.canvas2d",
  ],
  backendPriority: ["webgpu", "webgl", "canvas2d", "headless"],
};
