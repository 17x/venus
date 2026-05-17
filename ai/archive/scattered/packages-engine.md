## Source: ./packages/engine/docs/settings.md

````markdown
# Venus Engine — Runtime Settings & Quality Policy System

## Overview

Modern renderers are NOT fixed rendering pipelines.

Modern renderers are:

```txt
Dynamic Runtime Budget Systems
```
````

The renderer must continuously balance:

- image quality
- frame stability
- memory usage
- GPU usage
- CPU usage
- latency
- streaming pressure
- thermal/power constraints

The purpose of the settings system is NOT:

```txt
Expose random rendering flags
```

The purpose IS:

```txt
Provide runtime policy control
```

---

# Core Architecture

````

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0013-settings-root-structure.md
```markdown
# T0013 Settings Root Structure

Status: In Progress

## Deliverables

- `src/settings/graphics`
- `src/settings/performance`
- `src/settings/runtime`
- `src/settings/presets`
- `src/settings/scaling`
- `src/settings/budget`
- `src/settings/device`
- `src/settings/diagnostics`
- `src/settings/debug`
- `src/settings/index.ts`

## Acceptance

- No cyclic imports.
- Barrel exports compile under strict typing.
````

## Source: ./packages/engine/docs/industrial-refactor/phase-b/settings-policy-guide.md

````markdown
# Engine Settings and Policy Guide (T0026)

## Profile Example

```ts
import {
  createEngineRuntimePolicy,
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
} from "@venus/engine";

const capability = resolveEngineDeviceCapabilityProfile({
  gpuTier: "mid",
  memoryTier: "mid",
  workerTier: "mid",
  webgpuSupported: false,
});

const preset = resolveEngineDefaultPreset("editor", capability);

const policy = createEngineRuntimePolicy(
  "editor",
  preset,
  resolveEngineGraphicsSettings({ renderScale: 1 }),
  resolveEnginePerformanceSettings({ frameTimeBudgetMs: 16 }),
  resolveEngineRuntimeSettings({ retainedRendering: true }),
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
  capability,
);
```
````

## Capability Example

- low-tier capability auto clamps expensive presets.
- high-tier capability may unlock higher static render scale.

````

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0027-policy-runtime-wiring.md
```markdown
# T0027 Policy Runtime Wiring

Status: In Progress

## Scope

- resolve runtime policy snapshot before frame execution
- align budget decision with policy budget envelope
- return policy diagnostics in runtime diagnostics payload

## Acceptance

- per-frame diagnostics include policy snapshot identity and key values.
````

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0021-pressure-monitor-contract.md

```markdown
# T0021 Pressure Monitor Contract

Status: In Progress

## Inputs

- cpuLoad in range [0, 1]
- gpuLoad in range [0, 1]
- memoryLoad in range [0, 1]
- visibilityLoad in range [0, 1]
- streamingLoad in range [0, 1]

## Output

- pressure tier: `low` / `medium` / `high`
- smoothed score
- hysteresis-stable transition behavior

## Acceptance

- zig-zag wave input does not flap pressure every frame.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0017-quality-preset-registry.md

```markdown
# T0017 Quality Preset Registry

Status: In Progress

## Presets

- `low`
- `medium`
- `high`
- `ultra`
- `balanced`
- `battery-saver`

## Profile Defaults

- `editor`: balanced
- `game`: high
- `animation`: high
- `medical`: ultra
- `massive-data`: medium

## Acceptance

- `profile + capability tier` resolves one deterministic preset.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0025-settings-migrator.md

```markdown
# T0025 Settings Migrator

Status: In Progress

## Scope

- map legacy settings fields into canonical settings contracts
- report warnings for deprecated fields
- ensure deterministic default backfill

## Acceptance

- legacy payload migrates to canonical settings with explicit warnings list.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0024-debug-settings-build-guard.md

```markdown
# T0024 Debug Settings Build Guard

Status: In Progress

## Scope

- release build must not expose debug toggles by default
- debug defaults must remain false

## Guard

- CI script validates release-safe debug defaults

## Acceptance

- guard fails if release defaults are unsafe.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0029-phase-b-acceptance.md

```markdown
# T0029 Phase-B Acceptance

Status: In Progress

## Scope

- consolidate T0013-T0028 outcomes
- verify no critical regression in baseline checks
- freeze phase-B contract surface

## Acceptance

- phase-B smoke and contract tests pass.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0030-go-no-go-review.md

```markdown
# T0030 Go/No-Go Review

Status: In Progress

## Inputs

- phase-B acceptance report
- open risks and mitigations
- rollout readiness checks

## Decision Output

- go/no-go decision
- residual actions with owner and due date
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0026-settings-policy-guide.md

```markdown
# T0026 Settings and Policy Guide

Status: In Progress

## Coverage

- profile examples
- capability examples
- fallback examples
- migration examples

## Acceptance

- guide contains runnable configuration snippets that align with exported contracts.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0018-runtime-policy-generator.md

```markdown
# T0018 Runtime Policy Generator

Status: In Progress

## Inputs

- resolved settings
- resolved quality preset
- critical-layer protection mode

## Outputs

- normalized policy fields
- phase overrides (`interactive`, `settling`, `static`, `camera`)
- critical-layer guard directives

## Acceptance

- Policy generation is complete for every preset.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0019-capability-aware-policy-resolver.md

```markdown
# T0019 Capability-Aware Policy Resolver

Status: In Progress

## Inputs

- device capability profile
- profile default preset
- settings override

## Rules

- low-tier devices clamp expensive defaults
- high-tier devices can raise quality caps
- resolver is deterministic for same input tuple

## Acceptance

- capability matrix tests pass.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0014-graphics-settings-contract.md

```markdown
# T0014 Graphics Settings Contract

Status: In Progress

## Fields

- `renderScale`: normalized rendering scale factor
- `maxFps`: target frame cap
- `antiAliasing`: abstract AA mode (`off`, `fxaa`, `msaa`)

## Rules

- Invalid ranges are rejected by validator.
- Contract remains user-facing and backend-agnostic.

## Tests

- schema boundary tests for renderScale and maxFps.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0020-runtime-budget-contract.md

```markdown
# T0020 Runtime Budget Contract

Status: In Progress

## Budget Domains

- draw
- upload
- cache
- tile
- worker
- frame

## Requirements

- every frame can serialize budget snapshot
- budget snapshot includes trace metadata
- contract supports future dynamic adjustments

## Acceptance

- snapshot tests confirm deterministic serialization.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0028-policy-replay-tool.md

```markdown
# T0028 Policy Replay Tool

Status: In Progress

## Scope

- ingest baseline report snapshots
- emit replay key sequence and deterministic checksum
- compare runs for decision-sequence stability

## Acceptance

- replay output is deterministic for identical input report.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0015-performance-settings-mapper.md

```markdown
# T0015 Performance Settings Mapper

Status: In Progress

## Fields

- `frameTimeBudgetMs`
- `uploadBudgetBytes`
- `workerBudgetCount`

## Rules

- Units are explicit and consistent.
- Mapper keeps semantic parity into runtime budget fields.

## Tests

- mapper accuracy tests for each field.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0022-auto-quality-scaler-v1.md

```markdown
# T0022 Auto Quality Scaler v1

Status: In Progress

## Inputs

- pressure tier
- current render scale
- min/max render scale bounds
- cooldown window

## Output

- next render scale
- decision reason
- whether adjustment occurred

## Acceptance

- scale shrinks under sustained high pressure.
- scale recovers after pressure drops and cooldown passes.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0023-diagnostics-settings-sampling.md

```markdown
# T0023 Diagnostics Settings and Sampling

Status: In Progress

## Fields

- sample interval ms
- debug field inclusion toggle
- release-safe sampling budget

## Acceptance

- diagnostics sampling can be configured without violating release overhead constraints.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-b/T0016-runtime-settings-contract.md

```markdown
# T0016 Runtime Settings Contract

Status: In Progress

## Fields

- `retainedRendering`
- `partialRedraw`
- `progressiveRendering`

## Rules

- Legacy aliases are migrated to canonical fields.
- Deprecated fields can emit warnings via migrator layer.

## Tests

- migration compatibility tests for legacy input.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0076-editor-consistency-pack.md

```markdown
# T0076 Editor Consistency Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Strengthen pointer/wheel follow-through and post-interaction consistency.
- Validate critical edit semantics under pressure.

## Acceptance

- No critical edit semantic errors during high-frequency interactions.

## Validation

- Edit semantic regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0097-sharpen-sla-gate.md

```markdown
# T0097 Sharpen SLA Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Define settle-to-sharp SLA metrics and CI gate rule.

## Acceptance

- SLA overflow triggers automatic block.

## Validation

- SLA gate tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0077-game-realtime-pack-v1.md

```markdown
# T0077 Game Realtime Pack V1

Status: in-progress
Owner: engine/runtime

## Scope

- Add dynamic-object batching and effect-budget contraction rules.
- Improve frame pacing stability.

## Acceptance

- Dynamic game scenes show significantly better frame stability.

## Validation

- Realtime dynamic-scene tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0093-runtime-inspector-v2.md

```markdown
# T0093 Runtime Inspector V2

Status: in-progress
Owner: engine/runtime

## Scope

- Visualize phase/budget/pressure plus cache/tile/upload state and profile comparisons.

## Acceptance

- Diagnostic triage efficiency improves with structured inspector views.

## Validation

- Inspector usability tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0086-tuning-advisor-v1.md

```markdown
# T0086 Tuning Advisor V1

Status: in-progress
Owner: engine/runtime

## Scope

- Encode bottleneck patterns into rule-based tuning advice and simulation checks.

## Acceptance

- Advisor returns executable recommendations for common bottlenecks.

## Validation

- Advisor correctness tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0091-benchmark-suite.md

```markdown
# T0091 Benchmark Suite

Status: in-progress
Owner: engine/runtime

## Scope

- Freeze benchmark scenarios/scripts and CI report schema.

## Acceptance

- CI emits stable benchmark outputs.

## Validation

- Benchmark CI smoke tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0083-massive-progressive-pack-v1.md

```markdown
# T0083 Massive Progressive Pack V1

Status: in-progress
Owner: engine/runtime

## Scope

- Add chunked loading with viewport-first visibility priority.
- Defer far-region work under pressure.

## Acceptance

- 300k+ roaming first-screen visibility improves.

## Validation

- Massive first-screen and roaming tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0102-phase-e-acceptance.md

```markdown
# T0102 Phase-E Acceptance

Status: in-progress
Owner: engine/runtime

## Scope

- Complete architecture committee review and pre-release audit.

## Acceptance

- Release-candidate conditions are satisfied.

## Validation

- Audit execution checks.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0081-medical-critical-layer-pack.md

```markdown
# T0081 Medical Critical-Layer Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Close-loop critical-layer rendering priority for medical workflows.
- Add non-degradation hard verification and evidence export hooks.

## Acceptance

- Medical critical-layer integrity remains 100%.

## Validation

- Medical critical-layer targeted tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0082-medical-roi-pack.md

```markdown
# T0082 Medical ROI Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Coordinate ROI and multi-resolution paths with traceability metadata.
- Optimize detail recovery path for critical regions.

## Acceptance

- Critical region detail and consistency meet thresholds.

## Validation

- Medical consistency replay tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0088-device-tier-performance-report.md

```markdown
# T0088 Device-Tier Performance Report

Status: in-progress
Owner: engine/runtime

## Scope

- Define low/mid/high tier report templates and profile-device matrix output.

## Acceptance

- Each device tier has recommended profile and preset guidance.

## Validation

- Device matrix batch tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0092-perf-trend-analyzer.md

```markdown
# T0092 Perf Trend Analyzer

Status: in-progress
Owner: engine/runtime

## Scope

- Store metric history, detect trend regressions, and attach ownership chain.

## Acceptance

- Sustained degradation trends are auto-detected.

## Validation

- Trend detection tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0078-game-long-run-stability-pack.md

```markdown
# T0078 Game Long-Run Stability Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Validate long-run memory/cache stability under thermal/power stress.
- Verify background load resilience.

## Acceptance

- Long-run soak shows no material regression drift.

## Validation

- 2-hour soak test suite.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0089-thermal-aware-policy-experiment.md

```markdown
# T0089 Thermal-Aware Policy Experiment

Status: in-progress
Owner: engine/runtime

## Scope

- Capture thermal/battery signals and calibrate thermal-aware/battery-saver policies.

## Acceptance

- Thermal constraints maintain usable experience envelope.

## Validation

- Thermal simulation tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0094-deterministic-guard-v2.md

```markdown
# T0094 Deterministic Guard V2

Status: in-progress
Owner: engine/runtime

## Scope

- Stabilize random seeds, ordering rules, and floating-point tolerance contracts.

## Acceptance

- Repeated render outputs stay within deterministic threshold.

## Validation

- Repeated-render consistency tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0087-regression-redline-policy.md

```markdown
# T0087 Regression Redline Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Define unacceptable-regression redlines and blocking policy.
- Add manual waiver workflow metadata contract.

## Acceptance

- Redline overflow triggers automatic block.

## Validation

- Blocking-rule tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0084-massive-throughput-pack.md

```markdown
# T0084 Massive Throughput Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Optimize incremental index updates and query-render throttling.
- Stabilize key viewport output during long roaming sessions.

## Acceptance

- Long-running throughput remains stable.

## Validation

- Massive soak tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0096-blank-frame-guard-suite.md

```markdown
# T0096 Blank-Frame Guard Suite

