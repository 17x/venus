// Module responsibility: compose runtime diagnostics snapshots from normalized runtime sections.
// Non-responsibility: render loop orchestration or policy mutation.

import type { EngineRuntimeDiagnostics } from './createEngineContracts.ts'

/**
 * Describes normalized runtime diagnostics sections consumed by snapshot composition.
 */
export interface ResolveEngineRuntimeDiagnosticsSnapshotInput {
  /** Backend capability identifier. */
  backend: EngineRuntimeDiagnostics['backend']
  /** Latest render stats snapshot. */
  renderStats: EngineRuntimeDiagnostics['renderStats']
  /** Effective render pixel ratio. */
  pixelRatio: EngineRuntimeDiagnostics['pixelRatio']
  /** Effective output pixel ratio. */
  outputPixelRatio: EngineRuntimeDiagnostics['outputPixelRatio']
  /** Scene store diagnostics snapshot. */
  scene: EngineRuntimeDiagnostics['scene']
  /** Latest frame plan snapshot. */
  framePlan: EngineRuntimeDiagnostics['framePlan']
  /** Latest hit plan snapshot. */
  hitPlan: EngineRuntimeDiagnostics['hitPlan']
  /** 3D hit resolver capability diagnostics section. */
  hit3dPolicy: EngineRuntimeDiagnostics['hit3dPolicy']
  /** Shortlist diagnostics section. */
  shortlist: EngineRuntimeDiagnostics['shortlist']
  /** Viewport diagnostics section. */
  viewport: EngineRuntimeDiagnostics['viewport']
  /** Camera animation diagnostics section. */
  cameraAnimation: EngineRuntimeDiagnostics['cameraAnimation']
  /** Strategy diagnostics section. */
  strategy: EngineRuntimeDiagnostics['strategy']
  /** Predictor diagnostics section. */
  predictor: EngineRuntimeDiagnostics['predictor']
  /** Budget diagnostics section. */
  budget: EngineRuntimeDiagnostics['budget']
  /** Strategy snapshot diagnostics section. */
  strategySnapshot: EngineRuntimeDiagnostics['strategySnapshot']
  /** 3D visibility policy diagnostics section. */
  visibility3dPolicy: EngineRuntimeDiagnostics['visibility3dPolicy']
  /** Settle sharpness diagnostics section. */
  settleSharpness: EngineRuntimeDiagnostics['settleSharpness']
  /** Policy diagnostics section. */
  policy: EngineRuntimeDiagnostics['policy']
  /** QoS diagnostics section. */
  qos: EngineRuntimeDiagnostics['qos']
  /** Performance gate diagnostics section. */
  performanceGate: EngineRuntimeDiagnostics['performanceGate']
}

/**
 * Intent: compose one runtime diagnostics snapshot from normalized section payloads.
 * @param input Runtime diagnostics section input.
 * @returns Runtime diagnostics snapshot.
 */
export function resolveEngineRuntimeDiagnosticsSnapshot(
  input: ResolveEngineRuntimeDiagnosticsSnapshotInput,
): EngineRuntimeDiagnostics {
  return {
    backend: input.backend,
    renderStats: input.renderStats,
    pixelRatio: input.pixelRatio,
    outputPixelRatio: input.outputPixelRatio,
    scene: input.scene,
    framePlan: input.framePlan,
    hitPlan: input.hitPlan,
    hit3dPolicy: input.hit3dPolicy,
    shortlist: input.shortlist,
    viewport: input.viewport,
    cameraAnimation: input.cameraAnimation,
    strategy: input.strategy,
    predictor: input.predictor,
    budget: input.budget,
    strategySnapshot: input.strategySnapshot,
    visibility3dPolicy: input.visibility3dPolicy,
    settleSharpness: input.settleSharpness,
    policy: input.policy,
    qos: input.qos,
    performanceGate: input.performanceGate,
  }
}
