import { buildEngineRuntimeDiagnosticsSnapshot } from './createEngineDiagnosticsBuilder.ts'

/**
 * Resolves diagnostics input payload from runtime state snapshots.
 * @param options Runtime snapshot dependencies used to build diagnostics input.
 */
export function resolveCreateEngineDiagnosticsInput(options: {
  backend: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['backend']
  latestRenderStats: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestRenderStats']
  pixelRatio: number
  outputPixelRatio: number
  sceneDiagnostics: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['sceneDiagnostics']
  latestFramePlan: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestFramePlan']
  latestHitPlan: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestHitPlan']
  hit3dPolicy: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['hit3dPolicy']
  shortlistState: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['shortlistState']
  viewport: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['viewport']
  cameraAnimationState: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['cameraAnimationState']
  latestStrategyPhase: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestStrategyPhase']
  latestStrategyInteractionActive: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestStrategyInteractionActive']
  renderQuality: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['renderQuality']
  lastInteractionKind: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['lastInteractionKind']
  nowMs: number
  lastInteractionAtMs: number
  predictorState: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['predictorState']
  latestBudgetPressure: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestBudgetPressure']
  frameBudget: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['frameBudget']
  visibility3dPolicyDecision: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['visibility3dPolicyDecision']
  settleSharpnessState: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['settleSharpnessState']
  runtimePolicy: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['runtimePolicy']
  latestPressureScore: number
  latestAutoQualityDecisionReason: string
  latestQosPanel: Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]['latestQosPanel']
}) {
  return {
    backend: options.backend,
    latestRenderStats: options.latestRenderStats,
    pixelRatio: options.pixelRatio,
    outputPixelRatio: options.outputPixelRatio,
    sceneDiagnostics: options.sceneDiagnostics,
    latestFramePlan: options.latestFramePlan,
    latestHitPlan: options.latestHitPlan,
    hit3dPolicy: options.hit3dPolicy,
    shortlistState: options.shortlistState,
    viewport: options.viewport,
    cameraAnimationState: options.cameraAnimationState,
    latestStrategyPhase: options.latestStrategyPhase,
    latestStrategyInteractionActive: options.latestStrategyInteractionActive,
    renderQuality: options.renderQuality,
    lastInteractionKind: options.lastInteractionKind,
    nowMs: options.nowMs,
    lastInteractionAtMs: options.lastInteractionAtMs,
    predictorState: options.predictorState,
    latestBudgetPressure: options.latestBudgetPressure,
    frameBudget: options.frameBudget,
    visibility3dPolicyDecision: options.visibility3dPolicyDecision,
    settleSharpnessState: options.settleSharpnessState,
    runtimePolicy: options.runtimePolicy,
    latestPressureScore: options.latestPressureScore,
    latestAutoQualityDecisionReason: options.latestAutoQualityDecisionReason,
    latestQosPanel: options.latestQosPanel,
  }
}