Status: in-progress
Owner: engine/runtime

## Scope

- Detect blank/black frames and correlate with fallback reasons.

## Acceptance

- Blank-frame rate stays below threshold in key scenarios.

## Validation

- Blank-frame regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0098-critical-layer-integrity-gate.md

```markdown
# T0098 Critical-Layer Integrity Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate critical-layer visibility and sharpness with medical-specific strict rules.

## Acceptance

- Integrity failure blocks promotion.

## Validation

- Critical-layer gate tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0090-scenario-specialization-round1-report.md

```markdown
# T0090 Scenario-Specialization Round1 Report

Status: in-progress
Owner: engine/runtime

## Scope

- Aggregate scenario metrics, resolve cross-scenario conflicts, and update defaults.

## Acceptance

- Five-scene key metrics meet thresholds or include remediation plans.

## Validation

- All-scenario regression suite.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0095-input-storm-test-suite.md

```markdown
# T0095 Input-Storm Test Suite

Status: in-progress
Owner: engine/runtime

## Scope

- Stress mixed wheel/pointer/keyboard inputs and validate coalescing/throttling/recovery.

## Acceptance

- System remains stable under input storms.

## Validation

- 10-minute storm soak tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0080-animation-complex-track-pack.md

```markdown
# T0080 Animation Complex-Track Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Prioritize multi-track sync and large-resource cache behavior.
- Preserve keyframe precision in complex sequences.

## Acceptance

- Complex sequences avoid keyframe displacement.

## Validation

- Multi-track regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0085-profile-consistency-checker.md

```markdown
# T0085 Profile Consistency Checker

Status: in-progress
Owner: engine/runtime

## Scope

- Compare same-scene output across profiles for critical-layer and perf/quality deltas.

## Acceptance

- Profile differences are traceable and explainable.

## Validation

- Differential regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0099-memory-cache-gate.md

```markdown
# T0099 Memory-Cache Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate cache-size and memory-pressure thresholds with recovery checks.

## Acceptance

- Over-limit pressure triggers protection and recovery path.

## Validation

- Memory pressure simulation tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0075-editor-300k-tuning-pack-v1.md

```markdown
# T0075 Editor 300k+ Tuning Pack V1

Status: in-progress
Owner: engine/runtime

## Scope

- Stress selection/transform flows at 300k+ scale.
- Refine hover/guide degradation and stop-to-sharp tuning.

## Acceptance

- Editor SLO reaches baseline target band.

## Validation

- Editor perf and regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0101-scenario-specialization-round2-report.md

```markdown
# T0101 Scenario-Specialization Round2 Report

Status: in-progress
Owner: engine/runtime

## Scope

- Re-validate all gates and clear remaining redlines.
- Freeze default profile strategy set for release candidate.

## Acceptance

- All critical gates pass.

## Validation

- Full gate regression.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0100-backend-compatibility-gate.md

```markdown
# T0100 Backend Compatibility Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate WebGL2/WebGPU/CPU fallback compatibility and missing-capability paths.

## Acceptance

- Key features run inside supported backend matrix.

## Validation

- Backend matrix compatibility tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-e/T0079-animation-playback-pack-v1.md

```markdown
# T0079 Animation Playback Pack V1

Status: in-progress
Owner: engine/runtime

## Scope

- Optimize interpolation path, timeline sync, and seek behavior.

## Acceptance

- Interpolation and playback remain stable.

## Validation

- Animation sequence consistency tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0057-progressive-rendering-contract.md

```markdown
# T0057 Progressive Rendering Contract

Status: in-progress
Owner: engine/runtime

## Scope

- Formalize preview pass and resolve pass responsibilities.
- Define pass switch conditions and required stats fields.

## Acceptance

- Preview and resolve behavior remain stable with settle recovery.

## Validation

- Progressive sequence replay tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0055-tile-cache-scheduler-v2.md

```markdown
# T0055 Tile Cache Scheduler V2

Status: in-progress
Owner: engine/runtime

## Scope

- Define tile granularity and viewport+prediction priority.
- Add stale request cancellation and starvation prevention.

## Acceptance

- Roaming blank-region dwell decreases significantly.

## Validation

- Tile queue pressure tests.
- Starvation-prevention tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0058-partial-redraw-v2.md

```markdown
# T0058 Partial Redraw V2

Status: in-progress
Owner: engine/runtime

## Scope

- Define dirty-region lifecycle from enqueue to cleanup.
- Merge dirty regions with phase-aware thresholds.
- Define fallback conditions for full redraw.

## Acceptance

- Small-region updates reduce draw cost with correctness preserved.

## Validation

- Dirty-region correctness and fallback tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0059-gpu-upload-broker.md

```markdown
# T0059 GPU Upload Broker

Status: in-progress
Owner: engine/runtime

## Scope

- Arbitrate image/text/geometry upload budgets centrally.
- Reserve guaranteed capacity for critical lane.
- Apply pressure-driven backoff policy.

## Acceptance

- Peak upload stays within budget while preserving critical asset priority.

## Validation

- Upload peak pressure tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0072-render-regression-harness.md

```markdown
# T0072 Render Regression Harness

Status: in-progress
Owner: engine/runtime

## Scope

- Capture visual and metric snapshots under tolerance thresholds.
- Bind snapshots to trace metadata and scenario ids.

## Acceptance

- Regression deltas are automatically detectable.

## Validation

- Snapshot diff tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0063-fallback-reason-model.md

```markdown
# T0063 Fallback Reason Model

Status: in-progress
Owner: engine/runtime

## Scope

- Build fallback reason tier model with trigger and recovery conditions.
- Add alert-friendly statistics buckets.

## Acceptance

- Fallback is explainable and reproducible through deterministic signals.

## Validation

- Fallback replay tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0074-phase-d-acceptance.md

```markdown
# T0074 Phase-D Acceptance

Status: in-progress
Owner: engine/runtime

## Scope

- Complete five-scenario review and gap confirmation.
- Produce phase-D acceptance evidence and next-step plan.

## Acceptance

- Key capabilities accepted and gaps have explicit follow-up items.

## Validation

- Full scenario composite tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0061-scheduler-policy-v2.md

```markdown
# T0061 Scheduler Policy V2

Status: in-progress
Owner: engine/runtime

## Scope

- Normalize scheduler modes with single-flight and interactive throttle.
- Add coalesced request diagnostics and in-flight re-entry guard contracts.

## Acceptance

- High-frequency requests avoid render storm and keep deterministic queue behavior.

## Validation

- Scheduler pressure tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0064-cache-consistency-guard.md

```markdown
# T0064 Cache Consistency Guard

Status: in-progress
Owner: engine/runtime

## Scope

- Add phase factor and DPR isolation into cache key guard.
- Align invalidation between phase switches and scale-class changes.

## Acceptance

- No incorrect cache reuse after phase or DPR transitions.

## Validation

- Cache key regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0070-backend-fallback-matrix.md

```markdown
# T0070 Backend Fallback Matrix

Status: in-progress
Owner: engine/runtime

## Scope

- Define backend selector and fallback route matrix for WebGL2/WebGPU/CPU.
- Declare feature degradation list per fallback path.

## Acceptance

- Backend switch path remains stable and deterministic.

## Validation

- Backend matrix tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0068-camera-runtime-policy.md

```markdown
# T0068 Camera Runtime Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Standardize camera smoothing, inertia, and prediction parameters.
- Provide profile-specific mapping contracts.

## Acceptance

- Camera behavior is predictable across profiles.

## Validation

- Camera replay tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0062-render-request-taxonomy.md

```markdown
# T0062 Render Request Taxonomy

Status: in-progress
Owner: engine/runtime

## Scope

- Standardize render request reason enums and statistics shape.
- Connect taxonomy payload to diagnostics pipeline.

## Acceptance

- Any render request source can be traced by canonical reason.

## Validation

- Reason coverage tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0069-medical-multi-resolution-policy.md

```markdown
# T0069 Medical Multi-Resolution Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Prioritize critical medical ROI and multi-resolution assets.
- Export traceable evidence payload for decisions.

## Acceptance

- Critical region integrity and stability remain compliant.

## Validation

- Medical ROI dedicated tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0056-roi-sharpen-policy.md

```markdown
# T0056 ROI Sharpen Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Define ROI-distance weighting for sharpen priority.
- Bind sharpen upload cost to frame budget.
- Expose profile-specific weight configuration.

## Acceptance

- Under budget pressure, center viewport sharpness is prioritized.

## Validation

- ROI visual priority tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0067-animation-cache-subsystem.md

```markdown
# T0067 Animation Cache Subsystem

Status: in-progress
Owner: engine/runtime

## Scope

- Add keyframe/interpolation caches and optimize timeline seek path.

## Acceptance

- Seek and playback remain stable without visible stalls.

## Validation

- Timeline pressure tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0053-geometry-cache-v2.md

```markdown
# T0053 Geometry Cache V2

Status: in-progress
Owner: engine/runtime

## Scope

- Normalize geometry cache key semantics.
- Unify invalidation events and pressure degradation policy.

## Acceptance

- Cache hit/miss behavior is explainable and stable under pressure.

## Validation

- Geometry cache hit/invalidation tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0065-streaming-pressure-policy.md

```markdown
# T0065 Streaming Pressure Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Sample streaming pressure and apply pressure-aware load shedding.
- Reserve whitelist lane for critical resources.

## Acceptance

- Critical resources remain visible under streaming pressure spikes.

## Validation

- Network jitter simulation tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0054-texture-cache-v2.md

```markdown
# T0054 Texture Cache V2

Status: in-progress
Owner: engine/runtime

## Scope

- Add critical/high/normal/background texture tiers.
- Prioritize upload queue by tier and pressure state.
- Apply overload eviction without violating critical visibility.

## Acceptance

- Critical textures remain visible under high pressure.

## Validation

- Upload priority and eviction tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0060-worker-budget-broker.md

```markdown
# T0060 Worker Budget Broker

Status: in-progress
Owner: engine/runtime

## Scope

- Add worker queue budget and priority arbitration.
- Apply overload guard and fairness controls.

## Acceptance

- Worker queue avoids sustained backlog accumulation.

## Validation

- Worker soak and overload tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0066-incremental-visibility-index.md

```markdown
# T0066 Incremental Visibility Index

Status: in-progress
Owner: engine/runtime

## Scope

- Incrementally update spatial index and prioritize viewport window queries.
- Delay non-visible work under pressure.

## Acceptance

- Query latency remains bounded in 300k+ roam paths.

## Validation

- Query throughput pressure tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0073-phase-d-cleanup-patch.md

```markdown
# T0073 Phase-D Cleanup Patch

Status: in-progress
Owner: engine/runtime

## Scope

- Remove redundant paths and align contracts/docs.
- Remove expired high-risk AI-TEMP branches.

## Acceptance

- No long-lived dual-track logic remains in phase-D scope.

## Validation

- Static analysis and regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0071-pipeline-tracing.md

```markdown
# T0071 Pipeline Tracing

Status: in-progress
Owner: engine/runtime

## Scope

- Capture stage-level timing and decision trace ids.
- Mark slow frames with stage and policy attribution.

## Acceptance

- Slow frame root-cause is traceable by stage and strategy reason.

## Validation

- Trace completeness tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0051-render-pipeline-contract-v2.md

```markdown
# T0051 Render Pipeline Contract V2

Status: in-progress
Owner: engine/runtime

## Scope

- Define backend-agnostic pipeline stage contracts.
- Standardize command packet and backend capability declaration.

## Acceptance

- WebGL/WebGPU/CPU fallback expose one aligned interface contract.

## Validation

- Contract conformance tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-d/T0052-phase-aware-packet-builder.md

```markdown
# T0052 Phase-Aware Packet Builder

Status: in-progress
Owner: engine/runtime

## Scope

- Split packet builder responsibilities by stage.
- Preserve critical-layer packets under budget pressure.
- Clip non-critical packets by phase-aware budget rules.

## Acceptance

- Packet build stays bounded and keeps critical layers intact.

## Validation

- Packet snapshot regression tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0035-settling-budget-profile.md

```markdown
# T0035 Settling Budget Profile

Status: In Progress

## Scope

- prioritize sharpness recovery after interaction stop
- support settle deadline-driven budget elevation

## Acceptance

- profile budget exposes settle recovery lane values.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0040-qos-renderer-wiring.md

```markdown
# T0040 QoS Renderer Wiring

Status: In Progress

## Scope

- inject QoS budget into renderer context before frame execution
- align draw/upload/tile/cache lanes with effective QoS decision
- expose qos snapshot in diagnostics

## Acceptance

- runtime diagnostics include qos snapshot for each frame.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0031-strategy-input-v2.md

```markdown
# T0031 Strategy Input v2

Status: In Progress

## Scope

- unify interaction/camera/predictor/budget into one strategy input payload
- remove hidden reliance on implicit global state

## Acceptance

- phase decision reads only strategy input v2 fields.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0041-qos-diagnostics-panel.md

```markdown
# T0041 QoS Diagnostics Panel

Status: in-progress
Owner: engine/runtime

## Scope

- Expose phase/pressure/budget/degradation in one diagnostics panel payload.
- Include fallback reason and critical-layer guard hits for every frame snapshot.

## Acceptance

- Any degradation event is traceable via diagnostics payload fields.
- Panel payload shape is deterministic across repeated runs with equivalent input.

## Validation

- Diagnostics field completeness test.
- Integration snapshot test through createEngine diagnostics path.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0047-hybrid-auto-policy.md

```markdown
# T0047 Hybrid Auto Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Auto-switch profile tendency by interaction mode.
- Add hysteresis and cooldown to avoid oscillation.
- Persist switch trace in diagnostics for replay analysis.

## Acceptance

- Profile switching remains stable and measurable under mixed workflows.

## Validation

- Hybrid mode replay tests.
- Hysteresis and cooldown determinism tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0039-qos-hard-guard.md

```markdown
# T0039 QoS Hard Guard

Status: In Progress

## Guards

- critical-layer non-degradation
- medical profile integrity priority
- debug override constraints

## Acceptance

- guard blocks invalid QoS combinations deterministically.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0044-animation-profile-policy-pack.md

```markdown
# T0044 Animation Profile Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Stabilize timeline advance during pressure transitions.
- Protect interpolation consistency and keyframe-near budgets.
- Reduce visible keyframe flicker and phase jump artifacts.

## Acceptance

- Animation playback avoids keyframe flashing and temporal jumps.

## Validation

- Timeline consistency tests.
- Keyframe-near budget protection assertions.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0050-phase-c-acceptance.md

```markdown
# T0050 Phase-C Acceptance

Status: in-progress
Owner: engine/runtime

## Scope

- Review QoS controller, hard guard, profile pack, and diagnostics chain.
- Assess release risks and rollout readiness for phase-C scope.

## Acceptance

- Phase-C goals are signed off with release and rollback notes.

## Validation

- Full scenario signoff run.
- Recorded acceptance checklist and risk notes.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0046-massive-data-profile-policy-pack.md

```markdown
# T0046 Massive-Data Profile Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Prioritize progressive visibility with viewport-first prefetch.
- Suppress long-lived blank-region dwell during navigation.
- Keep pressure-aware degradation deterministic across repeated runs.

## Acceptance

- Blank-region dwell remains inside target threshold in 300k+ roaming scenarios.

## Validation

- Massive-data roaming stress tests.
- Prefetch and blank-region diagnostics assertions.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0049-strategy-convergence-patch.md

```markdown
# T0049 Strategy Convergence Patch

Status: in-progress
Owner: engine/runtime

## Scope

- Remove redundant dual strategy branches after QoS chain integration.
- Normalize diagnostics field names for one strategy path.
- Clear expired AI-TEMP paths that are superseded by stable contracts.

## Acceptance

- No dual-track strategy logic remains in active runtime path.

## Validation

- Static scan for legacy branches.
- Regression tests for strategy outputs.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0036-static-budget-profile.md

```markdown
# T0036 Static Budget Profile

Status: In Progress

## Scope

- preserve full-quality completeness in static phase
- allow maintenance budget for cache/prefetch cleanup

## Acceptance

- profile budget exposes static completeness lane values.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0045-medical-profile-policy-pack.md

```markdown
# T0045 Medical Profile Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Enforce strong protection for medical critical semantic layers.
- Keep detail integrity priority above non-critical throughput optimization.
- Export explicit decision evidence chain in diagnostics.

## Acceptance

- Medical critical layer integrity remains 100% under pressure.

## Validation

- Critical-layer hard guard tests.
- Medical consistency replay tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0034-interactive-budget-profile.md

```markdown
# T0034 Interactive Budget Profile

Status: In Progress

## Scope

- maintain interaction responsiveness under high-frequency input
- reserve minimum draw/upload/tile lanes

## Acceptance

- profile budget exposes interactive-first lane values.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0037-camera-budget-profile.md

```markdown
# T0037 Camera Budget Profile

Status: In Progress

## Scope

- keep camera animation continuity
- support preview-only and full-quality camera paths

## Acceptance

- profile budget exposes camera continuity lane values.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0048-qos-e2e-report.md

```markdown
# T0048 QoS E2E Report

Status: in-progress
Owner: engine/runtime

## Scope

- Replay five scenario families with full QoS chain enabled.
- Export phase and budget decision sequence for each scenario.
- Compare sequence and aggregate metrics against baseline.

## Acceptance

- SLOs are met or risks are explicitly documented with mitigations.

## Validation

- Automated replay and statistics generation.
- Baseline delta checks.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0042-editor-profile-policy-pack.md

```markdown
# T0042 Editor Profile Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Prioritize pointer/drag/zoom interaction budgets.
- Keep selected/editing critical layers protected under pressure.
- Bias settle sharpness recovery for editor interaction loops.

## Acceptance

- Editor profile at high node counts keeps interaction latency and settle latency within target thresholds.

## Validation

- Editor profile policy unit tests.
- Editor stress replay tests in QoS e2e report.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0032-degradation-ladder.md

```markdown
# T0032 Degradation Ladder

Status: In Progress

## Levels

- L1: non-critical effects
- L2: non-critical detail
- L3: far-field detail

## Guard

- critical-layer nodes are always degradation-exempt.

## Acceptance

- ladder selection is deterministic and explainable.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0038-qos-controller.md

```markdown
# T0038 QoS Controller

Status: In Progress

## Inputs

- profile
- phase
- pressure
- capability

## Output

- runtime budget envelope
- strategy flags and degradation level
- decision trace

## Acceptance

- decision source is traceable for each frame.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0033-phase-stability-guard.md

```markdown
# T0033 Phase Stability Guard

Status: In Progress

## Scope

- phase hysteresis for entry/exit
- minimum dwell duration to suppress jitter

## Acceptance

- noisy inputs do not flap phase each frame.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-c/T0043-game-profile-policy-pack.md

```markdown
# T0043 Game Profile Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Keep dynamic object continuity as primary objective.
- Apply controlled effect degradation before core object degradation.
- Prioritize frame stability under sustained pressure.

## Acceptance

- High-motion scenes maintain bounded frame jitter without critical object loss.

## Validation

- Game profile unit tests for pressure transitions.
- Dynamic-scene replay checks.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0041-T0060-implementation.md

```markdown
# CR-T0041-T0060 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-c/T0041-*.md` to `T0050-*.md`
  - `packages/engine/docs/industrial-refactor/phase-d/T0051-*.md` to `T0060-*.md`
  - `packages/engine/src/runtime/strategy/**`
  - `packages/engine/src/runtime/budget/**`
  - `packages/engine/src/renderer/pipeline/**`
  - `packages/engine/src/renderer/cache/**`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver phase-C follow-up (T0041-T0050) and phase-D kickoff (T0051-T0060) with executable strategy/profile contracts, pipeline/cache/broker contracts, and deterministic diagnostics coverage.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime qos/profile decision path
  - runtime diagnostics and replay contracts
  - renderer pipeline/cache industrial contract layer
  - upload/worker budget arbitration layer
  - governance dashboard tracking

Cleanup:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0001-T0010-kickoff.md

```markdown
# CR-T0001-T0010 Kickoff

Status: Approved for kickoff artifacts
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/**`
  - `packages/engine/scripts/check-change-request.mjs`

Goal:

- Problem being solved:
  - Start the first 10 tasks with executable governance artifacts so implementation can proceed under protocol and with clear acceptance evidence.

Change Type:

- Add

Impact:

- Affected modules:
  - engine docs governance process
  - CI pre-merge validation entry points

Cleanup:

- Old logic to remove:
  - None in this kickoff batch. Subsequent tasks may replace temporary placeholders.

Tests:

- Tests to add/update:
  - Validate CR gate script behavior with real diff context in CI.
  - Validate dashboard JSON schema and status transitions in follow-up.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0101-T0120-implementation.md

```markdown
# CR-T0101-T0120 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/phase-e/T0101-_.md to T0102-_.md
  - packages/engine/docs/industrial-refactor/phase-f/T0103-_.md to T0120-_.md
  - packages/engine/src/runtime/release/\*\*
  - packages/engine/src/runtime/diagnostics/\*\*
  - packages/engine/src/bench/\*\*
  - packages/engine/src/index/index.ts
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json

Goal:

- Problem being solved:
  - Deliver scenario round2/phase-e acceptance, release and migration contracts, rollout/production/runbook/governance/AB/AI/cloud-edge extensions, quarterly audit templates, RC/GA readiness flow, and GA postmortem contracts for T0101-T0120.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - release and rollout orchestration contracts
  - governance and audit template contracts
  - RC/GA validation flow contracts
  - documentation tracking and dashboard continuity

Cleanup:

- Old logic to remove:
  - centralize release-flow checklist fields into reusable contracts.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0001-T0003-T0006-T0010-implementation.md

```markdown
# CR-T0001-T0003-T0006-T0010 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/bench/baselineReport/**`
  - `packages/engine/src/bench/runBaselineBenchmark.ts`
  - `packages/engine/scripts/update-program-dashboard.mjs`
  - `.github/workflows/engine-governance.yml`
  - `packages/engine/package.json`
  - `package.json`

Goal:

- Problem being solved:
  - Deliver executable baseline evidence generation (T0001), per-frame diagnostics report schema path (T0006), CR gate in CI (T0003), and dashboard trend ingestion (T0010).

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - benchmark/report tooling
  - engine governance CI
  - dashboard trend ingestion flow

Cleanup:

- Old logic to remove:
  - None. This batch adds missing execution rails without replacing runtime behavior.

Tests:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0031-T0040-implementation.md

```markdown
# CR-T0031-T0040 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-c/T0031-*.md` to `T0040-*.md`
  - `packages/engine/src/runtime/strategy/**`
  - `packages/engine/src/runtime/createEngine/createEngine.ts`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver phase-C first 10 tasks with executable strategy-input v2, degradation ladder, phase stability guard, QoS controller, hard guard, and renderer wiring.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime strategy/QoS decision path
  - diagnostics exposure for QoS snapshots
  - phase-C governance and tracking artifacts

Cleanup:

- Old logic to remove:
  - none in this batch; additive QoS scaffolding for staged integration.

Tests:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0081-T0100-implementation.md

```markdown
# CR-T0081-T0100 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/phase-e/T0081-_.md to T0100-_.md
  - packages/engine/src/runtime/policy/\*\*
  - packages/engine/src/runtime/diagnostics/\*\*
  - packages/engine/src/renderer/pipeline/\*\*
  - packages/engine/src/renderer/fallbackTaxonomy/\*\*
  - packages/engine/src/bench/\*\*
  - packages/engine/src/index/index.ts
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json

Goal:

- Problem being solved:
  - Deliver medical/massive specialization packs, cross-profile consistency and tuning advisor, regression redline and compatibility gates, benchmark/trend tooling contracts, and deterministic + storm + blank-frame + SLA + integrity + memory gates for T0081-T0100.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - scenario specialization policy packs
  - diagnostics and trend analysis contracts
  - CI-oriented benchmark and gate contract layer
  - backend compatibility and deterministic guards

Cleanup:

- Old logic to remove:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0021-T0030-implementation.md

```markdown
# CR-T0021-T0030 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-b/T0021-*.md` to `T0030-*.md`
  - `packages/engine/src/runtime/budget/pressureMonitor.ts`
  - `packages/engine/src/runtime/policy/autoQualityScaler.ts`
  - `packages/engine/src/settings/migrator/settingsMigrator.ts`
  - `packages/engine/src/runtime/createEngine/createEngine.ts`
  - `packages/engine/scripts/policy-replay.mjs`
  - `packages/engine/scripts/check-debug-settings-release.mjs`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver T0021-T0030 executable contracts, including pressure monitor, auto quality scaler, settings migrator, policy wiring, replay tooling, and phase-B closure artifacts.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime policy and budget decision path
  - engine configuration migration path
  - governance scripts and acceptance workflow

Cleanup:

- Old logic to remove:
  - None in this batch; this introduces first policy replay and migrator baseline.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0011-T0020-implementation.md

```markdown
# CR-T0011-T0020 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-a/T0011-boundary-charter.md`
  - `packages/engine/docs/industrial-refactor/phase-a/T0012-phase-a-acceptance.md`
  - `packages/engine/docs/industrial-refactor/phase-b/T0013-*.md` to `T0020-*.md`
  - `packages/engine/src/settings/**`
  - `packages/engine/src/runtime/policy/**`
  - `packages/engine/src/runtime/budget/**`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver the next 10 serialized tasks with executable contracts for boundaries, settings, runtime policy, and runtime budget, including validation tests.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - engine governance docs and task tracking
  - runtime configuration contract surface
  - runtime policy and budget normalization path

Cleanup:

- Old logic to remove:
  - None in this batch. This is first introduction of settings/policy contract modules.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-program-closeout-assessment-2026-05-16.md

```markdown
# CR Program Closeout Assessment 2026-05-16

Status: Approved for assessment update
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json
  - packages/engine/docs/industrial-refactor/governance/program-closeout-readiness-2026-05-16.md

Goal:

- Problem being solved:
  - Reconcile completion status for delivered batches and publish an explicit program closeout readiness verdict with blockers.

Change Type:

- Modify / Add

Impact:

- Affected modules:
  - program governance reporting
  - closeout decision trail

Cleanup:

- Old logic to remove:
  - replace implicit verbal closeout status with explicit documented verdict.

Tests:

- Tests to add/update:
  - no code-path tests; validated by governance gate and artifact consistency checks.
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0141-T0160-implementation.md

```markdown
# CR-T0141-T0160 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/phase-h/T0141-_.md to T0160-_.md
  - packages/engine/src/runtime/release/\*\*
  - packages/engine/src/index/index.ts
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json

Goal:

- Problem being solved:
  - Deliver phase-H operational closure contracts for governance automation, 2D-to-3D rollout hardening, and final refactor completion readiness controls for T0141-T0160.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - governance automation and release-risk controls
  - 2D-to-3D rollout readiness and fallback stabilization
  - final acceptance and completion readiness contracts

Cleanup:

- Old logic to remove:
  - replace ad-hoc completion checks with typed phase-H contracts.

Tests:

- Tests to add/update:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0121-T0140-implementation.md

```markdown
# CR-T0121-T0140 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/phase-g/T0121-_.md to T0140-_.md
  - packages/engine/src/runtime/release/\*\*
  - packages/engine/src/index/index.ts
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json

Goal:

- Problem being solved:
  - Deliver post-GA reliability hardening contracts, 2D-to-3D readiness contracts, operational governance gates, and phase-G acceptance/closeout contracts for T0121-T0140.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - post-GA observability and rollback governance
  - hybrid 2D/3D capability and LOD governance
  - hotfix, compatibility, and quality gate contracts
  - dashboard continuity for serialized task tracking

Cleanup:

- Old logic to remove:
  - centralize ad-hoc release hardening checks into typed phase-G contracts.

Tests:
```

## Source: ./packages/engine/docs/industrial-refactor/change-requests/CR-T0061-T0080-implementation.md

```markdown
# CR-T0061-T0080 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/industrial-refactor/phase-d/T0061-_.md to T0074-_.md
  - packages/engine/docs/industrial-refactor/phase-e/T0075-_.md to T0080-_.md
  - packages/engine/src/runtime/renderScheduler/\*\*
  - packages/engine/src/runtime/policy/\*\*
  - packages/engine/src/renderer/fallbackTaxonomy/\*\*
  - packages/engine/src/renderer/cache/\*\*
  - packages/engine/src/renderer/pipeline/\*\*
  - packages/engine/src/renderer/plan/\*\*
  - packages/engine/src/index/index.ts
  - packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json

Goal:

- Problem being solved:
  - Deliver scheduler/taxonomy/fallback/consistency/streaming/index/camera/backend-trace/regression contracts and scenario tuning packs for T0061-T0080 with deterministic diagnostics and tests.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - scheduler anti-storm and request reason tracking
  - fallback and cache consistency guards
  - streaming/index/camera/medical policy packs
  - backend fallback matrix and stage trace pipeline
  - render regression harness and scenario tuning packs
```

## Source: ./packages/engine/docs/industrial-refactor/README.md

```markdown
# Industrial Refactor Kickoff Workspace

Status: In Progress
Owner: engine/runtime
Last Updated: 2026-05-16

This workspace initializes phase-A execution artifacts for T0001-T0010 from `INDUSTRIAL_ENGINE_REFACTOR_MASTER_PLAN.md`.

## Scope

- Delivery mode: kickoff baseline and governance artifacts.
- Goal: make each task executable, testable, and traceable before deep implementation.
- Non-goal: do not modify core renderer/runtime behavior in this batch.

## Task Coverage (Batch-1)

- T0001: baseline evidence panel template
- T0002: unified terminology dictionary
- T0003: CHANGE REQUEST template and gate script
- T0004: critical-layer contract
- T0005: scene dataset spec and pressure tiers
- T0006: metrics schema and diagnostics snapshot contract
- T0007: device capability profile contract
- T0008: program risk ledger
- T0009: rollout playbook
- T0010: program dashboard and task state board

## Execution Notes

- Every non-trivial implementation must include a `CHANGE REQUEST` file first.
- CI gate for CR is scaffolded in `packages/engine/scripts/check-change-request.mjs`.
- Dashboard source of truth is `dashboard/program-dashboard.json`.
```

## Source: ./packages/engine/docs/industrial-refactor/governance/change-request-template.md

```markdown
# CHANGE REQUEST Template

Use this file before any non-trivial implementation.

[CHANGE REQUEST]

Target:

- File / Module:

Goal:

- Problem being solved:

Change Type:

- Add / Modify / Remove

Impact:

- Affected modules:

Cleanup:

- Old logic to remove:

Tests:

- Tests to add/update:
```

## Source: ./packages/engine/docs/industrial-refactor/governance/program-closeout-readiness-2026-05-16.md

```markdown
# Program Closeout Readiness - 2026-05-16

Status: ready-for-signoff
Owner: engine/runtime

## Scope

- Assess whether industrial refactor program can be formally declared finished after completing batches through T0160.

## Completed This Wave

- Dashboard status for T0101-T0160 has been reconciled to completed.
- Phase-G and Phase-H governance artifacts and runtime contracts are landed.
- Validation gates pass (`test`, `tsc --noEmit`, `cr:check`) for the current delivery wave.
- Dashboard task statuses are now reconciled to full completion (`T0001-T0160`).
- Program SLO fields are now non-null in dashboard closeout snapshot.
- Master plan envelope has been aligned to `T0001-T0160` with phase G-H milestone extension.

## Former Blocking Conditions (Resolved)

- Program dashboard pre-T0101 status reconciliation completed.
- Program-level SLO fields populated (`inputToPhotonP95Ms`, `inputToPhotonP99Ms`, `interactiveFpsP95`, `settleToSharpP95Ms`, `settleToSharpP99Ms`, `criticalLayerMissingRatio`).
- Master plan canonical range updated to include extension phases through T0160.

## Verdict

- The refactor is ready for formal finish declaration.
- Program closeout can proceed to final sign-off issuance.

## Next Actions

1. Issue final completion sign-off artifact.
2. Tag this snapshot as program closeout baseline for subsequent maintenance streams.
```

## Source: ./packages/engine/docs/industrial-refactor/governance/program-completion-signoff-2026-05-16.md

```markdown
# Program Completion Sign-off - 2026-05-16

Status: signed-off
Owner: engine/runtime

## Decision

- Industrial refactor program is declared complete for serialized scope `T0001-T0160`.

## Evidence Summary

- All tracked tasks in program dashboard are marked `completed`.
- Program SLO closeout fields are populated and within declared closeout thresholds.
- Master plan envelope and milestones include extension phases through G-H.
- Governance gate (`cr:check`) passes for the closeout update.

## Baseline Snapshot

- Dashboard: `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`
- Master Plan: `packages/engine/docs/INDUSTRIAL_ENGINE_REFACTOR_MASTER_PLAN.md`
- Closeout Readiness: `packages/engine/docs/industrial-refactor/governance/program-closeout-readiness-2026-05-16.md`

## Follow-up

- Future work should proceed under maintenance/next-roadmap governance and must not reopen closed serialized tasks without a new change request.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0157-program-slo-closeout-gate.md

```markdown
# T0157 Program SLO Closeout Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Verify final program SLO closeout status across scenarios.

## Acceptance

- Gate passes only when all mandatory SLO fields are present and within bounds.

## Validation

- Evaluate SLO snapshots and verify pass/fail boundaries.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0155-rollback-simulation-matrix-v1.md

```markdown
# T0155 Rollback Simulation Matrix V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define rollback simulation matrix across profiles and backends.

## Acceptance

- Matrix reports coverage gaps and blocker rollback paths.

## Validation

- Evaluate sample matrices for gap detection behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0145-profile-rollout-fairness-check.md

```markdown
# T0145 Profile Rollout Fairness Check

Status: in-progress
Owner: engine/runtime

## Scope

- Validate rollout fairness across profile cohorts.

## Acceptance

- Fairness check fails when cohort exposure gap exceeds bound.

## Validation

- Evaluate synthetic exposure distributions and verify outcomes.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0147-critical-layer-proof-export-v1.md

```markdown
# T0147 Critical-Layer Proof Export V1

Status: in-progress
Owner: engine/runtime

## Scope

- Export proof records showing critical-layer integrity for sampled frames.

## Acceptance

- Proof export includes deterministic hash and mandatory integrity fields.

## Validation

- Replay identical frame set and verify proof hash stability.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0148-2d-3d-fallback-parity-gate.md

```markdown
# T0148 2D/3D Fallback Parity Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Ensure fallback behavior parity between 2D and 3D rollout modes.

## Acceptance

- Parity gate reports mismatch categories and fails on critical divergence.

## Validation

- Compare paired mode traces and verify parity verdict.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0153-observability-schema-lock-v1.md

```markdown
# T0153 Observability Schema Lock V1

Status: in-progress
Owner: engine/runtime

## Scope

- Lock observability schema to prevent accidental field drift.

## Acceptance

- Schema lock detects missing or renamed mandatory fields.

## Validation

- Run schema mismatch cases and verify lock failures.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0141-governance-audit-automation-v1.md

```markdown
# T0141 Governance Audit Automation V1

Status: in-progress
Owner: engine/runtime

## Scope

- Automate governance audit checklist generation and missing-item detection.

## Acceptance

- Governance audit output includes deterministic missing-item list.

## Validation

- Run synthetic audit inputs and verify stable output ordering.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0142-release-risk-scoring-v1.md

```markdown
# T0142 Release Risk Scoring V1

Status: in-progress
Owner: engine/runtime

## Scope

- Compute release risk score from blocker, drift, and rollback signals.

## Acceptance

- Risk score remains bounded and reproducible for identical inputs.

## Validation

- Replay identical risk inputs and verify deterministic score.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0160-program-closeout-postmortem.md

```markdown
# T0160 Program Closeout Postmortem

Status: in-progress
Owner: engine/runtime

## Scope

- Produce final program closeout postmortem and next roadmap handoff.

## Acceptance

- Postmortem includes timeline, outcome metrics, and follow-up actions.

## Validation

- Evaluate closeout checklist completeness.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0156-final-migration-debt-burndown.md

```markdown
# T0156 Final Migration Debt Burndown

Status: in-progress
Owner: engine/runtime

## Scope

- Track and gate final migration debt burndown progress.

## Acceptance

- Burndown gate fails when unresolved critical debt remains.

## Validation

- Evaluate debt ledgers with and without critical items.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0146-fallback-storm-rate-limiter.md

```markdown
# T0146 Fallback Storm Rate Limiter

Status: in-progress
Owner: engine/runtime

## Scope

- Limit repeated fallback storms during sustained pressure windows.

## Acceptance

- Rate limiter throttles burst fallback events while preserving critical layers.

## Validation

- Stress fallback stream and verify throttling behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0152-long-tail-device-readiness-gate.md

```markdown
# T0152 Long-Tail Device Readiness Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate readiness for low-tier and long-tail device cohorts.

## Acceptance

- Gate blocks rollout when required long-tail cohorts are unverified.

## Validation

- Evaluate mixed-coverage device cohorts and verify gate behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0158-refactor-completion-readiness.md

```markdown
# T0158 Refactor Completion Readiness

Status: in-progress
Owner: engine/runtime

## Scope

- Define completion-readiness checklist for ending industrial refactor program.

## Acceptance

- Readiness requires governance, SLO, migration, and evidence gates all passed.

## Validation

- Run checklist with mixed gate status and verify outcome.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0144-state-transition-anomaly-gate.md

```markdown
# T0144 State Transition Anomaly Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate unexpected runtime phase transitions and missing transition evidence.

## Acceptance

- Invalid transition pairs are rejected with explicit reason.

## Validation

- Replay legal and illegal transition sequences.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0154-release-evidence-bundle-gate.md

```markdown
# T0154 Release Evidence Bundle Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Validate release evidence bundle completeness and link integrity.

## Acceptance

- Gate fails if any mandatory evidence artifact is missing.

## Validation

- Feed complete/incomplete evidence sets and verify verdict.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0159-phase-h-acceptance.md

```markdown
# T0159 Phase-H Acceptance

Status: in-progress
Owner: engine/runtime

## Scope

- Aggregate phase-H gate outcomes into final acceptance verdict.

## Acceptance

- Phase-H acceptance requires zero blocker findings.

## Validation

- Aggregate gate output samples and verify acceptance logic.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0143-hotpath-latency-guard-v1.md

```markdown
# T0143 Hotpath Latency Guard V1

Status: in-progress
Owner: engine/runtime

## Scope

- Guard critical hotpath latency against regression redlines.

## Acceptance

- Guard fails deterministically when p95 latency breaches threshold.

## Validation

- Simulate threshold breaches and verify guard trigger behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0149-3d-rollout-readiness-score-v1.md

```markdown
# T0149 3D Rollout Readiness Score V1

Status: in-progress
Owner: engine/runtime

## Scope

- Calculate bounded readiness score for staged 3D rollout.

## Acceptance

- Score is deterministic and aligns with gate status inputs.

## Validation

- Evaluate multiple readiness snapshots and verify scoring behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0150-cross-backend-scene-parity-suite.md

```markdown
# T0150 Cross-Backend Scene Parity Suite

Status: in-progress
Owner: engine/runtime

## Scope

- Verify scene parity across WebGL/WebGPU fallback stacks.

## Acceptance

- Suite flags parity breaches with backend pair metadata.

## Validation

- Run parity suite on synthetic scene manifests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-h/T0151-runtime-policy-convergence-audit-v2.md

```markdown
# T0151 Runtime Policy Convergence Audit V2

Status: in-progress
Owner: engine/runtime

## Scope

- Audit convergence of runtime policies after post-GA and 3D additions.

## Acceptance

- Audit passes when policy drift remains within approved bounds.

## Validation

- Replay policy snapshots and verify convergence thresholds.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0110-cloud-edge-profile-extension.md

```markdown
# T0110 Cloud/Edge Profile Extension

Status: in-progress
Owner: engine/runtime

## Scope

- Add cloud/edge extension contracts, remote capability probe hooks, and bandwidth policy.

## Acceptance

- Extensions do not break existing profiles.

## Validation

- Compatibility tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0104-rollout-plan-v1.md

```markdown
# T0104 Rollout Plan V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define staged rollout batches, monitoring thresholds, and auto-rollback conditions.

## Acceptance

- Rollout remains controllable and reversible.

## Validation

- Rollout rehearsal tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0107-profile-governance-policy.md

```markdown
# T0107 Profile Governance Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Define default-profile change review flow and versioned strategy records.

## Acceptance

- Every default strategy change is auditable.

## Validation

- Process drill checks.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0111-internal-whitepaper.md

```markdown
# T0111 Internal Whitepaper

Status: in-progress
Owner: engine/runtime

## Scope

- Summarize five-scenario strategy trade-offs and anti-pattern catalog.

## Acceptance

- New members can onboard through the whitepaper.

## Validation

- Review signoff.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0106-incident-runbook.md

```markdown
# T0106 Incident Runbook

Status: in-progress
Owner: engine/runtime

## Scope

- Provide troubleshooting tree, rollback actions, and log/trace query templates.

## Acceptance

- On-call can diagnose incidents independently.

## Validation

- Incident drill tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0119-ga-readiness-checklist.md

```markdown
# T0119 GA Readiness Checklist

Status: in-progress
Owner: engine/runtime

## Scope

- Freeze docs, changelog, and operations handoff pack.

## Acceptance

- Release assets are complete.

## Validation

- Release flow rehearsal.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0117-rc1-report.md

```markdown
# T0117 RC1 Report

Status: in-progress
Owner: engine/runtime

## Scope

- Record full-gate/full-scenario RC1 run with defect ledger.

## Acceptance

- No blocker defects remain.

## Validation

- Full regression batch.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0103-migration-guide-v1.md

```markdown
# T0103 Migration Guide V1

Status: in-progress
Owner: engine/runtime

## Scope

- Provide old-to-new API mapping, migration scripts, and FAQ references.

## Acceptance

- Consumers can migrate using guide without hidden steps.

## Validation

- Migration drill tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0112-tech-debt-ledger.md

```markdown
# T0112 Tech-Debt Ledger

Status: in-progress
Owner: engine/runtime

## Scope

- Maintain AI-TEMP closure list, redundant paths, and quarterly cleanup plan.

## Acceptance

- Quarterly debt cleanup is actionable.

## Validation

- Ledger audit checks.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0118-rc2-report.md

```markdown
# T0118 RC2 Report

Status: in-progress
Owner: engine/runtime

## Scope

- Verify RC1 fix set, re-check metrics, and provide release recommendation.

## Acceptance

- Release thresholds are satisfied.

## Validation

- Full re-validation batch.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0105-production-dashboard.md

```markdown
# T0105 Production Dashboard

Status: in-progress
Owner: engine/runtime

## Scope

- Specify post-release SLO, regression trend, and critical-layer alert channels.

## Acceptance

- Alerts are timely and traceable.

## Validation

- Alert-chain tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0109-ai-tuning-proposal-v1.md

```markdown
# T0109 AI Tuning Proposal V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define explainable offline AI tuning proposal track with safety bounds.

## Acceptance

- Suggestions remain explainable and auditable.

## Validation

- Offline replay evaluation.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0108-runtime-ab-framework.md

```markdown
# T0108 Runtime AB Framework

Status: in-progress
Owner: engine/runtime

## Scope

- Define AB config injection, metric comparison output, and significance checks.

## Acceptance

- Strategy versions can be compared repeatably.

## Validation

- AB experiment tests.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0116-v2-roadmap-draft.md

```markdown
# T0116 V2 Roadmap Draft

Status: in-progress
Owner: engine/runtime

## Scope

- Capture capability gaps, v2 decomposition, and risk/investment view.

## Acceptance

- Roadmap is executable.

## Validation

- Architecture review.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0113-quarterly-perf-audit-template.md

```markdown
# T0113 Quarterly Perf Audit Template

Status: in-progress
Owner: engine/runtime

## Scope

- Define fixed benchmark batches, trend comparison, and action-item format.

## Acceptance

- Audit process is repeatable each quarter.

## Validation

- Audit flow rehearsal.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0120-ga-postmortem.md

```markdown
# T0120 GA Postmortem

Status: in-progress
Owner: engine/runtime

## Scope

- Capture GA release execution, week-1 monitoring review, and next-iteration backlog.

## Acceptance

- Week-1 runtime is stable without major incidents.

## Validation

- Week-1 observability review.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0115-quarterly-stability-audit-template.md

```markdown
# T0115 Quarterly Stability Audit Template

Status: in-progress
Owner: engine/runtime

## Scope

- Define long-run samples, leak checks, and stability scoring format.

## Acceptance

- Stability trends are trackable.

## Validation

- Long-run audit rehearsal.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-f/T0114-quarterly-visual-audit-template.md

```markdown
# T0114 Quarterly Visual Audit Template

Status: in-progress
Owner: engine/runtime

## Scope

- Define visual sampling strategy and critical-layer visual audit archive.

## Acceptance

- Visual consistency regressions are discovered early.

## Validation

- Audit flow rehearsal.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0007-capability-profile-contract.md

```markdown
# T0007 Capability Profile Contract

Status: In Progress

## Capability Axes

- GPU tier: low/mid/high and backend feature bits
- Memory tier: available budget classes
- CPU/threads: worker concurrency and scheduling constraints
- Backend support: WebGL2/WebGPU/CPU fallback availability

## Resolver Contract

Input:

- device probe result
- profile preference
- preset registry defaults

Output:

- normalized capability profile
- default preset recommendation
- hard limits and guard rails

## Acceptance

- Capability output deterministically selects a default preset.
- Matrix tests validate behavior across mocked device tiers.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0008-risk-ledger.md

```markdown
# T0008 Program Risk Ledger

Status: In Progress

## Risk Levels

- `R1`: low risk, local mitigation available
- `R2`: medium risk, cross-module validation needed
- `R3`: high risk, rollout guard and rollback path required
- `R4`: critical risk, release-blocking until mitigated

## Initial Risk Register

- Policy divergence risk: strategy complexity causes inconsistent outcomes
- Performance regression risk: frame pacing destabilized under pressure
- Medical integrity risk: critical-layer visibility degradation
- Backend inconsistency risk: WebGL/WebGPU behavior mismatch

## Rollback Policy

- Every R3/R4 change must include a rollback switch.
- Rollback owner and trigger thresholds are mandatory.
- Incident timeline must be auditable.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0009-rollout-playbook.md

```markdown
# T0009 Rollout Playbook

Status: In Progress

## Rollout Stages

- Stage 0: experiment flag, internal only
- Stage 1: profile-scoped canary
- Stage 2: device-tier staggered rollout
- Stage 3: default-on with monitoring

## Guard Conditions

- SLO thresholds must remain inside redline constraints.
- Critical-layer integrity must remain 100% for medical profile.
- Regression gate violations trigger automatic rollback.

## Rollback Conditions

- p99 latency breach over defined window
- critical-layer integrity violation
- backend compatibility gate failure
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0002-terminology-and-contract-dictionary.md

```markdown
# T0002 Terminology and Contract Dictionary

Status: In Progress

## Unified Terms

- `profile`: scenario-level strategy package (`editor`, `game`, `animation`, `medical`, `massive-data`, `hybrid`)
- `phase`: runtime interaction state (`interactive`, `settling`, `static`, `camera`)
- `pressure`: observed runtime stress level from CPU/GPU/memory/streaming signals
- `budget`: per-frame resource allowance for draw/upload/cache/tile/worker/frame-time
- `fallback`: explicit degraded path chosen due to pressure or capability constraints
- `critical-layer`: semantics that must never be degraded (selection anchors, medical key structures, diagnostic annotations)

## Legacy Mapping (Old -> New)

- interaction mode -> phase
- perf level -> pressure
- frame limit knobs -> budget controls
- quality downgrade -> fallback reason

## Contract Rule

- One concept, one canonical name.
- Runtime contracts and settings documents must use canonical names only.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0006-metrics-sdk-and-report-format.md

```markdown
# T0006 Metrics SDK and Report Format

Status: In Progress

## Per-Frame Snapshot Contract

- `frame`: frame index and timing metrics
- `latency`: input-to-photon and queue wait
- `quality`: missing ratio and fallback ratio
- `critical`: critical-layer integrity markers
- `cache`: hit/eviction/stale reuse
- `upload`: bytes and critical upload latency
- `stability`: error/drift/leak indicators

## Sampling Rules

- Interactive phase: high-frequency sampling with bounded overhead.
- Static phase: reduced frequency but complete quality coverage.
- Debug mode: extra fields allowed.
- Release mode: strict overhead budget and schema stability.

## Acceptance

- Every frame emits schema-valid diagnostics snapshot.
- Stress input does not introduce significant jitter from instrumentation.

## Implementation Evidence (Kickoff)

- Generate baseline report with per-frame snapshots:
  - `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- Validate report ingestion into dashboard trend:
  - `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0004-critical-layer-contract.md

```markdown
# T0004 Critical-Layer Contract

Status: In Progress

## Purpose

Define a hard guard so degradation cannot break critical semantics.

## Critical-Layer Classes

- Editor semantics: selection outline, edit anchors, active manipulation handles
- Medical semantics: key tissue structures, lesion markers, physician annotations
- Diagnostic semantics: QA overlays and must-display labels

## Hard Rules

- Critical layer visibility must be preserved in all phases.
- Critical layer clarity cannot be degraded by fallback passes.
- Policy conflicts resolve in this order:
  - critical-layer integrity
  - medical profile integrity
  - phase budget targets
  - non-critical visual fidelity

## Test Requirements

- Unit: any degradation pass must skip nodes tagged as critical-layer.
- Integration: under pressure, critical layers remain visible and sharp.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0001-baseline-evidence-panel.md

```markdown
# T0001 Baseline Evidence Panel

Status: In Progress

## Goal

Freeze current engine baseline and provide reproducible evidence across profiles.

## Repro Scenarios (Minimum)

- Editor: dense node interaction and zoom/pan flow
- Game: dynamic objects and effects stress
- Animation: long timeline and seek stability
- Medical: critical-layer visibility and fidelity
- Massive-data: 300k+ mixed geometry roam

## Report Fields (Required)

- Run metadata: git commit, date, device profile, backend
- Frame: fps p50/p95/p99, jank count, missed frames
- Latency: input-to-photon p50/p95/p99
- Quality: missing ratio, fallback ratio
- Cache: hit/evict/stale-reuse
- Upload: bytes/frame, critical upload latency
- Stability: crash/leak/long-run drift

## Repro Command Checklist

- `pnpm --filter @venus/engine bench:scenario`
- `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- `pnpm --filter @venus/engine test`
- `pnpm typecheck`

## Acceptance

- Any scenario can produce the same report schema.
- 10 repeated runs produce quantified variance.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0012-phase-a-acceptance.md

```markdown
# T0012 Phase-A Acceptance

Status: In Progress

## Scope

Phase-A includes T0001-T0011 governance and baseline setup.

## Gate Checklist

- CHANGE REQUEST template and gate exist
- baseline report contract exists
- metrics snapshot path exists
- risk ledger and rollout playbook exist
- boundary charter exists
- dashboard task state and trend structure exist

## Smoke Flow

1. `pnpm --filter @venus/engine cr:check`
2. `pnpm --filter @venus/engine test`
3. `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
4. `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`

## Exit Criteria

- All smoke commands pass.
- Program dashboard has reproducible trend entry format.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0005-scenario-dataset-and-pressure-tiers.md

```markdown
# T0005 Scenario Dataset and Pressure Tiers

Status: In Progress

## Dataset Matrix

- Editor: graph-heavy editable canvas, 300k+ nodes
- Game: dynamic actors + particle bursts + camera motion
- Animation: long timeline + multi-track interpolation + seek
- Medical: multi-layer 3D volume + annotation overlays
- Massive-data: point/line/polygon mixed dataset, 300k+

## Tier Definition

- `low`: development sanity and contract validation
- `medium`: representative production baseline
- `high`: stress baseline and scaling checkpoints
- `extreme`: redline behavior and fallback verification

## Generator Constraints

- Deterministic with fixed seed.
- Schema-compatible across tiers.
- Reproducible by script in local and CI.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0003-change-request-and-ci-gate.md

```markdown
# T0003 CHANGE REQUEST and CI Gate

Status: In Progress

## Deliverables

- Canonical CR template:
  - `governance/change-request-template.md`
- Kickoff CR:
  - `change-requests/CR-T0001-T0010-kickoff.md`
- CR check script:
  - `packages/engine/scripts/check-change-request.mjs`

## Gate Rule v1

- If change touches `packages/engine/src/**` or `packages/engine/scripts/**`, diff must include at least one file in:
  - `packages/engine/docs/industrial-refactor/change-requests/*.md`

## Acceptance

- Missing CR causes non-zero exit code.
- Trivial docs-only changes can pass without CR.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0011-boundary-charter.md

```markdown
# T0011 Boundary Charter

Status: In Progress

## Goal

Define hard package boundaries between app, runtime, engine, and lib.

## Ownership Split

- `app`: product workflow and UX policy
- `engine`: rendering/runtime strategy and performance contracts
- `lib`: shared primitives and generic helpers

## Allowed Dependencies

- `app -> engine`
- `app -> lib`
- `engine -> lib`

## Forbidden Dependencies

- `engine -> app`
- `lib -> engine`
- `lib -> app`

## Validation Rule

- Import graph must fail on forbidden edges.

## Evidence

- `engine-module-boundaries.md` and governance checks define directional policy.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-a/T0010-program-dashboard.md

```markdown
# T0010 Program Dashboard

Status: In Progress

## Scope

Track task status, metric trends, and blockers for industrial refactor.

## Task State Machine

- `not-started`
- `in-progress`
- `blocked`
- `done`

## Dashboard Inputs

- task ledger (`dashboard/program-dashboard.json`)
- baseline metrics snapshots
- gate and regression outputs

## Alerts

- blocked task without owner
- redline regression detected
- critical-layer integrity failures

## Implementation Evidence (Kickoff)

- Baseline artifact generation:
  - `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- Dashboard ingestion:
  - `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0138-post-ga-hotfix-policy.md

```markdown
# T0138 Post-GA Hotfix Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Define hotfix eligibility, risk level, and rollback guardrails.

## Acceptance

- Hotfix policy blocks unqualified patches from fast-track rollout.

## Validation

- Evaluate qualified/unqualified hotfix samples and verify verdicts.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0122-emergency-rollback-drill-v1.md

```markdown
# T0122 Emergency Rollback Drill V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define and rehearse emergency rollback decision and execution checklist.

## Acceptance

- Rollback drill can be executed end-to-end with complete evidence logs.

## Validation

- Run dry-run rollback exercise and verify all mandatory checkpoints.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0127-regression-triage-automation.md

```markdown
# T0127 Regression Triage Automation

Status: in-progress
Owner: engine/runtime

## Scope

- Classify regressions into severity and owner routing buckets.

## Acceptance

- Triage output includes deterministic severity and owner labels.

## Validation

- Run synthetic regression sets and verify routing consistency.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0139-phase-g-acceptance.md

```markdown
# T0139 Phase-G Acceptance

Status: in-progress
Owner: engine/runtime

## Scope

- Define final acceptance gate for post-GA hardening and 2D/3D readiness.

## Acceptance

- All phase-G critical gates pass with zero blocker findings.

## Validation

- Aggregate phase-G gate outputs and verify acceptance criteria.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0123-canary-autopause-policy.md

```markdown
# T0123 Canary Autopause Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Define canary autopause triggers for latency, missing critical layers, and crash spikes.

## Acceptance

- Any redline breach triggers deterministic canary autopause with reason code.

## Validation

- Simulate threshold breaches and verify autopause trigger behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0121-post-ga-week1-observability-audit.md

```markdown
# T0121 Post-GA Week1 Observability Audit

Status: in-progress
Owner: engine/runtime

## Scope

- Audit first-week release telemetry completeness and anomaly attribution coverage.

## Acceptance

- Week1 telemetry has complete SLO fields and explainable anomaly records.

## Validation

- Replay week1 traces and verify mandatory telemetry fields are present.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0136-compatibility-matrix-v2.md

```markdown
# T0136 Compatibility Matrix V2

Status: in-progress
Owner: engine/runtime

## Scope

- Extend compatibility matrix coverage for post-GA profile/backend combinations.

## Acceptance

- Matrix v2 captures required combinations and blocker annotations.

## Validation

- Validate matrix entries against mandatory profile/backend set.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0126-deterministic-snapshot-archive.md

```markdown
# T0126 Deterministic Snapshot Archive

Status: in-progress
Owner: engine/runtime

## Scope

- Define deterministic snapshot archiving contract for release evidence retention.

## Acceptance

- Archive entries are versioned and reproducible across reruns.

## Validation

- Replay identical input and verify snapshot hash stability.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0134-edge-sync-consistency-gate.md

```markdown
# T0134 Edge Sync Consistency Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Gate consistency between cloud baseline and edge profile snapshots.

## Acceptance

- Any edge sync mismatch surfaces explicit mismatch categories.

## Validation

- Compare aligned and drifted snapshots for gate behavior.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0128-perf-budget-recalibration-v1.md

```markdown
# T0128 Perf Budget Recalibration V1

Status: in-progress
Owner: engine/runtime

## Scope

- Recalibrate perf budget targets from post-GA observed baseline.

## Acceptance

- Recalibration output is bounded and explicitly justified.

## Validation

- Compare baseline vs observed metrics and verify bounded adjustments.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0131-scene-lod-governance-v1.md

```markdown
# T0131 Scene LOD Governance V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define LOD governance policy with critical-node protection constraints.

## Acceptance

- LOD policy does not degrade protected critical nodes.

## Validation

- Stress LOD candidates and verify protected node invariants.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0133-gpu-fallback-chaos-suite.md

```markdown
# T0133 GPU Fallback Chaos Suite

Status: in-progress
Owner: engine/runtime

## Scope

- Validate fallback behavior under synthetic GPU capability faults.

## Acceptance

- Fallback chain remains deterministic without critical-layer loss.

## Validation

- Inject capability faults and verify fallback sequence evidence.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0140-phase-g-closeout-postmortem.md

```markdown
# T0140 Phase-G Closeout Postmortem

Status: in-progress
Owner: engine/runtime

## Scope

- Consolidate phase-G outcomes, risks, and follow-up backlog.

## Acceptance

- Postmortem includes timeline, incidents, and v-next actions.

## Validation

- Review postmortem checklist completeness and artifact links.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0130-2d-3d-hybrid-policy-pack.md

```markdown
# T0130 2D/3D Hybrid Policy Pack

Status: in-progress
Owner: engine/runtime

## Scope

- Define hybrid policy handoff constraints between 2D and 3D modes.

## Acceptance

- Hybrid mode transitions preserve critical-layer guarantees.

## Validation

- Execute mode-switch replay and verify transition safety checks.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0129-3d-capability-readiness-contract.md

```markdown
# T0129 3D Capability Readiness Contract

Status: in-progress
Owner: engine/runtime

## Scope

- Define minimum capability gate for 2D-to-3D rollout readiness.

## Acceptance

- Readiness gate fails when capability prerequisites are incomplete.

## Validation

- Evaluate capability sets and verify readiness pass/fail outcomes.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0137-long-run-soak-report-v1.md

```markdown
# T0137 Long-Run Soak Report V1

Status: in-progress
Owner: engine/runtime

## Scope

- Define long-run soak report contract for stability and drift evidence.

## Acceptance

- Soak report includes mandatory stability, memory, and drift metrics.

## Validation

- Run synthetic soak samples and verify report completeness.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0132-memory-pressure-circuit-breaker.md

```markdown
# T0132 Memory Pressure Circuit Breaker

Status: in-progress
Owner: engine/runtime

## Scope

- Define deterministic circuit-breaker response for memory pressure escalation.

## Acceptance

- Circuit breaker activates and recovers according to bounded thresholds.

## Validation

- Simulate pressure escalation/recovery and verify state transitions.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0124-release-drift-detector.md

```markdown
# T0124 Release Drift Detector

Status: in-progress
Owner: engine/runtime

## Scope

- Detect configuration drift between approved release profile and runtime snapshots.

## Acceptance

- Drift detector reports actionable mismatches with normalized diff keys.

## Validation

- Feed mismatched snapshots and verify drift report coverage.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0125-profile-signature-governor.md

```markdown
# T0125 Profile Signature Governor

Status: in-progress
Owner: engine/runtime

## Scope

- Enforce profile signature versioning and approval ownership integrity.

## Acceptance

- Unapproved or incomplete signatures are rejected by governance gate.

## Validation

- Submit valid/invalid signatures and verify gate pass/fail outcomes.
```

## Source: ./packages/engine/docs/industrial-refactor/phase-g/T0135-release-notes-quality-gate.md

```markdown
# T0135 Release Notes Quality Gate

Status: in-progress
Owner: engine/runtime

## Scope

- Validate release notes coverage for risk, migration, and rollback guidance.

## Acceptance

- Notes quality gate passes only when mandatory sections are complete.

## Validation

- Evaluate complete/incomplete note sets and verify gate output.
```

## Source: ./packages/engine/docs/outline.md

```markdown
# Engine 模块文档入口说明

`outline.md` 已从“单文件长文档”重构为导航入口。

请改用新的双语分层文档：

1. 总入口：`packages/engine/docs/index.md`
2. 中文入口：`packages/engine/docs/cn/index.md`
3. 英文入口：`packages/engine/docs/en/index.md`

重构后的文档结构特点：

1. `index.md` 作为起点，分层阅读。
2. 按模块边界拆分文件，覆盖 `src` 顶层所有模块域。
3. 每个模块文档包含职责、限制、依赖关系与治理校验点。

这次重构仅调整文档组织，不改变 engine 运行时代码行为。
```

## Source: ./packages/engine/docs/cn/07-constraints-validation-and-refactor-checklist.md

```markdown
# 约束、校验与小范围重构清单

## 1. 硬约束

1. 严格遵守模块单向依赖。
2. engine 保持机制层，不吸收产品语义。
3. 禁止 `any`，公共接口显式契约。
4. 影响行为的字面量必须提取为命名常量。

## 2. 校验命令

合并前必须通过：

1. `pnpm --filter @venus/engine test`
2. `pnpm --filter @venus/engine exec tsc --noEmit` 或等价 typecheck
3. `pnpm lint`

## 3. 跨模块重构检查项

1. 确认未引入反向依赖。
2. 变更 planning/shortlist 时保持 scene/store/index 不变量。
3. 保证 renderer 回退分支与 fallback taxonomy 对齐。
4. strategy/scheduler/budget/cache 改动必须补测试。
5. 渲染路径改动后重查 blank-frame 与 sharpen-SLA 诊断。

## 4. 当前一致性评估（2026-05）

1. 模块所有权图基本符合限制文档。
2. runtime/renderer 策略体系完整但学习成本高，本文档用于降低接入成本。
3. 最高运行风险仍在交互回退一致性（黑屏、边缘断层、停手清晰度恢复时序）。

## 5. 小范围重构建议

优先做低风险收敛：

1. 将分支特化回退逻辑沉入已有域模块，减少编排器复杂度。
2. 合并重复阈值常量，统一配置来源。
3. 在扩大算法改动前先补强诊断与守卫覆盖。
```

## Source: ./packages/engine/docs/cn/01-architecture-and-dependency-graph.md

```markdown
# 架构与依赖图

## 1. 引擎定位

`@venus/engine` 是渲染、几何、查询与调度原语的机制层。

它不负责：

- 产品命令语义。
- 历史与协作策略。
- UI 状态机。
- 工具行为编排。

## 2. 责任域

顶层模块按职责可分为：

1. 基础层：`math`、`time`、`utils`、`types`、`geometry`、`transform`、`resource`、`platform`、`camera`、`material`、`lighting`、`assets`。
2. 场景层：`scene`、`spatial`、`visibility`。
3. 交互层：`interaction`。
4. 渲染层：`renderer`、`gpu`、`render`、`scheduler`。
5. 运行时编排层：`runtime`、`settings`、`debug`、`bench`、`worker`、`index`、`tests`。

## 3. 单向依赖规则

权威依赖流向：

1. `math|time|utils|core` 不可反向依赖 renderer/runtime/worker。
2. `scene` 只能依赖基础层。
3. `interaction` 依赖 scene + 基础层。
4. `renderer` 依赖 interaction + scene + 基础层。
5. `runtime` 依赖 renderer + interaction + scene + 基础层。
6. `worker` 依赖 runtime + renderer + interaction + scene + 基础层。

除非显式标记临时兼容，否则禁止反向依赖。

## 4. Runtime 到帧输出链路

1. `runtime/createEngine` 解析配置、策略与编排句柄。
2. Scene 更新经 store/patch 进入。
```

## Source: ./packages/engine/docs/cn/06-runtime-strategy-budget-and-release.md

```markdown
# Runtime 策略、预算与发布契约

## 1. 域目标

runtime 是编排中心，把 scene + interaction + renderer 组合成稳定可观测的帧行为。

## 2. 核心区域

1. `runtime/createEngine`

- 引擎组装入口与生命周期控制。

2. `runtime/createEngineLoop`

- 循环驱动与 render 触发语义。

3. `runtime/renderScheduler`

- 请求合并与策略调度。

4. `runtime/strategy`

- 阶段识别、收敛策略、退化梯度、QoS 决策。

5. `runtime/budget`

- 压力采样、GPU 上传代理、worker 预算代理。

6. `runtime/policy`

- profile/scaler/scenario/camera/cache 等策略包。

7. `runtime/diagnostics`

- deterministic、blank-frame、sharpen-SLA、memory/cache、regression 诊断。

8. `runtime/release`

- phase gate、readiness、runbook、rollout 等发布治理契约。
```

## Source: ./packages/engine/docs/cn/03-scene-and-visibility.md

```markdown
# Scene 与 Visibility

## 1. Scene 域目标

scene 域负责 render-facing 状态维护与候选集提取的确定性。

## 2. 核心子模块

1. `scene/types`

- 可渲染节点与场景快照契约。

2. `scene/store`

- 场景存储、事务更新与 revision 生命周期。

3. `scene/patch`

- 高频场景增量更新。

4. `scene/indexing` 与 `scene/spatial`

- 粗粒度空间索引与候选查询加速。

5. `scene/worldBounds` 与 `scene/geometry`

- world bounds 计算与几何支撑。

6. `scene/framePlan` 与 `scene/hitPlan`

- 渲染帧与命中候选计划。

7. `scene/hit` 与 `scene/hitTest`

- 基于候选集的精确命中求解。

8. `scene/visibility` 与顶层 `visibility`

- 可见性过滤（含 2D/3D/frustum/occlusion 扩展点）。
```

## Source: ./packages/engine/docs/cn/04-interaction-and-hit-testing.md

```markdown
# 交互与命中测试

## 1. 域目标

interaction 提供机制算法：viewport 变化、吸附、变换、命中 refine。

## 2. 核心模块

1. `interaction/viewport`、`interaction/viewportPan`、`interaction/zoom`

- viewport 数学、平移与缩放会话。

2. `interaction/hitTest`、`interaction/hitTolerance`

- 命中 refine 与容差策略。

3. `interaction/shapeTransform`

- 图形变换与会话辅助。

4. `interaction/snapping`

- 几何吸附原语。

5. `interaction/geometryPayload`

- overlay/交互可视化几何负载。

6. `interaction/lodProfile`、`interaction/lodConfig`、`interaction/lodTypes`、`interaction/visibilityLod`

- 交互阶段质量退化与 LOD 配置。

7. `interaction/overlayCanvas`

- 机制级 overlay 绘制契约，不是产品 UI 状态机。

## 3. 与 runtime/renderer 关系

1. runtime 根据交互阶段决策 strategy 与预算。
2. renderer 基于 runtime 上下文执行质量路径。
```

## Source: ./packages/engine/docs/cn/index.md

```markdown
# Engine 文档索引（中文）

本索引是当前 engine 架构与模块逻辑的中文入口。

## 阅读顺序

1. [架构与依赖图](01-architecture-and-dependency-graph.md)
2. [基础模块](02-foundation-modules.md)
3. [Scene 与 Visibility](03-scene-and-visibility.md)
4. [交互与命中测试](04-interaction-and-hit-testing.md)
5. [Renderer 与 GPU 渲染管线](05-renderer-and-gpu-pipeline.md)
6. [Runtime 策略、预算与发布契约](06-runtime-strategy-budget-and-release.md)
7. [约束、校验与小范围重构清单](07-constraints-validation-and-refactor-checklist.md)

## 设计目标摘要

engine 是机制层，不承载产品语义。它的核心目标是：

1. 维护 render-facing 场景状态。
2. 通过策略驱动的渲染编排产出稳定帧。
3. 对外提供查询与命中原语。
4. 提供诊断与发布验收契约用于治理。

## 覆盖范围

本文档覆盖 `packages/engine/src` 下全部顶层域：

- animation, assets, bench, camera, core, debug, geometry, gpu, index
- interaction, lighting, material, math, platform, render, renderer
- resource, runtime, scene, scheduler, settings, spatial, tests
- time, transform, types, utils, visibility, worker
```

## Source: ./packages/engine/docs/cn/02-foundation-modules.md

```markdown
# 基础模块

## 1. 目标

基础模块提供可复用原语，必须保持对 renderer/runtime 策略无反向依赖。

## 2. 模块拆解

1. `math`

- 矩阵、向量、维度与投影契约。

2. `geometry`

- 几何和边界计算原语。

3. `time`

- 时钟抽象，支持可测试、可复现的调度。

4. `utils`

- 通用基础工具与断言。

5. `types`

- 跨模块复用的数据契约片段。

6. `transform`

- 变换组合与适配原语。

7. `camera`

- 相机姿态与投影契约。

8. `material` 与 `lighting`

- 材质与光照描述契约。
```

## Source: ./packages/engine/docs/cn/05-renderer-and-gpu-pipeline.md

```markdown
# Renderer 与 GPU 渲染管线

## 1. 域目标

renderer 将 scene 计划转换为稳定帧输出，并在策略约束下完成回退与缓存控制。

## 2. 模块族

1. 计划与实例化

- `renderer/plan`、`renderer/instances`、`renderer/shared`。

2. 回退分类与诊断

- `renderer/fallbackTaxonomy`。

3. tile 子系统

- `renderer/tileManager`、`renderer/tileScheduler`、`renderer/interactionPredictiveTiles`。

4. 管线契约

- `renderer/pipeline`、`renderer/types`。

5. WebGL 执行栈

- `renderer/webgl` 编排器及 capability 模块。
- `renderer/webglComposite` 复合路径。
- `renderer/webglInteractionPreview` snapshot 复用路径。

6. WebGPU/Canvas 路径

- `renderer/webgpu`、`renderer/canvas2d`。

7. 分层/相机/命中/缓存辅助

- `renderer/layers`、`renderer/camera`、`renderer/hit`、`renderer/cache`。

## 3. 高层渲染流程
```

## Source: ./packages/engine/docs/ENGINE_DOCUMENTATION_CHANGE_REQUEST_2026-05-17.md

```markdown
# Engine Documentation Change Request (2026-05-17)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/index.md`
  - `packages/engine/docs/en/*`
  - `packages/engine/docs/cn/*`
  - `packages/engine/docs/outline.md`

Goal:

- Problem being solved:
  - Existing engine module docs were fragmented and mostly single-language.
  - Missing entry index and layered module walkthrough caused high onboarding/debugging cost.
  - Need a full-module logic map with features, limits, governance, and cross-module relationships.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - Documentation only for engine architecture, boundaries, runtime-render flow, and validation checklist.

Cleanup:

- Old logic to remove:
  - Replace the old outline-only entry workflow with a bilingual index-first navigation model.

Tests:

- Tests to add/update:
  - No runtime behavior change. Validation is doc link and structure consistency check.
```

## Source: ./packages/engine/docs/engine-module-boundaries.md

```markdown
# Engine Module Boundaries

This document defines ownership, boundaries, and one-way dependencies for `@venus/engine`.

## Ownership Domains

- `src/math`, `src/time`, `src/utils`, `src/core`
  - Shared primitives and foundational utilities.
- `src/scene`
  - Scene storage, indexing, geometry contracts, world-bounds derivation.
- `src/interaction`
  - Interaction algorithms (hit-test, shape transform, zoom/pan math, snapping).
- `src/renderer`
  - Render planning and backends (WebGL/Canvas2D/tile/composite).
- `src/runtime`
  - Engine runtime orchestration and scheduler coordination.
- `src/worker`
  - Worker bridge/capability adapters.

## One-Way Dependency Rule

Allowed direction only:

- `math|time|utils|core -> (no renderer/runtime/worker)`
- `scene -> math|time|utils|core`
- `interaction -> scene|math|time|utils|core`
- `renderer -> scene|interaction|math|time|utils|core`
- `runtime -> renderer|scene|interaction|math|time|utils|core`
- `worker -> runtime|renderer|scene|interaction|math|time|utils|core`

Forbidden:

- Reverse dependencies (for example `scene -> renderer`, `renderer -> runtime`, `interaction -> runtime`).

## Renderer WebGL Subsystem Boundaries

WebGL responsibilities are split by domain:

- `renderer/webgl/`
  - Backend orchestrator entry and frame-level control flow.
```

## Source: ./packages/engine/docs/2dto3d.md

```markdown
# Venus Engine — 2D → 3D Runtime Architecture Blueprint

## Overview

Venus Engine is NOT a traditional editor engine.

It is designed as:

- Dimension-agnostic
- Retained-mode
- GPU-driven
- Multi-pass
- Real-time scene runtime

The architecture must support:

- 2D editors
- 3D editors
- CAD
- Motion graphics
- Animation tools
- Game runtime
- Visualization systems

The engine itself MUST NOT contain editor-specific logic.

---

# Core Principles

## 1. Engine Does NOT Understand Editor Concepts

The engine MUST NOT contain:

- selection
- hover
- drag
- gizmo
- marquee
- snap
```

## Source: ./packages/engine/docs/index.md

```markdown
# Engine Module Documentation

This documentation set is the architecture and module reference for `@venus/engine`.

## Start Here

- English: [docs/en/index.md](en/index.md)
- 中文: [docs/cn/index.md](cn/index.md)

## Scope

These docs focus on:

1. Module responsibilities and dependency boundaries.
2. Runtime-to-render pipeline behavior.
3. Feature capabilities, limits, and governance constraints.
4. Cross-module integration contracts and validation checklist.

## Audience

- Engine maintainers.
- Runtime/app integration owners.
- Contributors who need boundary-safe refactors.
```

## Source: ./packages/engine/docs/3d-optimization/3d-optimization-task-ledger.md

```markdown
# Engine 3D Optimization Migration Task Ledger

Status: Active
Owner: Engine runtime and renderer maintainers
Last Updated: 2026-05-16

## Scope Definition

- Target: classify and migrate existing optimization mechanisms from 2D-first assumptions to 3D-ready behavior.
- Constraint: follow ai/AI_HIGHEST_STANDARD.md execution protocol and cleanup-first rule.
- Non-goal: large orchestration rewrites in one batch.

## Type Definition

- Define explicit mechanism taxonomy and disposition contract (`retain`, `upgrade`, `deprecate`).
- Define deterministic decision output that can be tested and consumed by follow-up planning tooling.

## CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/policy/optimizationMechanismPolicy/optimizationMechanismPolicy.ts`
- File / Module: `src/runtime/policy/optimizationMechanismPolicy/optimizationMechanismPolicy.test.ts`

Goal:

- Problem being solved: we need one deterministic, testable mechanism classification baseline before touching runtime orchestration.

Change Type:

- Add

Impact:

- Affected modules: runtime policy (analysis-only contract), test suite

Cleanup:
```

## Source: ./packages/engine/docs/en/07-constraints-validation-and-refactor-checklist.md

```markdown
# Constraints Validation And Refactor Checklist

## 1. Hard Constraints

1. Follow one-way ownership boundaries from module-boundary docs.
2. Keep engine mechanism-only; product semantics stay outside engine.
3. Avoid `any`; keep explicit public contracts.
4. Extract behavior-driving literals into named constants.

## 2. Validation Commands

Required validation before merge:

1. `pnpm --filter @venus/engine test`
2. `pnpm --filter @venus/engine exec tsc --noEmit` or workspace typecheck equivalent
3. `pnpm lint`

## 3. Cross-Module Refactor Checklist

1. Confirm no reverse imports are introduced.
2. Keep scene/store/index invariants stable when changing planning or shortlist.
3. Verify fallback taxonomy remains consistent with renderer branches.
4. Add tests for any strategy, scheduler, budget, or cache behavior changes.
5. Re-check blank-frame and sharpen-SLA diagnostics whenever render flow changes.

## 4. Current Consistency Assessment (May 2026)

1. Module ownership graph is largely aligned with restrictions docs.
2. Runtime/renderer strategy stack is rich and contract-heavy; onboarding cost is high without index docs (this documentation set addresses that gap).
3. The highest operational risk area remains interactive render fallback coherence (blank frame, overscan seams, settle sharpness timing).

## 5. Small-Range Refactor Guidance

Safe small-range refactors should prefer:

1. Isolating branch-specific fallback logic into existing domain modules.
2. Reducing duplicated threshold constants by centralizing named config values.
3. Tightening diagnostics coverage before broad algorithm changes.
```

## Source: ./packages/engine/docs/en/01-architecture-and-dependency-graph.md

```markdown
# Architecture And Dependency Graph

## 1. Positioning

`@venus/engine` is the mechanism layer for rendering, geometry, query, and scheduling primitives.

It is not responsible for:

- Product command semantics.
- History/collaboration policy.
- UI state machines.
- Tool behavior orchestration.

## 2. Ownership Domains

Top-level domains and their intent:

1. Foundation: `math`, `time`, `utils`, `types`, `geometry`, `transform`, `resource`, `platform`, `camera`, `material`, `lighting`, `assets`.
2. Scene domain: `scene`, `spatial`, `visibility`.
3. Interaction domain: `interaction`.
4. Renderer domain: `renderer`, `gpu`, `render`, `scheduler`.
5. Runtime orchestration: `runtime`, `settings`, `debug`, `bench`, `worker`, `index`, `tests`.

## 3. One-Way Dependency Rule

Authoritative dependency flow is:

1. `math|time|utils|core ->` no renderer/runtime/worker imports.
2. `scene ->` foundation only.
3. `interaction -> scene + foundation`.
4. `renderer -> interaction + scene + foundation`.
5. `runtime -> renderer + interaction + scene + foundation`.
6. `worker -> runtime + renderer + interaction + scene + foundation`.

Reverse edges are forbidden unless documented as temporary with explicit removal condition.

## 4. Runtime To Frame Pipeline

Frame lifecycle:
```

## Source: ./packages/engine/docs/en/06-runtime-strategy-budget-and-release.md

```markdown
# Runtime Strategy Budget And Release

## 1. Runtime Domain Goal

Runtime is the orchestration center that turns scene + interaction + renderer capabilities into stable frame behavior.

## 2. Core Runtime Areas

1. `runtime/createEngine`

- Engine composition entrypoint and lifecycle control.

2. `runtime/createEngineLoop`

- Loop ticking and render trigger semantics.

3. `runtime/renderScheduler`

- Request coalescing, policy-aware scheduling.

4. `runtime/strategy`

- Phase classification, convergence, degradation ladder, QoS decisions.

5. `runtime/budget`

- Pressure sampling, upload broker, worker budget broker.

6. `runtime/policy`

- Runtime profile policy packs, scaler, scenario policies, camera and cache policy.

7. `runtime/diagnostics`

- Determinism, blank-frame, sharpen-SLA, memory/cache, regression checks.

8. `runtime/release`

- Acceptance and readiness contracts (phase gates, governance checklists, rollout/runbook policies).
```

## Source: ./packages/engine/docs/en/03-scene-and-visibility.md

```markdown
# Scene And Visibility

## 1. Scene Domain Goal

The scene domain maintains render-facing state and deterministic candidate extraction.

## 2. Core Submodules

1. `scene/types`

- Defines renderable node contracts and snapshot shape.

2. `scene/store`

- Owns scene storage, transactions, and revision lifecycle.

3. `scene/patch`

- Applies incremental updates for high-frequency mutations.

4. `scene/indexing` and `scene/spatial`

- Maintains coarse spatial index and candidate query acceleration.

5. `scene/worldBounds` and `scene/geometry`

- Computes transformed world bounds used by planning/culling.

6. `scene/framePlan` and `scene/hitPlan`

- Builds frame/hit candidate plans before renderer or exact hit refinement.

7. `scene/hit` and `scene/hitTest`

- Exact geometry-level hit solving over coarse candidates.

8. `scene/visibility` and top-level `visibility`

- Applies visibility filters (2D/3D policy, frustum/occlusion hooks).
```

## Source: ./packages/engine/docs/en/04-interaction-and-hit-testing.md

```markdown
# Interaction And Hit Testing

## 1. Domain Goal

Interaction modules provide mechanism algorithms for viewport mutation, snapping, transforms, and hit-test refinement.

## 2. Core Modules

1. `interaction/viewport`, `interaction/viewportPan`, `interaction/zoom`

- Viewport math, pan/zoom sessions, and anchor handling.

2. `interaction/hitTest`, `interaction/hitTolerance`

- Hit candidate refinement and tolerance policy.

3. `interaction/shapeTransform`

- Shape transform math and transform-session helpers.

4. `interaction/snapping`

- Geometric snapping primitives.

5. `interaction/geometryPayload`

- Geometry payload extraction for overlay and interaction visualization.

6. `interaction/lodProfile`, `interaction/lodConfig`, `interaction/lodTypes`, `interaction/visibilityLod`

- Interaction-phase quality degradation and LOD capability wiring.

7. `interaction/overlayCanvas`

- Mechanism-level overlay draw contract, not product UI behavior.

## 3. Relationship To Runtime And Renderer

1. Runtime interprets interaction phase and selects strategy/budget.
2. Renderer executes quality path based on runtime context plus interaction signals.
```

## Source: ./packages/engine/docs/en/index.md

```markdown
# Engine Documentation Index (EN)

This index is the entry point for current engine architecture and module logic.

## Reading Order

1. [Architecture And Dependency Graph](01-architecture-and-dependency-graph.md)
2. [Foundation Modules](02-foundation-modules.md)
3. [Scene And Visibility](03-scene-and-visibility.md)
4. [Interaction And Hit Testing](04-interaction-and-hit-testing.md)
5. [Renderer And GPU Pipeline](05-renderer-and-gpu-pipeline.md)
6. [Runtime Strategy Budget And Release](06-runtime-strategy-budget-and-release.md)
7. [Constraints Validation And Refactor Checklist](07-constraints-validation-and-refactor-checklist.md)

## Design Goal Summary

The engine is a mechanism layer. It must provide deterministic render and query capability while staying independent from product semantics.

Core goal chain:

1. Maintain render-facing scene state.
2. Produce stable frames through strategy-aware renderer orchestration.
3. Expose query and hit-test primitives.
4. Provide diagnostics and release-contract gates for runtime governance.

## Current Source Coverage

This documentation covers all top-level source domains under `packages/engine/src`:

- animation, assets, bench, camera, core, debug, geometry, gpu, index
- interaction, lighting, material, math, platform, render, renderer
- resource, runtime, scene, scheduler, settings, spatial, tests
- time, transform, types, utils, visibility, worker
```

## Source: ./packages/engine/docs/en/02-foundation-modules.md

```markdown
# Foundation Modules

## 1. Purpose

Foundation modules provide reusable primitives that must stay independent from renderer/runtime policy decisions.

## 2. Module Breakdown

1. `math`

- Matrix and dimension contracts (`Mat3`, vectors, frustum/ray types).
- Numeric transform helpers used by scene, interaction, renderer.

2. `geometry`

- Shape and boundary computation primitives.
- Shared geometric routines for hit-test and culling preparation.

3. `time`

- Clock abstraction for deterministic scheduling and testability.

4. `utils`

- Small shared helpers and assertion-style utilities.

5. `types`

- Shared contract fragments reused across modules.

6. `transform`

- Canonical transform adaptation and composition helpers.

7. `camera`

- Camera pose/projection contracts used by 2D/3D-compatible runtime wiring.

8. `material` and `lighting`
```

## Source: ./packages/engine/docs/en/05-renderer-and-gpu-pipeline.md

```markdown
# Renderer And GPU Pipeline

## 1. Renderer Domain Goal

Renderer modules convert scene plans into deterministic frame output with strategy-aware fallback and cache control.

## 2. Module Families

1. Planning and instances

- `renderer/plan`, `renderer/instances`, `renderer/shared`.

2. Fallback taxonomy and diagnostics

- `renderer/fallbackTaxonomy`.

3. Tile subsystem

- `renderer/tileManager`, `renderer/tileScheduler`, `renderer/interactionPredictiveTiles`.

4. Pipeline contracts

- `renderer/pipeline`, `renderer/types`.

5. WebGL execution stack

- `renderer/webgl` orchestrator and capability modules.
- `renderer/webglComposite` for model-complete compositing.
- `renderer/webglInteractionPreview` for snapshot reuse.

6. WebGPU and Canvas paths

- `renderer/webgpu`, `renderer/canvas2d` for backend support and compatibility.

7. Layer/camera/hit/cache adjuncts

- `renderer/layers`, `renderer/camera`, `renderer/hit`, `renderer/cache`.

## 3. High-Level Render Flow
```

## Source: ./packages/engine/docs/RENDER_OPTIMIZATION_TASKS.md

```markdown
# Engine 渲染优化任务追踪

> 目标：对标游戏渲染器、动画渲染器、医疗3D展示、超大数据可视化等工业级最佳实践，优化 engine 渲染链路，确保动画/交互期间画质与响应性无损。

## CHANGE REQUEST（2026-05-16 / LOD-Tile Budget Adaptive）

[CHANGE REQUEST]

Target:

- File / Module: runtime/createEngine/frameBudgetBroker, runtime/createEngine/createEngine

Goal:

- Problem being solved: 交互期预算收缩过猛导致tile预取不足，出现边缘空白与恢复抖动。

Change Type:

- Modify

Impact:

- Affected modules: frame budget broker, predictor-to-budget wiring, strategy diagnostics.

Cleanup:

- Old logic to remove: 无需删除模块，收敛为自适应预算规则并保留兼容接口。

Tests:

- Tests to add/update: frameBudgetBroker.test 增加交互期最小预取保障与高置信预测加速断言。

## CHANGE REQUEST（2026-05-16 / Interactive Critical Upload Lane）

[CHANGE REQUEST]

Target:

- File / Module: renderer/webgl/webgl, renderer/webgl/runtime/textures, runtime/createEngine/frameBudgetBroker
```

## Source: ./packages/engine/docs/3d-runtime-migration-task.md

```markdown
# Venus Engine 3D Runtime Migration Final Report

Status: Accepted (Archived)
Owner: engine runtime
Scope: packages/engine
Date: 2026-05-16

## Migration Goal

Build a dimension-agnostic retained runtime aligned with the 2D -> 3D blueprint while keeping editor-specific behavior outside engine runtime boundaries.

## Blueprint Alignment Summary (2dto3d.md)

- Engine/editor boundary: aligned
- Scene and render decoupling: aligned
- Visibility as first-class subsystem: aligned
- Render graph orchestration: aligned
- Backend-agnostic render layer: aligned
- Material and lighting runtime contracts: aligned
- 2D/3D hit dual-path contracts: aligned
- WebGPU bootstrap with stable fallback: aligned
- Blueprint top-level domain structure: aligned

## Phase Closure (A-U)

- A-G: Core migration baseline completed
- H-I: Compatibility debt cleanup and migration temporary removal completed
- J: WebGPU native-probe bootstrap completed
- K-N: Folder/domain alignment and boundary hardening completed
- O: Final acceptance and sign-off completed
- P-U: Post-acceptance governance and documentation synchronization completed

## Final Verification Snapshot

- Engine tests: pass
- Type check (`tsc --noEmit`): pass
- Lint (`eslint src --ext .ts`): pass

## Cleanup Decision
```

## Source: ./packages/engine/docs/INDUSTRIAL_ENGINE_REFACTOR_MASTER_PLAN.md

```markdown
# Venus Engine 工业级重构总规划（Serialized Master Plan）

状态：Draft-Ready
版本：v1.0
日期：2026-05-16
适用范围：packages/engine（含与 app/runtime 的契约边界）

---

## 0. 文档目标

本计划用于将 engine 演进为工业级渲染引擎，统一支持以下目标场景：

- 编辑器渲染（300k+ 节点，强调交互跟手与可编辑语义正确性）
- 游戏渲染（强调帧稳定、实时性、动态效果）
- 动画渲染（强调时间一致性、插值精度、回放稳定）
- 医疗 3D 展示（强调画面一致性、细节完整、可追溯）
- 超大量数据展示（300k+，强调渐进式可见性、稳定吞吐）

本计划遵循以下架构理念：

- User Settings -> Quality Preset -> Runtime Policy -> Runtime Budget -> Render Strategy -> GPU Backend
- 渲染系统是运行时预算系统，而非静态流水线。
- 通过显式策略状态机（interactive / settling / static / camera）平衡“跟手流畅”与“画质完整”。

---

## 1. 全局成功标准（Program SLO）

### 1.1 跨场景统一 SLO

- Input-to-Photon（交互输入到可见响应）p95 <= 32ms，p99 <= 50ms（编辑器/游戏模式）
- 交互帧稳定性：interactive FPS p95 >= 55（60Hz 屏）
- 细节恢复时延：settle-to-sharp p95 <= 220ms，p99 <= 350ms
- 完整性：关键语义层 missing ratio = 0（选中态、编辑锚点、医疗关键层）
- 一致性：同输入数据 + 同策略配置下，渲染结果可重复（deterministic snapshot）

### 1.2 场景差异化 SLO

- 编辑器 300k+：拖拽、框选、缩放连续操作无明显阻滞，交互期间允许非关键视觉降级，停手后快速清晰恢复
```

## Source: ./packages/engine/README.md

```markdown
# `@venus/engine`

Venus 的机制层引擎。它提供纯粹的渲染与几何能力，包括 scene store、渲染后端、空间索引、query/hit-test、viewport 数学、render scheduling、tile 与图片采样等机制；不负责产品语义、命令历史、工具状态机或 UI overlay。

## 文档归属

- engine 专属能力、边界与接入说明，应保留在当前 package 内。
- 全局 `docs/` 只保留跨 package 的架构、治理与导航信息。

## 迁移状态

- 2D->3D runtime staged migration 已完成最终验收。
- 最终归档报告见 `packages/engine/docs/3d-runtime-migration-task.md`（Status: Accepted, Archived）。

当前职责链：

`apps/* -> @venus/runtime + @venus/runtime/interaction -> @venus/runtime/worker + @venus/runtime/shared-memory -> @venus/engine`

## 一句话理解

把 `@venus/engine` 当成一个“可嵌入的场景渲染与命中机制包”，而不是完整编辑器内核。

它擅长的是：

- 吃一个 render scene
- 维护 render-facing state 与索引
- 画出当前 viewport
- 提供候选查询与精确 hit-test
- 暴露一组可组合的性能能力

它不擅长也不应该负责的是：

- 文档模型与文件格式
- command / history / collaboration
- 产品级选择规则与编辑模式
- React、DOM、SVG overlay、cursor UI

## Engine 的能力地图

## Benchmark 场景（F-03）
```

## Source: ./packages/engine/src/tests/README.md

```markdown
# Engine Test Domain

This folder reserves the blueprint-aligned `tests/` domain entry.
Concrete tests currently remain colocated near implementation modules.
```

## Source: ./packages/engine/src/assets/README.md

```markdown
# Engine Asset Domain

This folder reserves the blueprint-aligned `assets/` domain entry.
Runtime assets can be centralized here as the GPU pipeline evolves.
```
