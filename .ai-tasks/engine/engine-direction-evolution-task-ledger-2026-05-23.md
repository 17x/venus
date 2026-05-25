# Engine Direction Evolution Task Ledger (2026-05-23)

## 0. Scope Definition

This ledger drives the next engine evolution for the following target scenarios:

1. Medical imaging 3D reconstruction and slice runtime (CT/MRI)
2. Pre-op planning and instrument path simulation
3. BIM architecture 3D collaborative review
4. Industrial CAD assembly and constraint validation
5. GIS unified 2D/3D map browsing
6. Autonomous driving digital twin replay
7. City-scale digital twin monitoring wall
8. E-commerce 3D product display and variant switching
9. Education/research molecular structure and volume rendering
10. Game level editor and runtime isomorphic preview
11. Node-side rendering runtime
12. 2D vector editor (current primary scenario)
13. Video editor (timeline + monitor + effect overlays)

Design source and architecture constraints:

- .ai-local/draft.md
- .ai-local/refactor.md
- packages/engine/src layer split is fixed as default:
  - backend
  - kernel
  - optimization
  - orchestration
  - platform

Unless strictly required, do not introduce a sixth category.

Additional architecture directives for this evolution:

- 3D-first engine baseline: engine core and default runtime path must remain 3D-oriented.
- 2D capability is opt-in only: introduce explicit 2D module groups only when measurable benefit is high and only for explicitly declared 2D use cases.
- Domain-semantic neutrality: engine cannot encode industry product semantics or business logic; scenario behavior must be composed from generic runtime primitives.
- API-first exposure: runtime capabilities are exposed through concise engine API surfaces only; avoid scattered direct module/method exports that bypass API governance.
- API naming policy: names must be short, consistent, and intent-clear.

## 1. Type Definition (Task Contracts)

### 1.1 Task Status

- TODO: not started
- DOING: in progress
- BLOCKED: waiting for dependency
- DONE: completed and validated

### 1.2 Layer Owner Codes

- B: backend
- K: kernel
- O: optimization
- R: orchestration
- P: platform

### 1.3 Priority

- P0: runtime safety and architecture boundary
- P1: scenario-enabling baseline
- P2: performance and scale reinforcement
- P3: ecosystem polish and migration cleanup

### 1.4 Completion Gate

A task is DONE only when all are true:

- code + tests + docs updated
- validations executed and recorded
- legacy fallback decision captured
- cleanup impact listed

## 2. CHANGE REQUEST Batch (Mandatory Before Implementation)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/\* (by layer ownership)

Goal:

- Problem being solved: evolve engine into universal runtime with scenario-complete capabilities while preserving strict layer boundaries and deterministic contracts.

Change Type:

- Add + Modify + Remove

Impact:

- Affected modules:
  - backend, kernel, optimization, orchestration, platform
  - docs and tests under packages/engine

Cleanup:

- Old logic to remove:
  - stale/duplicated implementations after migration from packages/\_vnext and packages/engine-legacy

Tests:

- Tests to add/update:
  - contract tests, integration tests, scenario replay tests, node runtime tests, backend conformance tests

## 3. Test Design (Global)

Validation command set for each execution slice:

- pnpm --filter @venus/engine typecheck
- pnpm --filter @venus/engine test
- pnpm --filter @venus/engine run cr:check

External-environment guard policy:

- engine test gates do not include external app environment checks
- `@venus/vector-editor-web` typecheck is not part of engine validation gates

Additional scenario gates when touched:

- Node runtime path: node adapters + headless rendering contract tests
- GPU backend path: backend capability matrix + fallback tests
- Interaction path: picking/hit stack/penetration + zoom stability tests
- Video path: timeline scheduling + monitor composition regression tests
- 3D baseline gate: no mandatory 2D coupling in default engine runtime path
- 2D opt-in gate: any 2D-specific capability must live behind explicit 2D module boundary and explicit API opt-in
- Semantic neutrality gate: no domain product/business semantics in engine contracts or runtime code
- API surface gate: external capability entry points must be exposed from governed API surface only

## 4. Execution Plan

## Phase A: Architecture Guardrails and Backlog Bootstrap

### DEX-001 [P0] [K/R] Define scenario capability matrix

- Status: DONE
- Outcome:
  - map 13 scenarios to runtime capability domains
  - map each domain to layer ownership (B/K/O/R/P)
- Acceptance:
  - matrix committed in docs
  - each capability has owner and gate
- Artifacts:
  - packages/engine/docs/en/concepts/scenario-capability-matrix.md
  - packages/engine/docs/cn/concepts/scenario-capability-matrix.md

### DEX-002 [P0] [K/R] Freeze layer boundary contracts

- Status: DONE
- Outcome:
  - enforce import direction and ownership boundaries
  - deny unclassified cross-layer coupling
- Acceptance:
  - boundary tests updated
  - no private cross-layer deep imports
- Current progress:
  - boundary contract baseline docs created (en/cn)
  - top-level export path boundary contract test added and passing
  - cross-layer import boundary contract test added and passing with explicit debt freeze list
  - forbidden debt edge allowlist reduced from 8 to 0 via backend/platform/kernel/optimization contract decoupling
  - layer-import boundary test now runs with zero forbidden debt allowlist baseline
- Artifacts:
  - packages/engine/docs/en/concepts/layer-boundary-contracts.md
  - packages/engine/docs/cn/concepts/layer-boundary-contracts.md
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs

### DEX-003 [P0] [R/O] Create rolling execution backlog index

- Status: DONE
- Outcome:
  - this ledger becomes single execution source for evolution work
  - each later batch appends status/touched files/validation summary
- Acceptance:
  - all future engine direction tasks tracked in this file
- Current progress:
  - execution-record sequence contract test added and passing
  - execution-record required-field contract test added and passing
- Artifacts:
  - packages/engine/src/testing/executionLedger.contract.test.mjs

### DEX-004 [P0] [K/R] Enforce 3D-first baseline and 2D opt-in boundary

- Status: DOING
- Outcome:
  - freeze 3D-first default behavior in engine contracts and runtime profile
  - define explicit 2D module boundary and opt-in API entry for declared 2D scenarios only
- Acceptance:
  - no default runtime dependency on 2D-specific modules
  - 2D module activation requires explicit API option
- Current progress:
  - 2D-related top-level export gate added with explicit opt-in allowlist
  - create-engine contract gate added to ensure canvas2d integration remains optional
  - runtime-profile contract guards added for 3D-first baseline, explicit scenario-scoped canvas2d optionality, and backend-driven profile selection
- Artifacts:
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
  - packages/engine/src/testing/headlessModularRuntime.contract.test.ts

### DEX-005 [P0] [K/R] Enforce domain-semantic neutrality

- Status: DONE
- Outcome:
  - define engine contract rule that forbids industry product semantics and business logic
  - require scenario capabilities to be assembled from generic primitives
- Acceptance:
  - architecture docs include semantic-neutral contract checklist
  - new scenario modules pass semantic-neutral naming and contract review
- Current progress:
  - semantic-neutrality contract tests added for runtime capability descriptors
  - semantic-neutrality contract tests added for backend foundation descriptors
  - optimization policy bootstrap semantic-neutrality guard added (forbids game/editor semantics)
- Artifacts:
  - packages/engine/src/testing/semanticNeutrality.contract.test.ts
  - packages/engine/src/optimization/createEnginePolicyBootstrap.ts

### DEX-006 [P0] [R] Enforce API-first surface and concise naming governance

- Status: DONE
- Outcome:
  - lock external exposure to governed API surface
  - define concise API naming rules and review checks
- Acceptance:
  - no new bypass exports outside approved API surface
  - API contract docs include naming rules and examples
- Current progress:
  - API governance docs created (en/cn)
  - naming-governance checks wired into runtime capability contract tests and passing
  - API-surface exception-documentation gate added and passing
  - automated top-level export signature baseline guard added to block non-governed symbol-level surface drift
- Artifacts:
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
  - packages/engine/ai/engine-test-baselines-2026-05-23.json

## Phase B: Scenario Foundation Modules

### DEX-010 [P1] [K/R/O] Medical volume foundation

- Status: DOING
- Scope:
  - volume runtime contract
  - slice/MPR path
  - transfer function + residency budget hooks
- Primary scenarios: 1, 9
- Current progress:
  - runtime volume foundation contract descriptors added for slice-plan, transfer-function, and residency-budget APIs
  - runtime facade namespace added deterministic `runtime.volume.*` entry points with API-first exposure
  - capability-map and foundation-alignment contract coverage extended for runtime volume endpoints
- Artifacts:
  - packages/engine/src/orchestration/runtime/volume/runtime-volume.foundation.contract.ts
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime.facade.ts
  - packages/engine/src/orchestration/api/runtimeCapabilityMap.ts
  - packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts

### DEX-011 [P1] [K/R] Surgical planning and path simulation foundation

- Status: TODO
- Scope:
  - path constraints
  - collision/risk query contracts
  - deterministic replay hooks
- Primary scenarios: 2

### DEX-012 [P1] [K/R/P] BIM and CAD assembly semantics foundation

- Status: TODO
- Scope:
  - hierarchy/instance runtime contracts
  - generic constraint and validation channels
  - large assembly visibility pipeline
- Primary scenarios: 3, 4

### DEX-013 [P1] [K/R/O/P] GIS and geospatial runtime foundation

- Status: TODO
- Scope:
  - projection pipeline contracts
  - tile streaming + LOD budgets
  - floating origin and multi-view sync
- Primary scenarios: 5, 7

### DEX-014 [P1] [K/R/O] Digital twin replay foundation

- Status: TODO
- Scope:
  - event/timeline replay contracts
  - telemetry ingestion adapters
  - frame-budget aware playback
- Primary scenarios: 6, 7

### DEX-015 [P1] [K/R] Commerce 3D runtime foundation

- Status: TODO
- Scope:
  - variant switch graph primitive
  - material/shader permutation policy
  - stable snapshot and fast transition path
- Primary scenarios: 8

### DEX-016 [P1] [K/R/O] Game editor-runtime isomorphism foundation

- Status: TODO
- Scope:
  - authoring/runtime split contracts
  - incremental compile/extraction parity
  - runtime preview consistency APIs
- Primary scenarios: 10

### DEX-017 [P1] [P/B/R] Node runtime rendering foundation

- Status: TODO
- Scope:
  - headless runtime adapters
  - node platform protocol
  - deterministic server-side frame output
- Primary scenarios: 11

### DEX-018 [P1] [K/R/O] Vector editor first-class reinforcement

- Status: TODO
- Scope:
  - interaction latency policies
  - layered invalidation and partial redraw
  - penetration picking and snapping contracts
- Primary scenarios: 12

### DEX-019 [P1] [K/R/O] Video editor timeline and composition foundation

- Status: TODO
- Scope:
  - timeline scheduler contracts
  - monitor/viewer composition layering
  - effect overlay execution budget policies
- Primary scenarios: 13

## Phase C: Shared Runtime Infrastructure

### DEX-030 [P1] [R/O] Unified composition and multi-viewport stack

- Status: TODO
- Scope:
  - independent viewport contexts
  - layer stack ownership
  - composition surface orchestration

### DEX-031 [P1] [K/O] Incremental picking and zoom-aware precision stack

- Status: TODO
- Scope:
  - broad-phase + narrow-phase contracts
  - incremental cache invalidation rules
  - zoom-dependent precision thresholds

### DEX-032 [P1] [O/R] Frame budget and pressure arbitration graph

- Status: TODO
- Scope:
  - CPU/GPU/upload/streaming budgets
  - policy graph-based degradation rules
  - pressure observability events

### DEX-033 [P1] [K/R/P] Resource graph and streaming residency core

- Status: TODO
- Scope:
  - resource node/edge contracts
  - upload and eviction dependencies
  - residency and lifetime governance

### DEX-034 [P1] [K/R/O/P] Asset compression and decode pipeline baseline

- Status: DOING
- Scope:
  - compression-aware asset descriptor contracts (geometry/texture/volume/animation)
  - async decode/transcode scheduling with frame-budget and streaming-budget integration
  - API-first capability exposure for compressed asset ingest and runtime decode status
- Primary scenarios: 1, 3, 4, 5, 7, 8, 9, 10, 11
- Current progress:
  - compression baseline concept docs created (en/cn)
  - runtime resource contract surface extended with compression descriptor and decode-status lifecycle fields
- Artifacts:
  - packages/engine/docs/en/concepts/asset-compression-baseline.md
  - packages/engine/docs/cn/concepts/asset-compression-baseline.md
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-resource-observability.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts

### DEX-035 [P1] [P/B/R] GPU compressed texture and upload path

- Status: DOING
- Scope:
  - platform codec/transcoder adapters for compressed texture payloads
  - backend capability negotiation for compressed texture formats and fallback
  - orchestration upload path with residency/pressure-aware fallback policy
- Primary scenarios: 1, 5, 7, 8, 9, 10, 11
- Current progress:
  - runtime backend capabilities contract extended with compressed texture format list output
  - runtime foundation hard-cut coverage updated and passing
  - platform texture-compression support resolver added and wired into runtime backend diagnostics
  - fallback trace contract extended with compressed-texture fallback marker
  - texture-compression support contract tests added and passing
  - upload decision contract added (direct/transcode/uncompressed) and wired into backend capability output
  - webgl extension negotiation added through surface-aware capability probe and wired into runtime diagnostics
  - webgpu surface-probe negotiation added for compressed formats/transcode requirements and wired into runtime diagnostics
- Artifacts:
  - packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/runtime/backend/backend.foundation.contract.ts
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts

### DEX-036 [P2] [K/O/R] Geometry and animation compression runtime policy

- Status: DOING
- Scope:
  - quantization/delta/streaming chunk policy contracts for geometry and animation payloads
  - decode precision policy by zoom/LOD/interaction state
  - replay-safe deterministic decode checkpoints for node/headless runtimes
- Primary scenarios: 2, 3, 4, 6, 7, 8, 10, 11
- Current progress:
  - runtime resource compression contract extended with geometry/animation policy descriptor (quantization/delta/chunk/checkpoint/decode-context)
  - deterministic decode precision policy resolver added (interaction/far-zoom-or-low-lod/full)
  - runtime residency output extended with decode precision + checkpoint mode fields and wired through register/update lifecycle
  - runtime foundation hard-cut coverage extended for compressed resource policy registration and decompression transition reset behavior
- Artifacts:
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-resource-observability.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-registries.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts

## Phase D: Source Mining and Migration Closure

### DEX-040 [P2] [All] Source inventory from \_vnext and engine-legacy

- Status: DONE
- Scope:
  - classify reusable modules and tests
  - map each candidate to target layer and scenario
- Rules:
  - prefer package-level contracts
  - avoid private legacy path coupling
- Current progress:
  - completed workspace-wide active-reference audit for packages/\_vnext and packages/engine-legacy across apps/packages/scripts
  - confirmed no runtime/package dependency edges from canonical app/editor/engine packages to legacy staging packages
  - validated canonical parity coverage remains in packages/engine test gates after inventory pass
- Artifacts:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

### DEX-041 [P2] [All] Structured extraction implementation batches

- Status: TODO
- Scope:
  - migrate reusable logic by capability slices
  - each slice includes tests and docs sync

### DEX-042 [P2] [All] Legacy decommission readiness gate

- Status: DONE
- Scope:
  - ensure no active dependency on packages/\_vnext and engine-legacy internals
  - verify parity coverage and fallback retirement
- Current progress:
  - no active runtime/package dependency detected for removed legacy paths; remaining mentions are governance scripts, tests, and historical docs
  - engine typecheck/test/cr gates pass after legacy directory removal
  - cutover governance scripts updated to archived-mode no-op/skip behavior so legacy path removal no longer causes operational hard-fail

### DEX-043 [P3] [All] Final cleanup of \_vnext and engine-legacy

- Status: DONE
- Scope:
  - remove obsolete modules after readiness gate pass
  - keep migration notes and risk closure record
- Current progress:
  - removed packages/\_vnext directory family
  - removed packages/engine-legacy directory family
  - removed migration-only cutover/engine-vnext script family from active repository governance surface
  - retired root governance cutover command aliases to avoid invoking obsolete legacy migration paths

## Phase E: Validation and Cleanup Protocol

### DEX-050 [P0] [All] Per-slice validation record

- Status: DONE
- Required record fields:
  - touched files
  - validation commands and result
  - risk notes
  - next task ID
- Current progress:
  - execution record schema is now continuously enforced by `executionLedger.contract.test.mjs` via required marker checks across all `ER-*` blocks
  - sequential `ER-*` id contract is validated in the same suite to keep audit timeline stable

### DEX-051 [P0] [All] Cleanup-first enforcement

- Status: DONE
- Scope:
  - remove replaced code in same batch
  - forbid long-lived compatibility leftovers without explicit removal condition
- Current progress:
  - cleanup-first contract gate added to scan engine `src/` and `scripts/` for forbidden raw `TODO/FIXME/HACK` markers
  - `AI-TEMP` declarations are now contract-checked for mandatory `remove when` and `ref` removal metadata

### DEX-052 [P1] [All] Documentation and API governance sync

- Status: DONE
- Scope:
  - update en/cn docs for new runtime contracts
  - keep capability map and contract descriptors aligned
- Current progress:
  - synchronized asset-compression baseline docs (en/cn) with DEX-034/035/036 runtime contract outputs
  - synchronized API governance docs (en/cn) with descriptor-level governance alignment and checklist expectations

### DEX-053 [P0] [All] Establish engine test system orchestration

- Status: DONE
- Scope:
  - define one engine-internal test system manifest
  - enforce required test-type coverage and scenario mapping by contract test
  - remove vector-editor external environment guard from engine test gates
- Acceptance:
  - manifest created and validated by contract test
  - all 10 required test types mapped to concrete engine tests
  - scenario coverage map includes S1-S13
  - no `@venus/vector-editor-web` typecheck dependency in engine ledger gates
- Artifacts:
  - packages/engine/ai/engine-test-system-manifest-2026-05-23.json
  - packages/engine/src/testing/engineTestSystemCoverage.contract.test.mjs
  - packages/engine/docs/en/concepts/engine-testing-system.md
  - packages/engine/docs/cn/concepts/engine-testing-system.md

### DEX-054 [P1] [All] Unit test coverage track

- Status: DOING
- Scope:
  - maintain contract-level unit tests for compiler/document/view/runtime primitives
- Current progress:
  - engine testing directory partially categorized by test intent (`contract`, `parity`, `performance`, `replay`, `visual`, `fuzz`, `stress`) while preserving existing contract test behavior

### DEX-055 [P1] [All] Regression test coverage track

- Status: DOING
- Scope:
  - maintain parity and replay regression checks for canonical runtime behavior
- Current progress:
  - canonical parity coverage remains enforced by `src/testing/parity/canonicalVnext.parity-smoke.test.mjs`
  - replay determinism coverage remains enforced by `src/testing/replay/scenarioProfiles.replay.test.ts`

### DEX-056 [P1] [All] Rendering snapshot coverage track

- Status: DOING
- Scope:
  - maintain deterministic rendering snapshot proxy outputs and checks
- Current progress:
  - rendering snapshot deterministic proxy signature checks remain enforced by `src/testing/visual/renderingSnapshot.proxy.test.ts`
  - visual-regression deterministic signature checks remain enforced by `src/testing/visual/visualRegression.proxy.test.ts`

### DEX-057 [P1] [All] Performance benchmark coverage track

- Status: DOING
- Scope:
  - maintain benchmark harness and baseline metrics for frame planning/runtime loops
- Current progress:
  - performance benchmark harness finite-metric gate remains enforced by `src/testing/performance/performanceBenchmark.smoke.test.ts`
  - frame-budget diagnostics coverage remains enforced by `src/testing/performance/frameBudgetBroker.diagnostics.test.ts`

### DEX-058 [P1] [All] Interaction test coverage track

- Status: DOING
- Scope:
  - maintain interaction-flow tests for camera transform/pick/state transitions
- Current progress:
  - interaction terminology is normalized to camera-first semantics (`orbit/dolly/truck`) while preserving `pan/zoom` as input-layer aliases
  - interaction primitive docs (en/cn) now explicitly describe camera-transform mapping to avoid 2D-only interpretation drift

### DEX-059 [P1] [All] Stress test coverage track

- Status: DOING
- Scope:
  - maintain dense-scene and high-load runtime stress checks
- Current progress:
  - dense-graph ingestion and render stress path is covered by `src/testing/stress/stressRuntime.contract.test.ts`
  - dense-scene replay determinism pressure path is covered by `src/testing/replay/scenarioProfiles.replay.test.ts`

### DEX-060 [P1] [All] Visual regression coverage track

- Status: DOING
- Scope:
  - maintain deterministic visual-proxy signatures for regression detection
- Current progress:
  - rendering snapshot proxy determinism is covered by `src/testing/visual/renderingSnapshot.proxy.test.ts`
  - visual-regression proxy signature stability and baseline matching are covered by `src/testing/visual/visualRegression.proxy.test.ts`

### DEX-061 [P1] [All] E2E test coverage track

- Status: DOING
- Scope:
  - maintain hard-cut runtime end-to-end and staged integration checks
- Current progress:
  - hard-cut end-to-end runtime path is covered by `src/testing/createEngine.hard-cut.test.ts`
  - staged runtime integration chain is covered by `src/testing/stagedExecutionChain.integration.test.ts`

### DEX-062 [P1] [All] Fuzz test coverage track

- Status: DOING
- Scope:
  - maintain deterministic fuzz-input stability coverage for runtime planners
- Current progress:
  - runtime frame-planning fuzz stability is covered by `src/testing/fuzz/fuzzRuntime.contract.test.ts`

### DEX-063 [P1] [All] Deterministic test coverage track

- Status: DOING
- Scope:
  - maintain deterministic replay and snapshot checks for core runtime paths
- Current progress:
  - deterministic replay consistency is covered by `src/testing/replay/scenarioProfiles.replay.test.ts`
  - deterministic snapshot/visual signatures are covered by `src/testing/visual/renderingSnapshot.proxy.test.ts` and `src/testing/visual/visualRegression.proxy.test.ts`

### DEX-064 [P0] [B/R/P] Backend render pipeline and browser-call-chain diagnostics

- Status: DOING
- Scope:
  - verify backend render execution flow (headless/canvas2d/webgl/webgpu) can produce visible canvas output under identical scene input
  - validate browser runtime call chain from surface mount -> runtime submit -> backend present -> canvas frame visibility
  - isolate mismatch cases where hit-test path returns selectable nodes but render output is blank
  - add deterministic diagnostics outputs for render-stage checkpoints and browser bridge health state
- Acceptance:
  - blank-canvas + hit-test-positive failure mode is reproducible with one deterministic contract test fixture
  - diagnostics can pinpoint failing stage among submit/plan/backend-present/compose/browser-bridge
  - browser runtime chain contract tests confirm request/render/present events flow end-to-end
  - fix slice demonstrates at least one guarded remediation path with regression coverage
- Current progress:
  - DEX-064 contract test slice added to validate backend render chain coherence across headless/canvas2d/webgl/webgpu preferences
  - viewport-pressure probe fixture added to stress pick/render consistency under constrained view settings
  - render-chain checks now include hook/event continuity assertions around `beforeSubmit`/`afterSubmit` and `frameCompleted`
  - render result and diagnostics payload now expose stage checkpoints for `plan/compose/submit/backend-present/browser-bridge` with `failedStage` marker support
  - backend/browser diagnostics contract asserts stage checkpoints from both `engine.render()` output and `engine.getDiagnostics()` snapshot
  - deterministic unmounted non-headless fixture now reproduces browser-bridge disconnected signature with `pick` hit positive and render draw positive
  - guarded remediation path added: render marks `failedStage=browser-bridge` and emits diagnostics warning `ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED` without throwing
  - backend-present diagnostics now include adapter-level completion and skip-reason signals via canvas2d/noop present telemetry (`backendPresentCompleted`, `backendPresentSkippedReason`)
  - render path now executes backend present attempt during `engine.render()` and emits targeted warning `ENGINE_RENDER_BACKEND_PRESENT_SKIPPED` when present cannot commit
  - diagnostics warning payloads now carry structured fields (`stage`, `reason`, `remediationHint`) for backend-present and browser-bridge failure classes
  - contract coverage now includes explicit browser-bridge warning fixture where backend present succeeds but mount remains disconnected
- Artifacts:
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts

### DEX-065 [P0] [B/R] Canvas blank-frame remediation for late-bound 2D context

- Status: DOING
- Scope:
  - fix canvas2d present path so late-bound canvas contexts can recover without requiring resize or engine re-create
  - add deterministic contract fixture that reproduces first-frame missing-context followed by second-frame successful present
  - ensure diagnostics warning state converges to clean snapshot after recovery frame
- Acceptance:
  - with late-bound 2d context fixture, first render can report `missing-context` but second render must commit backend present
  - second render diagnostics must clear backend-present skip reason and `lastRenderWarning`
  - regression contract prevents permanent blank-canvas lock when context availability is delayed
- Current progress:
  - root-cause isolated: canvas2d adapter context resolution was sticky-null and did not retry after bootstrap-time miss
  - remediation in progress: per-frame context retry before declaring backend-present skip
  - deterministic recovery contract fixture added for canvas2d late-context binding
  - root-cause extension isolated: webgpu/webgl adapters are currently noop stubs, so auto-priority can resolve to non-presenting backend while scene draw/hittest stays positive
  - remediation in progress: webgpu/webgl stub adapters now route present through canvas2d compatibility path when 2d context is available
  - deterministic conformance coverage added to assert webgpu/webgl compatibility path executes canvas2d draw hooks on 2d-capable surfaces
  - app-side live triage bridge added: engine renderer now publishes deduplicated `__venusRenderChainDebug` snapshots (resolved backend, failedStage, warning payload) when render chain degrades in field sessions
- Artifacts:
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/backendAdapterRegistry.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx

## 5. Scenario-to-Task Quick Map

- S1 Medical CT/MRI: DEX-010, DEX-030, DEX-032, DEX-033, DEX-034, DEX-035
- S2 Surgical planning: DEX-011, DEX-031, DEX-032
- S3 BIM review: DEX-012, DEX-030, DEX-033, DEX-034, DEX-036
- S4 Industrial CAD: DEX-012, DEX-031, DEX-032, DEX-034, DEX-036
- S5 GIS 2D/3D: DEX-013, DEX-030, DEX-033, DEX-034, DEX-035
- S6 Auto driving twin replay: DEX-014, DEX-032, DEX-036
- S7 City-scale twin wall: DEX-013, DEX-014, DEX-033, DEX-034, DEX-035, DEX-036
- S8 E-commerce 3D: DEX-015, DEX-030, DEX-034, DEX-035, DEX-036
- S9 Molecular and volume: DEX-010, DEX-031, DEX-033, DEX-034, DEX-035
- S10 Game editor/runtime parity: DEX-016, DEX-030, DEX-032, DEX-034, DEX-035, DEX-036
- S11 Node rendering: DEX-017, DEX-033, DEX-034, DEX-035, DEX-036
- S12 Vector editor: DEX-018, DEX-031, DEX-032, DEX-064, DEX-065
- S13 Video editor: DEX-019, DEX-030, DEX-032

## 6. Working Rules

- Default classification must be one of backend/kernel/optimization/orchestration/platform.
- A sixth category can be introduced only if all are true:
  - no existing layer can own the contract without boundary breakage
  - reason and ownership documented in this ledger
  - migration and validation plan defined
- Every implementation slice must update this ledger in the same change.
- Do not execute parallel permanent tracks from \_vnext and engine-legacy once a canonical module is adopted.
- Keep engine default runtime 3D-first; never introduce mandatory 2D coupling into core runtime path.
- 2D features must be isolated as explicit opt-in module groups for explicitly declared 2D scenarios.
- Do not add industry product semantics or business logic to engine modules, contracts, names, or policies.
- Build scenario capabilities only by composing generic engine primitives and runtime APIs.
- Expose capabilities through governed API surfaces only; do not add ad hoc direct exports.
- API names must remain concise, readable, and stable across scenarios.
- Avoid over-abstraction: keep code directly understandable and maintainable for human contributors.
- Do not abstract early: extract shared modules/functions only when two or more concrete call sites exist, unless a strict contract boundary requires earlier extraction.

## 7. Execution Records

### ER-001

- Completed task: DEX-001
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/concepts/scenario-capability-matrix.md
  - packages/engine/docs/cn/concepts/scenario-capability-matrix.md
- Validation commands and result:
  - docs-only slice, compile/test validation deferred to next code slice
- Risk notes:
  - capability domains and owner mapping may need refinement when DEX-002 boundary tests are implemented
- Next task ID:
  - DEX-002

### ER-002

- In-progress task: DEX-002
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/concepts/layer-boundary-contracts.md
  - packages/engine/docs/cn/concepts/layer-boundary-contracts.md
- Validation commands and result:
  - docs-only kickoff slice, compile/test validation deferred to DEX-002 boundary-test slice
- Risk notes:
  - dependency edge rules may require adjustment after first boundary-test run against current import graph
- Next task ID:
  - DEX-002 (boundary test implementation)

### ER-003

- In-progress task: DEX-002
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - current slice only enforces top-level export path boundaries; import-graph boundary enforcement is still pending
- Next task ID:
  - DEX-002 (cross-layer import boundary contract)

### ER-004

- In-progress task: DEX-002
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - current import-boundary guard freezes known forbidden edges as baseline debt; follow-up slices must reduce this list incrementally
- Next task ID:
  - DEX-006

### ER-005

- In-progress task: DEX-006
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
- Validation commands and result:
  - docs-only governance slice, automated naming checks deferred to next DEX-006 test slice
- Risk notes:
  - without automated naming checks, governance currently depends on review discipline
- Next task ID:
  - DEX-006 (naming governance contract test)

### ER-006

- In-progress task: compression planning slice
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - planning/docs-only slice, implementation validation deferred to DEX-034/DEX-035/DEX-036
- Risk notes:
  - codec and transcode format choices must remain platform-agnostic and API-first
- Next task ID:
  - DEX-034

### ER-007

- In-progress task: DEX-006
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts (pass)
- Risk notes:
  - naming guard currently applies to runtime capability map surface; complementary export-level gate remains pending
- Next task ID:
  - DEX-004

### ER-008

- In-progress tasks: DEX-004, DEX-006, DEX-034
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
  - packages/engine/docs/en/concepts/asset-compression-baseline.md
  - packages/engine/docs/cn/concepts/asset-compression-baseline.md
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - 2D guard and export-exception guard are path-level; symbol-level governance for future top-level exports is still pending
- Next task ID:
  - DEX-003

### ER-009

- In-progress tasks: DEX-003, DEX-035
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/executionLedger.contract.test.mjs
  - packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs src/testing/executionLedger.contract.test.mjs src/testing/createEngine.hard-cut.runtime-foundation.test.ts (pass)
- Risk notes:
  - compressed texture capabilities currently expose backend-level format families; platform-transcoder and upload fallback execution are still pending DEX-035 slices
- Next task ID:
  - DEX-005

### ER-010

- In-progress tasks: DEX-005, DEX-035
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/semanticNeutrality.contract.test.ts
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts
  - packages/engine/src/orchestration/runtime/backend/backend.foundation.contract.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/semanticNeutrality.contract.test.ts src/testing/createEngine.hard-cut.runtime-foundation.test.ts src/testing/executionLedger.contract.test.mjs src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - compressed texture capability currently reports format-family support and transcode requirement only; concrete platform transcoder execution path is still pending
- Next task ID:
  - DEX-035 (upload fallback execution slice)

### ER-011

- In-progress task: DEX-035
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/textureCompressionSupport.contract.test.ts src/testing/createEngine.hard-cut.runtime-foundation.test.ts src/testing/semanticNeutrality.contract.test.ts (pass)
- Risk notes:
  - current compression support profile is mode-based and deterministic; capability negotiation by concrete GPU extension set remains pending
- Next task ID:
  - DEX-035 (backend extension negotiation slice)

### ER-012

- In-progress task: DEX-035
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/textureCompressionSupport.contract.test.ts src/testing/createEngine.hard-cut.runtime-foundation.test.ts src/testing/semanticNeutrality.contract.test.ts src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - upload decision currently resolves from backend-mode profile; concrete GPU extension negotiation probe still pending
- Next task ID:
  - DEX-035 (backend extension negotiation slice)

### ER-013

- In-progress task: DEX-035
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/package.json
  - apps/vector-editor-web/package.json
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-gpu-backend-query.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts
- Validation commands and result:
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - current extension negotiation is implemented for webgl capability surface; webgpu feature-set negotiation still uses deterministic mode profile
- Next task ID:
  - DEX-002 (forbidden edge debt reduction slice)

### ER-014

- In-progress task: DEX-002
- Burst execution checklist (10 tasks):
  - task-01: locate product-semantic tokens in optimization layer (done)
  - task-02: verify optimization product-semantic source file scope (done)
  - task-03: rename policy profile union to capability-oriented tokens (done)
  - task-04: switch default optimization profile to capability-oriented baseline (done)
  - task-05: update runtime frame resolver test fixture to neutral profile token (done)
  - task-06: extend semantic-neutrality forbidden tokens with game/editor guards (done)
  - task-07: add optimization semantic-neutral contract test for policy profiles (done)
  - task-08: re-scan optimization layer to assert no game/editor residues (done)
  - task-09: run targeted typecheck + governance contract tests (done)
  - task-10: update ledger status and execution record for this burst (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/optimization/createEnginePolicyBootstrap.ts
  - packages/engine/src/testing/createEngineFrameResolver.runtime.test.ts
  - packages/engine/src/testing/semanticNeutrality.contract.test.ts
- Validation commands and result:
  - pnpm run typecheck (pass)
  - node --import tsx --test src/testing/semanticNeutrality.contract.test.ts src/testing/createEngineFrameResolver.runtime.test.ts src/testing/textureCompressionSupport.contract.test.ts src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
- Risk notes:
  - semantic-neutrality guard now covers optimization policy profiles, but broader scenario/profile naming under non-optimization paths still requires separate cleanup slices
- Next task ID:
  - DEX-002 (forbidden edge debt reduction slice)

### ER-015

- In-progress task: DEX-002
- Burst execution checklist (20 tasks):
  - task-01: enumerate forbidden debt edges and map concrete source files (done)
  - task-02: isolate platform->backend selector coupling root (done)
  - task-03: implement protocol-local backend probe contract in platform selector (done)
  - task-04: implement protocol-local auto backend resolution logic (done)
  - task-05: preserve protocol canonical-equivalent selector behavior under tests (done)
  - task-06: remove optimization->orchestration create-engine options dependency via local options contract (done)
  - task-07: remove optimization->orchestration strategy phase dependency via local phase type (done)
  - task-08: remove kernel->orchestration strategy dependency via local interaction-kind type (done)
  - task-09: tighten boundary allowlist by removing 4 cleared debt edges (done)
  - task-10: run focused boundary + semantic + scheduler + compression tests (done)
  - task-11: identify remaining platform->orchestration dependency in texture compression contract (done)
  - task-12: replace texture compression mode dependency with platform backend-mode contract (done)
  - task-13: replace texture compression surface dependency with platform-local surface contract (done)
  - task-14: replace platform selector create-options/result dependencies with platform-local contracts (done)
  - task-15: replace kernel backend-mode dependency with platform backend-mode contract (done)
  - task-16: re-scan platform layer for orchestration public-types imports (done)
  - task-17: re-scan kernel layer for orchestration public-types and strategy imports (done)
  - task-18: tighten boundary allowlist by removing kernel/platform orchestration debt edges (done)
  - task-19: run full engine test suite + full required validation chain (done)
  - task-20: update ledger with new debt counts, residual risk, and next slice (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/platform/protocol/backend/backend-selection.ts
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/optimization/createEnginePolicyBootstrap.ts
  - packages/engine/src/optimization/frameBudgetBroker.ts
  - packages/engine/src/kernel/profile-contracts.ts
  - packages/engine/src/testing/createEngineFrameResolver.runtime.test.ts
  - packages/engine/src/testing/semanticNeutrality.contract.test.ts
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- Validation commands and result:
  - pnpm run typecheck (pass)
  - node --import tsx --test src/testing/backendSelectionProtocol.contract.test.ts src/testing/runtimeDomainExportBoundary.contract.test.mjs src/testing/semanticNeutrality.contract.test.ts src/testing/schedulerModule.contract.test.ts src/testing/frameBudgetBroker.diagnostics.test.ts (pass)
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs src/testing/backendSelectionProtocol.contract.test.ts src/testing/textureCompressionSupport.contract.test.ts src/testing/semanticNeutrality.contract.test.ts src/testing/scenarioProfiles.replay.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - backend layer still imports orchestration public-types contracts; remaining DEX-002 debt now concentrated at backend contract boundary
  - kernel scheduler still depends on optimization frame budget broker contract; further reduction requires contract inversion or relocation
- Next task ID:
  - DEX-002 (remaining 2 forbidden edge debts)

### ER-016

- Completed task: DEX-002
- Burst execution checklist (20 tasks):
  - task-01: locate residual backend->orchestration imports in backend layer source files (done)
  - task-02: locate residual kernel->optimization imports in scheduler core source files (done)
  - task-03: add backend-local contract module backed by platform protocol contracts (done)
  - task-04: migrate backend core contract to backend-local mode/surface types (done)
  - task-05: migrate backend adapter registry to backend-local mode/surface types (done)
  - task-06: migrate canvas2d adapter to backend-local surface contract (done)
  - task-07: migrate webgl adapter to backend-local surface contract (done)
  - task-08: migrate webgpu adapter to backend-local surface contract (done)
  - task-09: migrate noop adapter to backend-local resolved-mode/surface contracts (done)
  - task-10: migrate backend selector module contract to backend-local options/result types (done)
  - task-11: refactor backend selector implementation to wrap platform protocol selector (done)
  - task-12: add kernel-owned frame-budget broker implementation module (done)
  - task-13: refactor kernel scheduler contracts to depend on kernel-owned broker contracts (done)
  - task-14: refactor kernel scheduler module to use kernel-owned broker functions (done)
  - task-15: convert optimization frame-budget broker into API-compatible kernel re-export facade (done)
  - task-16: re-scan backend source for orchestration public-types imports (done)
  - task-17: re-scan kernel source for optimization frame-budget broker imports (done)
  - task-18: tighten boundary allowlist from 2 entries to empty set (done)
  - task-19: run focused typecheck + boundary + scheduler + selector regression tests (done)
  - task-20: run full mandatory validation chain and record results (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/backend/backend-contracts.ts
  - packages/engine/src/backend/backend.ts
  - packages/engine/src/backend/backendSelector.ts
  - packages/engine/src/backend/backendAdapterRegistry.ts
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/backendSelector/backendSelector.contract.ts
  - packages/engine/src/kernel/core/scheduler/frame-budget-kernel.ts
  - packages/engine/src/kernel/core/scheduler/scheduler-module-contracts.ts
  - packages/engine/src/kernel/core/scheduler/frame-budget-module.ts
  - packages/engine/src/optimization/frameBudgetBroker.ts
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- Validation commands and result:
  - pnpm run typecheck (pass)
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs src/testing/backendSelector.contract.test.ts src/testing/backendSelectionProtocol.contract.test.ts src/testing/schedulerModule.contract.test.ts src/testing/frameBudgetBroker.diagnostics.test.ts (pass)
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs && pnpm run test (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - backend selector now delegates to protocol selector implementation; parity contracts cover expected behavior but future divergence requires one-source governance
  - optimization frame-budget API is now a kernel-backed facade; contract tests confirm parity for current behavior
- Next task ID:
  - DEX-004

### ER-017

- In-progress tasks: DEX-053, DEX-054, DEX-055, DEX-056, DEX-057, DEX-058, DEX-059, DEX-060, DEX-061, DEX-062, DEX-063
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/ai/engine-test-system-manifest-2026-05-23.json
  - packages/engine/docs/en/concepts/engine-testing-system.md
  - packages/engine/docs/cn/concepts/engine-testing-system.md
  - packages/engine/src/testing/engineTestSystemCoverage.contract.test.mjs
  - packages/engine/src/testing/performanceBenchmark.smoke.test.ts
  - packages/engine/src/testing/stressRuntime.contract.test.ts
  - packages/engine/src/testing/fuzzRuntime.contract.test.ts
  - packages/engine/src/testing/renderingSnapshot.proxy.test.ts
  - packages/engine/src/testing/visualRegression.proxy.test.ts
  - packages/engine/src/backend/backendSelector/backendSelector.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/engineTestSystemCoverage.contract.test.mjs src/testing/performanceBenchmark.smoke.test.ts src/testing/stressRuntime.contract.test.ts src/testing/fuzzRuntime.contract.test.ts src/testing/renderingSnapshot.proxy.test.ts src/testing/visualRegression.proxy.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - rendering and visual regression currently use deterministic proxy signatures; pixel-level snapshot infrastructure can be added in a later slice
  - performance benchmark currently validates harness metrics shape and finite timing; policy baseline thresholds can be added after CI machine profiling normalization
- Next task ID:
  - DEX-004

### ER-018

- In-progress tasks: DEX-056, DEX-057, DEX-060, DEX-063
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/ai/engine-test-system-manifest-2026-05-23.json
  - packages/engine/ai/engine-test-baselines-2026-05-23.json
  - packages/engine/src/testing/engineTestSystemCoverage.contract.test.mjs
  - packages/engine/src/testing/performanceBenchmark.smoke.test.ts
  - packages/engine/src/testing/renderingSnapshot.proxy.test.ts
  - packages/engine/src/testing/visualRegression.proxy.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/engineTestSystemCoverage.contract.test.mjs src/testing/performanceBenchmark.smoke.test.ts src/testing/renderingSnapshot.proxy.test.ts src/testing/visualRegression.proxy.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - performance threshold is currently calibrated from local deterministic benchmark runs; CI-host variance may require periodic baseline retuning
  - rendering and visual regression remain proxy-level deterministic baselines; pixel-diff snapshot infrastructure can be introduced in later slices without changing current contract categories
- Next task ID:
  - DEX-004

### ER-019

- Completed task: DEX-006
- Burst execution checklist (20 tasks):
  - task-01: re-read active manifest coverage contract after user-side edits to avoid stale patching (done)
  - task-02: re-audit runtime export boundary contract current guards and identify symbol-level gap (done)
  - task-03: confirm current top-level barrel structure and export-statement extraction boundary (done)
  - task-04: define deterministic export-signature baseline strategy for API-surface governance (done)
  - task-05: compute canonical sha256 signature from normalized top-level export statements (done)
  - task-06: extend versioned test baseline config with apiSurface signature payload (done)
  - task-07: extend test-system coverage contract to require apiSurface baseline signature field (done)
  - task-08: add baseline-source resolver helper into runtime export-boundary contract suite (done)
  - task-09: add deterministic export-signature resolver helper using normalized export statements (done)
  - task-10: wire symbol-level signature assertion to runtime export-boundary contract suite (done)
  - task-11: preserve existing canonical-layer export-path guard behavior (done)
  - task-12: preserve existing explicit exception-documentation gate behavior (done)
  - task-13: preserve 2D opt-in export allowlist guard and avoid mandatory 2D coupling (done)
  - task-14: run focused contract tests for export-boundary + test-system-coverage gates (done)
  - task-15: run full engine typecheck gate (done)
  - task-16: run full engine test gate (done)
  - task-17: run CHANGE REQUEST gate (done)
  - task-18: update DEX-006 status and artifacts to reflect closure (done)
  - task-19: append execution record with touched files, validation results, and risk notes (done)
  - task-20: set next execution target back to pending architecture baseline track (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/ai/engine-test-baselines-2026-05-23.json
  - packages/engine/src/testing/engineTestSystemCoverage.contract.test.mjs
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- Validation commands and result:
  - node --import tsx --test src/testing/runtimeDomainExportBoundary.contract.test.mjs src/testing/engineTestSystemCoverage.contract.test.mjs (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - export-signature baseline intentionally tightens governance; legitimate top-level API-surface changes now require explicit baseline + governance update in same slice
  - signature hashes normalized export statements only; non-export code changes in barrel do not affect this guard by design
- Next task ID:
  - DEX-004

### ER-020

- In-progress task: DEX-004
- Burst execution checklist (20 tasks):
  - task-01: re-check DEX-004 acceptance text and map remaining contractization gap (done)
  - task-02: re-read runtime export-boundary suite after latest user-side edits (done)
  - task-03: inspect base profile backend baseline for default 3D-first/2D-free behavior (done)
  - task-04: inspect headless profile baseline for deterministic non-2D default path (done)
  - task-05: inspect browser profile backend priority ordering for 2D fallback placement (done)
  - task-06: inspect vector scenario profile optional/required capability split for canvas2d (done)
  - task-07: inspect createEngine runtime profile resolver for backend-driven profile selection rules (done)
  - task-08: add profile contract test import for createEngine runtime profile resolver (done)
  - task-09: add test locking base/headless non-2D backend baseline (done)
  - task-10: add test locking browser canvas2d as fallback and non-required capability (done)
  - task-11: add test locking vector scenario canvas2d as explicit optional capability (done)
  - task-12: add test locking runtime profile selection to headless/browser only (done)
  - task-13: preserve existing backend architecture-priority test behavior (done)
  - task-14: preserve existing modular runtime validation and deterministic capability tests (done)
  - task-15: run focused DEX-004 profile contract test suite (done)
  - task-16: run focused export-boundary + profile governance combined tests (done)
  - task-17: run full engine typecheck gate (done)
  - task-18: run full engine test gate (done)
  - task-19: run CR gate and confirm pass (done)
  - task-20: append execution record with touched files, validation, risks, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/headlessModularRuntime.contract.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/headlessModularRuntime.contract.test.ts src/testing/runtimeDomainExportBoundary.contract.test.mjs (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - current DEX-004 guard hardens profile-level 3D-first/2D-opt-in contracts; future dedicated 2D module families still require explicit boundary naming and separate acceptance updates
  - runtime profile resolver currently maps all non-headless backends to browser profile by design; if a new target profile is introduced later, this contract must be revised intentionally
- Next task ID:
  - DEX-034

### ER-021

- In-progress tasks: DEX-034
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-034 scope and current progress note to isolate contract-surface next slice (done)
  - task-02: inspect runtime public types for existing resource descriptor and residency contracts (done)
  - task-03: inspect runtime resource foundation implementation for storage/update lifecycle points (done)
  - task-04: confirm hard-cut runtime foundation test coverage around resource namespace APIs (done)
  - task-05: design minimal compression descriptor contract that stays domain-semantic neutral (done)
  - task-06: add compression codec and decode-stage type contracts to runtime public types (done)
  - task-07: add compressed resource descriptor and decode-status output contracts to runtime public types (done)
  - task-08: extend runtime resource descriptor contract with optional compression metadata field (done)
  - task-09: extend runtime resource patch contract with compression mutation semantics (done)
  - task-10: extend residency output contract with compression and decode-status fields (done)
  - task-11: extend runtime resource registry record with compression and decode lifecycle state (done)
  - task-12: implement deterministic compression descriptor normalization helper (done)
  - task-13: wire register path to initialize decode lifecycle for compressed/uncompressed resources (done)
  - task-14: wire update path to handle compression clear/set transitions deterministically (done)
  - task-15: add hard-cut runtime foundation assertions for compressed resource registration (done)
  - task-16: add hard-cut runtime foundation assertions for decompression transition through update patch (done)
  - task-17: run focused hard-cut runtime foundation and compression contract tests (done)
  - task-18: run full engine typecheck gate (done)
  - task-19: run full engine test gate and CR gate (done)
  - task-20: append execution record with touched files, validation results, risks, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-resource-observability.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/createEngine.hard-cut.runtime-foundation.test.ts src/testing/textureCompressionSupport.contract.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - decode lifecycle is currently deterministic-state scaffolding (queued/ready) and does not yet execute real async decode/transcode scheduling
  - compression descriptor contract is runtime-resource scoped; geometry/animation compression descriptor alignment still requires later DEX-036 follow-up
- Next task ID:
  - DEX-035

### ER-022

- In-progress tasks: DEX-035
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-035 progress and isolate remaining negotiation gap for WebGPU path (done)
  - task-02: inspect texture-compression protocol module for current WebGL-only surface negotiation branch (done)
  - task-03: inspect runtime backend diagnostics foundation for active-backend compression support resolution path (done)
  - task-04: inspect texture compression contract tests for missing WebGPU probe scenarios (done)
  - task-05: design minimal WebGPU probe payload contract that stays platform-neutral and deterministic (done)
  - task-06: add WebGPU probe interface to texture-compression surface contract (done)
  - task-07: add deterministic WebGPU probe resolver for formats/transcode requirements (done)
  - task-08: preserve default WebGPU baseline behavior when probe payload is absent (done)
  - task-09: add empty-probe fallback behavior to uncompressed upload path (done)
  - task-10: wire surface-aware support resolution for active WebGPU backend in runtime diagnostics foundation (done)
  - task-11: preserve non-WebGPU/non-WebGL backend behavior parity in diagnostics path (done)
  - task-12: add contract test for WebGPU probe positive negotiation case (done)
  - task-13: add contract test for WebGPU probe empty-format fallback case (done)
  - task-14: preserve existing WebGPU/WebGL baseline profile tests and upload-decision assertions (done)
  - task-15: run focused texture compression contract tests (done)
  - task-16: run focused runtime backend diagnostics + texture compression tests (done)
  - task-17: run full engine typecheck gate (done)
  - task-18: run full engine test gate (done)
  - task-19: run CR gate and confirm pass (done)
  - task-20: append execution record with touched files, validation results, risks, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/textureCompressionSupport.contract.test.ts src/testing/createEngine.hard-cut.runtime-foundation.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - WebGPU probe currently depends on adapter-provided surface metadata and does not yet consume native GPU adapter feature enumeration directly
  - transcode policy remains boolean-level for this slice; per-format transcode routing still requires a later deepening slice
- Next task ID:
  - DEX-036

### ER-023

- In-progress tasks: DEX-036
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-036 scope and isolate minimum runtime contract surface for geometry/animation policy (done)
  - task-02: inspect runtime services public types for existing compression/decode contracts (done)
  - task-03: inspect runtime resource observability foundation for register/update decode-state transitions (done)
  - task-04: inspect runtime registries type contracts for resource record alignment requirements (done)
  - task-05: inspect hard-cut runtime foundation tests for existing compression/decode assertions (done)
  - task-06: design quantization/delta/chunk/checkpoint policy descriptor contract staying scenario-neutral (done)
  - task-07: add decode-context contract (interaction/zoom/LOD) for deterministic precision policy selection (done)
  - task-08: add decode precision/checkpoint tokens to runtime public contracts and residency output (done)
  - task-09: wire compression policy payload into resource compression descriptor normalization path (done)
  - task-10: add deterministic decode precision resolver for interaction and far-zoom/low-lod paths (done)
  - task-11: add deterministic decode checkpoint resolver with none fallback for uncompressed resources (done)
  - task-12: wire register path to emit decode precision/checkpoint fields in residency snapshots (done)
  - task-13: wire update path to reset decode precision/checkpoint on compression clear transitions (done)
  - task-14: align runtime resource registry record contract with decode precision/checkpoint fields (done)
  - task-15: extend hard-cut runtime foundation test for uncompressed baseline precision/checkpoint assertions (done)
  - task-16: extend hard-cut runtime foundation test for compressed policy registration assertions (done)
  - task-17: extend hard-cut runtime foundation test for decompression transition precision/checkpoint reset assertions (done)
  - task-18: run focused runtime foundation + texture compression contract tests (done)
  - task-19: run full engine typecheck + full engine test + CR gate (done)
  - task-20: append execution record with touched files, validation results, risk notes, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-resource-observability.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-registries.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- Validation commands and result:
  - node --import tsx --test src/testing/createEngine.hard-cut.runtime-foundation.test.ts src/testing/textureCompressionSupport.contract.test.ts (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-036 in this slice is contract-level + deterministic resolver baseline; async decode scheduling and frame-budget integration remain pending follow-up
  - decode precision policy currently derives from descriptor decode-context snapshot and not live runtime camera/interaction feeds yet
- Next task ID:
  - DEX-036

### ER-024

- In-progress tasks: DEX-040, DEX-042, DEX-043
- Burst execution checklist (20 tasks):
  - task-01: audit workspace package graph for active dependencies on legacy packages (done)
  - task-02: inspect workspace package manifests for @venus/engine-legacy references (done)
  - task-03: inspect non-archive source/test/governance references to packages/\_vnext paths (done)
  - task-04: inspect legacy package manifests and entrypoint exports for reuse potential (done)
  - task-05: inspect staging package entrypoints under packages/\_vnext for overlap with canonical engine modules (done)
  - task-06: confirm canonical engine test boundaries still enforce no legacy runtime imports (done)
  - task-07: classify remaining references as runtime-critical vs governance/doc historical (done)
  - task-08: verify no active app/editor package imports from removed legacy directories (done)
  - task-09: re-check user request scope and lock change scope to legacy directory cleanup only (done)
  - task-10: delete packages/\_vnext directory family (done)
  - task-11: delete packages/engine-legacy directory family (done)
  - task-12: confirm git status reflects deletions without touching unrelated modified files (done)
  - task-13: run non-archive reference scan post-deletion (done)
  - task-14: confirm post-deletion references are governance/tests/docs only (done)
  - task-15: run full engine typecheck gate after deletion (done)
  - task-16: run full engine test gate after deletion (done)
  - task-17: run engine CR gate after deletion (done)
  - task-18: update DEX-040 status/progress to reflect completed inventory pass (done)
  - task-19: update DEX-042/043 progress to reflect decommission readiness + cleanup execution (done)
  - task-20: append execution record with touched files, validation results, risk notes, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/\_vnext/\*\* (deleted)
  - packages/engine-legacy/\*\* (deleted)
- Validation commands and result:
  - grep -RIn "engine-legacy\|packages/\_vnext\|@venus/engine-legacy" apps packages scripts docs package.json pnpm-workspace.yaml (pass: no active runtime dependency; remaining governance/test/doc references only)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - cutover governance scripts still reference packages/\_vnext and @venus/engine-legacy for historical rename-back analysis; this is intentional but should be retired in a later governance cleanup slice
  - some historical docs/reference text still mention removed legacy paths; references are non-runtime but may create confusion without a dedicated docs cleanup pass
- Next task ID:
  - DEX-042

### ER-025

- In-progress tasks: DEX-042, DEX-043
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-042 acceptance to isolate remaining hard-fail governance references (done)
  - task-02: inspect cutover parity gate behavior against removed engine-legacy package (done)
  - task-03: inspect cutover rename-impact report behavior against absent packages/\_vnext (done)
  - task-04: inspect cutover rename preflight behavior against absent packages/\_vnext (done)
  - task-05: inspect cutover reference rewrite behavior against absent packages/\_vnext (done)
  - task-06: inspect engine-vnext finalize-archive behavior against absent packages/\_vnext/engine (done)
  - task-07: design archived-mode policy (no-op/skip) for legacy governance scripts (done)
  - task-08: add legacy-suite availability detection and skip branch to cutover parity gate (done)
  - task-09: add archived-mode rename state handling to cutover rename-impact report (done)
  - task-10: add archived-mode no-op behavior to cutover rename preflight command (done)
  - task-11: add archived-mode no-op behavior to cutover reference rewrite command (done)
  - task-12: add archived-mode no-op behavior to engine-vnext finalize-archive command (done)
  - task-13: preserve canonical parity execution path while legacy suite is absent (done)
  - task-14: execute updated cutover-rename-preflight script and verify pass/no-op output (done)
  - task-15: execute updated cutover-rename-impact-report script and verify pass output (done)
  - task-16: execute updated cutover-reference-rewrite and finalize-archive scripts and verify no-op output (done)
  - task-17: execute updated cutover-parity-gate script and verify canonical pass + legacy skip output (done)
  - task-18: run full engine typecheck gate (done)
  - task-19: run full engine test gate + CR gate (done)
  - task-20: append execution record and update DEX-042 status/progress (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - scripts/cutover-parity-gate.mjs
  - scripts/cutover-rename-impact-report.mjs
  - scripts/cutover-rename-preflight.mjs
  - scripts/cutover-reference-rewrite.mjs
  - scripts/engine-vnext-finalize-archive.mjs
- Validation commands and result:
  - node scripts/cutover-rename-preflight.mjs && node scripts/cutover-rename-impact-report.mjs && node scripts/cutover-reference-rewrite.mjs && node scripts/engine-vnext-finalize-archive.mjs && node scripts/cutover-parity-gate.mjs (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - governance scripts now support archived-mode no-op/skip semantics; full retirement/deletion of cutover script family is still pending DEX-043 closure
  - remaining mentions of engine-legacy in runtime package boundary tests are intentional negative-boundary assertions, not runtime dependencies
- Next task ID:
  - DEX-043

### ER-026

- In-progress tasks: DEX-043
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-043 progress note and isolate remaining post-removal governance noise (done)
  - task-02: inspect current rename-impact report output for archived mode signal quality (done)
  - task-03: identify residual noise source from legacy reference scan in archived mode (done)
  - task-04: define archived-mode policy to skip legacy reference scanning when staging path is absent (done)
  - task-05: ensure archived-mode policy keeps existing rename-impact report shape stable (done)
  - task-06: update impact-reference collector signature with explicit scan enable flag (done)
  - task-07: implement early-return empty refs path for scan-disabled archived mode (done)
  - task-08: preserve staged-mode scan behavior for future forensic reruns (done)
  - task-09: add archived-mode report marker for skipped scan visibility (done)
  - task-10: wire main flow to pass scan-enable flag from rename-state staging presence (done)
  - task-11: preserve hard-blocker checks to avoid changing rename-impact fail semantics in staged mode (done)
  - task-12: preserve AI-TEMP rationale comments for deferred tool retirement path (done)
  - task-13: run updated cutover-rename-impact-report and verify archived scan skip output (done)
  - task-14: run cutover governance script chain and verify no regressions (done)
  - task-15: run full engine typecheck gate (done)
  - task-16: run full engine test gate (done)
  - task-17: run engine CR gate (done)
  - task-18: update DEX-043 progress note with archived scan-skip stabilization result (done)
  - task-19: append ER-026 execution record with validation and risks (done)
  - task-20: set next task target for DEX-043 closure slice (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - scripts/cutover-rename-impact-report.mjs
- Validation commands and result:
  - node scripts/cutover-rename-impact-report.mjs (pass)
  - node scripts/cutover-rename-preflight.mjs && node scripts/cutover-reference-rewrite.mjs && node scripts/engine-vnext-finalize-archive.mjs && node scripts/cutover-parity-gate.mjs (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - archived-mode scan skip intentionally suppresses legacy reference counts in rename-impact output, reducing noise but also reducing forensic visibility unless staging mode is restored
  - DEX-043 still requires explicit decision whether to retire or archive cutover script family permanently
- Next task ID:
  - DEX-043

### ER-027

- In-progress tasks: DEX-043, DEX-054
- Burst execution checklist (20 tasks):
  - task-01: audit engine testing directory layout and identify uncategorized top-level test files (done)
  - task-02: inspect engine test script glob behavior and detect non-recursive limitation for categorized folders (done)
  - task-03: inspect test-system manifest paths requiring synchronization with folder categorization (done)
  - task-04: design low-risk categorization slice for perf/replay/visual/parity/fuzz/stress families (done)
  - task-05: create category directories under src/testing for selected test families (done)
  - task-06: move performance benchmark and frame-budget diagnostics tests into performance category folder (done)
  - task-07: move fuzz stress tests into dedicated fuzz/stress category folders (done)
  - task-08: move rendering snapshot and visual regression tests into visual category folder (done)
  - task-09: move canonical parity smoke test into parity category folder (done)
  - task-10: move scenario replay test into replay category folder (done)
  - task-11: update moved test import paths for deeper folder depth resolution (done)
  - task-12: update moved test baseline-file path resolvers to keep ai baseline loading stable (done)
  - task-13: update engine package test command to run both root and nested categorized tests (done)
  - task-14: update cutover parity script test path for relocated canonical parity smoke test (done)
  - task-15: update engine test-system manifest file mappings for relocated categorized tests (done)
  - task-16: run full engine tests and fix discovered baseline path regressions from folder-depth shift (done)
  - task-17: rerun full engine test/typecheck/CR gates after fixes (done)
  - task-18: verify categorized layout does not break governance script behavior (done)
  - task-19: update DEX-054 progress note with categorized testing-folder status (done)
  - task-20: append ER-027 record with touched files, validation, risks, and next target (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/package.json
  - packages/engine/ai/engine-test-system-manifest-2026-05-23.json
  - scripts/cutover-parity-gate.mjs
  - packages/engine/src/testing/performance/performanceBenchmark.smoke.test.ts (moved/updated)
  - packages/engine/src/testing/performance/frameBudgetBroker.diagnostics.test.ts (moved/updated)
  - packages/engine/src/testing/fuzz/fuzzRuntime.contract.test.ts (moved/updated)
  - packages/engine/src/testing/stress/stressRuntime.contract.test.ts (moved/updated)
  - packages/engine/src/testing/visual/renderingSnapshot.proxy.test.ts (moved/updated)
  - packages/engine/src/testing/visual/visualRegression.proxy.test.ts (moved/updated)
  - packages/engine/src/testing/parity/canonicalVnext.parity-smoke.test.mjs (moved/updated)
  - packages/engine/src/testing/replay/scenarioProfiles.replay.test.ts (moved/updated)
- Validation commands and result:
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine typecheck (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - categorized test migration increased executed test count by enabling nested-folder contract suites in package test command; this is intended but changes baseline execution volume
  - historical CR/ledger text still references pre-move flat test paths; these references are archival and non-executable
- Next task ID:
  - DEX-043

### CR-DEX-043-RETIRE-CUTOVER-SCRIPTS

[CHANGE REQUEST]

Target:

- File / Module:
  - package.json
  - scripts/cutover-\*.mjs
  - scripts/engine-vnext-\*.mjs
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - decommissioned `_vnext`/`engine-legacy` migration scripts remain exposed as active governance entrypoints and prolong obsolete maintenance surface.

Change Type:

- Add / Modify / Remove
  - Remove obsolete cutover governance script family and related root script aliases.
  - Modify ledger to close DEX-043 with retirement evidence.

Impact:

- Affected modules:
  - root governance npm scripts
  - migration-only script family under `scripts/`
  - engine direction evolution ledger tracking state

Cleanup:

- Old logic to remove:
  - archived-mode no-op/skip compatibility branches kept only for removed legacy packages.

Tests:

- Tests to add/update:
  - no new unit tests; validate with monorepo typecheck/lint and engine test + CR gates.

### ER-028

- In-progress tasks: DEX-043
- Burst execution checklist (20 tasks):
  - task-01: reread DEX-043 scope and confirm retirement objective for post-decommission migration tooling (done)
  - task-02: audit root package governance scripts for active cutover command exposure (done)
  - task-03: audit scripts directory for migration-only cutover and engine-vnext tooling candidates (done)
  - task-04: verify no runtime package currently depends on cutover script outputs (done)
  - task-05: verify references are constrained to package script aliases and historical ledger notes (done)
  - task-06: add explicit CHANGE REQUEST artifact for DEX-043 retirement slice before implementation (done)
  - task-07: remove root governance cutover script aliases from package scripts (done)
  - task-08: remove cutover-archive-finalize script file from scripts folder (done)
  - task-09: remove cutover-freeze-guard script file from scripts folder (done)
  - task-10: remove cutover-parity-gate script file from scripts folder (done)
  - task-11: remove cutover-rename-preflight script file from scripts folder (done)
  - task-12: remove cutover-rename-impact-report script file from scripts folder (done)
  - task-13: remove cutover-reference-rewrite script file from scripts folder (done)
  - task-14: remove engine-vnext-cutover-dry-run script file from scripts folder (done)
  - task-15: remove engine-vnext-finalize-archive script file from scripts folder (done)
  - task-16: remove engine-vnext-post-rename-check script file from scripts folder (done)
  - task-17: update DEX-043 status/progress to closed state with retirement evidence (done)
  - task-18: run repository governance/typecheck and engine tests (done)
  - task-19: run engine CR gate to confirm artifact contract still passes (done)
  - task-20: append ER-028 record with touched files, validation, risks, and next task pointer (done)
- Touched files:
  - package.json
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - scripts/cutover-archive-finalize.mjs (deleted)
  - scripts/cutover-freeze-guard.mjs (deleted)
  - scripts/cutover-parity-gate.mjs (deleted)
  - scripts/cutover-rename-preflight.mjs (deleted)
  - scripts/cutover-rename-impact-report.mjs (deleted)
  - scripts/cutover-reference-rewrite.mjs (deleted)
  - scripts/engine-vnext-cutover-dry-run.mjs (deleted)
  - scripts/engine-vnext-finalize-archive.mjs (deleted)
  - scripts/engine-vnext-post-rename-check.mjs (deleted)
- Validation commands and result:
  - pnpm typecheck (pass)
  - pnpm governance:check (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - historical docs and ledger records still contain references to removed migration scripts for audit traceability; these references are archival and non-executable
  - if rename-back rehearsal is needed in future, cutover tooling must be restored from archive snapshots instead of current workspace scripts
- Next task ID:
  - DEX-050

### ER-029

- In-progress tasks: DEX-050
- Burst execution checklist (20 tasks):
  - task-01: re-audit Phase E task statuses to determine next primary closure target (done)
  - task-02: inspect DEX-050 required record-field definition in ledger protocol section (done)
  - task-03: locate engine execution-ledger contract test that validates ER record structure (done)
  - task-04: confirm existing contract includes required field markers for touched/validation/risk/next-task blocks (done)
  - task-05: confirm existing contract enforces sequential ER id continuity for auditability (done)
  - task-06: verify DEX-050 can be closed without adding redundant duplicate checks (done)
  - task-07: define minimal closure update for DEX-050 status transition to DONE (done)
  - task-08: draft DEX-050 progress notes referencing active contract-test enforcement boundaries (done)
  - task-09: apply DEX-050 status update and progress note in ledger (done)
  - task-10: draft ER-029 record shell with in-progress task scope and checklist anchor (done)
  - task-11: complete ER-029 checklist trace for discovery, implementation, and validation activities (done)
  - task-12: record touched-file set for DEX-050 closure slice (done)
  - task-13: run engine+dependency-scoped typecheck gate for this session policy (done)
  - task-14: run engine test gate to verify ledger contract suite remains green (done)
  - task-15: run engine CR gate to verify change-request artifact contract remains green (done)
  - task-16: validate no full-monorepo gate was required for this closure slice (done)
  - task-17: capture residual risk posture after DEX-050 closure (done)
  - task-18: set next-task pointer to remaining Phase E enforcement stream (done)
  - task-19: perform final consistency check against latest user-edited ledger content before handoff (done)
  - task-20: append ER-029 final record and commit validation evidence (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - required-field validation currently keys off markdown marker presence rather than semantic value quality; malformed but marker-complete prose can still pass
  - DEX-051 and DEX-052 remain open, so cleanup-first enforcement and docs/governance sync still require dedicated closure slices
- Next task ID:
  - DEX-051

### CR-DEX-051-CLEANUP-FIRST-ENFORCEMENT

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/cleanupFirstEnforcement.contract.test.mjs
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - cleanup-first policy had no dedicated executable gate for raw temporary markers and explicit `AI-TEMP` removal metadata.

Change Type:

- Add / Modify / Remove
  - add one contract test that enforces cleanup-first marker policy for engine source roots.
  - modify ledger to close DEX-051 with enforcement evidence.

Impact:

- Affected modules:
  - engine test-contract suite
  - engine direction evolution task ledger

Cleanup:

- Old logic to remove:
  - N/A (enforcement-only slice; no runtime compatibility branch introduced).

Tests:

- Tests to add/update:
  - add `cleanupFirstEnforcement.contract.test.mjs` and run existing engine gate chain.

### ER-030

- In-progress tasks: DEX-051
- Burst execution checklist (20 tasks):
  - task-01: re-audit DEX-051 scope and identify enforcement points suitable for contract testing (done)
  - task-02: inspect existing execution-ledger contract coverage to avoid overlapping duplicate checks (done)
  - task-03: inventory engine source areas relevant to cleanup-first policy (`src` and `scripts`) (done)
  - task-04: audit current marker usage for `TODO/FIXME/HACK` and `AI-TEMP` in engine package (done)
  - task-05: define contract assertion for forbidden raw markers in enforced roots (done)
  - task-06: define contract assertion for `AI-TEMP` removal metadata (`remove when` + `ref`) (done)
  - task-07: implement recursive enforced-file collector for engine cleanup-first test (done)
  - task-08: implement forbidden-marker detector with file+line diagnostics output (done)
  - task-09: implement `AI-TEMP` contract detector with bounded multi-line rationale window (done)
  - task-10: exclude self-test marker literals from false-positive enforcement scan (done)
  - task-11: add cleanup-first contract test file under engine testing suite (done)
  - task-12: update DEX-051 status and progress notes to reflect active enforcement closure (done)
  - task-13: run engine+dependency-scoped typecheck gate for this session policy (done)
  - task-14: run engine test gate and verify new cleanup-first contract suite passes (done)
  - task-15: run engine CR gate and verify CHANGE REQUEST contract remains green (done)
  - task-16: verify no full-monorepo validation command was required for this slice (done)
  - task-17: capture residual enforcement limitations and forward risk notes (done)
  - task-18: set next-task pointer to documentation/governance sync stream (done)
  - task-19: re-read latest ledger tail to avoid overwrite drift before appending record (done)
  - task-20: append ER-030 with touched files, validations, risks, and next task (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/src/testing/cleanupFirstEnforcement.contract.test.mjs
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - cleanup-first gate currently validates marker/form compliance and does not semantically prove that all replaced logic was deleted in every architectural refactor
  - `AI-TEMP` contract uses a bounded local window and can miss malformed metadata if rationale is split unusually far from declaration
- Next task ID:
  - DEX-052

### CR-DEX-052-TO-057-SEQUENTIAL-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/docs/en/concepts/asset-compression-baseline.md
  - packages/engine/docs/cn/concepts/asset-compression-baseline.md
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-052 remained open while DEX-034/035/036 contract semantics evolved, creating doc-contract drift risk.

Change Type:

- Add / Modify / Remove
  - modify en/cn concept docs to align with implemented runtime contract descriptors.
  - modify ledger statuses/progress records for sequential execution up to DEX-057.

Impact:

- Affected modules:
  - engine concept documentation (en/cn)
  - engine direction ledger status/progress records

Cleanup:

- Old logic to remove:
  - outdated documentation wording that no longer reflects current compression and governance contract behavior.

Tests:

- Tests to add/update:
  - no new runtime unit tests; validate through engine+dependency typecheck, full engine test, and CR gate.

### ER-031

- In-progress tasks: DEX-052, DEX-054, DEX-055, DEX-056, DEX-057
- Burst execution checklist (20 tasks):
  - task-01: re-audit ledger sequential position and confirm next open task stream starts at DEX-052 (done)
  - task-02: re-read DEX-052 scope and identify doc-contract drift risk after DEX-034/035/036 slices (done)
  - task-03: inspect latest cleanup-first test file state to avoid stale overwrite of user-side edits (done)
  - task-04: inspect en/cn asset-compression baseline docs for missing implemented contract details (done)
  - task-05: inspect en/cn api-surface-governance docs for descriptor-governance sync gaps (done)
  - task-06: define minimal DEX-052 closure delta that preserves existing doc structure while aligning semantics (done)
  - task-07: update DEX-052 status and progress notes in ledger (done)
  - task-08: add DEX-055 current progress mapping to canonical parity/replay coverage files (done)
  - task-09: add DEX-056 current progress mapping to rendering snapshot and visual proxy checks (done)
  - task-10: add DEX-057 current progress mapping to benchmark and frame-budget diagnostics coverage (done)
  - task-11: add CHANGE REQUEST artifact for this DEX-052..057 sequential sync slice (done)
  - task-12: update en asset-compression baseline doc with concrete descriptor alignment summary (done)
  - task-13: update cn asset-compression baseline doc with corresponding descriptor alignment summary (done)
  - task-14: update en API governance doc with descriptor-alignment governance checklist (done)
  - task-15: update cn API governance doc with descriptor-alignment governance checklist (done)
  - task-16: run engine+dependency-scoped typecheck gate per session rule (done)
  - task-17: run full engine test gate and verify no doc/tree parity regression (done)
  - task-18: run engine CR gate and verify contract artifact gate remains green (done)
  - task-19: capture residual risk notes for remaining open streams beyond DEX-057 (done)
  - task-20: append ER-031 with touched files, validation, risks, and next task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/concepts/asset-compression-baseline.md
  - packages/engine/docs/cn/concepts/asset-compression-baseline.md
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-054..DEX-057 remain DOING tracks; this slice synced status/docs/progress but does not finalize those coverage tracks
  - descriptor-doc sync is point-in-time and must be revalidated whenever runtime descriptor contracts change in future slices
- Next task ID:
  - DEX-058

### CR-DEX-058-CAMERA-FIRST-TERMINOLOGY-ALIGN

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/editor-integration/interaction-primitives.md
  - packages/engine/docs/cn/editor-integration/interaction-primitives.md

Goal:

- Problem being solved:
  - DEX-058 wording used `pan/zoom` directly, which could be misread as 2D-first semantics despite engine 3D-first runtime baseline.

Change Type:

- Add / Modify / Remove
  - modify DEX-058 scope wording to camera-first interaction semantics.
  - modify EN/CN interaction docs to define `pan/zoom` as input aliases mapped to camera transforms.

Impact:

- Affected modules:
  - engine direction task ledger terminology
  - editor integration interaction primitive docs (en/cn)

Cleanup:

- Old logic to remove:
  - ambiguous interaction wording that can imply 2D-only transform semantics.

Tests:

- Tests to add/update:
  - no new runtime tests; validate via engine+dependency typecheck, engine test, and CR gate.

### ER-032

- In-progress tasks: DEX-058
- Burst execution checklist (20 tasks):
  - task-01: re-check latest ledger tail and confirm DEX-058 is current sequential target (done)
  - task-02: re-evaluate DEX-058 wording against 3D-first baseline directive (done)
  - task-03: identify terminology ambiguity caused by direct `pan/zoom` wording in interaction scope (done)
  - task-04: inspect EN interaction primitive docs for camera-transform terminology gap (done)
  - task-05: inspect CN interaction primitive docs for equivalent terminology gap (done)
  - task-06: define camera-first terminology model with `pan/zoom` retained as input aliases (done)
  - task-07: update DEX-058 scope wording from pan/zoom to camera transform semantics (done)
  - task-08: add DEX-058 current progress notes documenting camera-first terminology normalization (done)
  - task-09: add CHANGE REQUEST artifact for DEX-058 terminology alignment slice (done)
  - task-10: update EN interaction doc with explicit camera transform mapping guidance (done)
  - task-11: update CN interaction doc with explicit camera transform mapping guidance (done)
  - task-12: ensure wording preserves S12 vector-editor compatibility without changing runtime contracts (done)
  - task-13: ensure wording preserves pick/state transition semantics in interaction test track (done)
  - task-14: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-15: run engine test gate and confirm docs parity test remains green (done)
  - task-16: run engine CR gate and confirm artifact contract remains green (done)
  - task-17: verify no full-monorepo validation command was used in this slice (done)
  - task-18: capture residual risk notes for DEX-059+ pending tracks (done)
  - task-19: set next-task pointer to DEX-059 for sequential continuation (done)
  - task-20: append ER-032 with touched files, validation evidence, and risks (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
  - packages/engine/docs/en/editor-integration/interaction-primitives.md
  - packages/engine/docs/cn/editor-integration/interaction-primitives.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - terminology alignment does not yet introduce dedicated camera-operation APIs; it clarifies semantic mapping only
  - DEX-059..DEX-063 remain open DOING tracks and still require execution slices for closure
- Next task ID:
  - DEX-059

### CR-DEX-059-STRESS-COVERAGE-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-059 lacked explicit progress mapping to currently active stress and dense-scene replay coverage files.

Change Type:

- Add / Modify / Remove
  - modify ledger DEX-059 progress section and append sequential execution record.

Impact:

- Affected modules:
  - engine direction evolution ledger progress tracking

Cleanup:

- Old logic to remove:
  - implicit/noisy stress-track status without concrete coverage-file linkage.

Tests:

- Tests to add/update:
  - no new runtime tests; validate through engine+dependency typecheck, engine test, and CR gate.

### ER-033

- In-progress tasks: DEX-059
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-059 is current sequential target after DEX-058 closure (done)
  - task-02: inspect DEX-059 scope for missing concrete coverage mapping details (done)
  - task-03: locate existing stress contract test file for dense-graph runtime pressure path (done)
  - task-04: locate replay test coverage for dense-scene determinism under stress-like payloads (done)
  - task-05: verify selected coverage files are still active in engine test command globs (done)
  - task-06: define minimal DEX-059 progress update without altering runtime behavior (done)
  - task-07: apply DEX-059 current progress mapping to concrete test files (done)
  - task-08: add CHANGE REQUEST artifact for DEX-059 progress sync slice (done)
  - task-09: append ER-033 shell with in-progress task scope (done)
  - task-10: complete ER-033 checklist trace for discovery and ledger update steps (done)
  - task-11: capture touched-file list for this metadata-only execution slice (done)
  - task-12: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-13: run engine test gate and verify stress/replay coverage tests remain green (done)
  - task-14: run engine CR gate and confirm change-request contract remains green (done)
  - task-15: verify no full-monorepo validation command was used in this slice (done)
  - task-16: confirm DEX-059 remains DOING because coverage track is maintained, not completed (done)
  - task-17: capture residual risk notes for DEX-060+ pending tracks (done)
  - task-18: set next-task pointer to DEX-060 for sequential continuation (done)
  - task-19: re-read latest ledger tail to prevent overwrite drift before append (done)
  - task-20: append ER-033 validation evidence and next-task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-059 is a maintenance track; current update improves visibility but does not add new stress scenarios beyond existing dense-graph and replay baselines
  - DEX-060..DEX-063 remain DOING and still need sequential execution slices for closure
- Next task ID:
  - DEX-060

### CR-DEX-060-VISUAL-COVERAGE-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-060 lacked explicit mapping between visual-regression scope and active deterministic proxy coverage tests.

Change Type:

- Add / Modify / Remove
  - modify DEX-060 progress section and append sequential execution record.

Impact:

- Affected modules:
  - engine direction evolution ledger progress tracking

Cleanup:

- Old logic to remove:
  - implicit visual-regression status without concrete test-file linkage.

Tests:

- Tests to add/update:
  - no new runtime tests; validate through engine+dependency typecheck, engine test, and CR gate.

### ER-034

- In-progress tasks: DEX-060
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-060 is the next sequential task after DEX-059 record closure (done)
  - task-02: inspect DEX-060 scope for missing concrete deterministic-visual coverage mapping (done)
  - task-03: locate rendering snapshot deterministic proxy test in current categorized testing tree (done)
  - task-04: locate visual regression proxy signature deterministic/baseline tests (done)
  - task-05: verify identified visual tests are included by current engine recursive test globs (done)
  - task-06: define minimal ledger-only DEX-060 progress sync without runtime behavior changes (done)
  - task-07: apply DEX-060 current progress mapping to concrete visual coverage files (done)
  - task-08: add CHANGE REQUEST artifact for DEX-060 visual coverage sync slice (done)
  - task-09: append ER-034 shell for sequential execution tracking (done)
  - task-10: complete ER-034 checklist for discovery, update, and validation actions (done)
  - task-11: capture touched-file list for this metadata alignment slice (done)
  - task-12: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-13: run engine test gate and verify visual proxy tests remain green (done)
  - task-14: run engine CR gate and confirm change-request artifact gate remains green (done)
  - task-15: verify no full-monorepo validation command was used in this slice (done)
  - task-16: confirm DEX-060 remains DOING as ongoing coverage-maintenance track (done)
  - task-17: capture residual risk notes for DEX-061+ pending tracks (done)
  - task-18: set next-task pointer to DEX-061 for strict sequential continuation (done)
  - task-19: re-check latest ledger tail before append to avoid overwrite drift (done)
  - task-20: append ER-034 with validation evidence and next-task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-060 remains proxy-signature based; pixel-diff visual infrastructure is not introduced in this slice
  - DEX-061..DEX-063 remain DOING and still require sequential execution records for closure
- Next task ID:
  - DEX-061

### CR-DEX-061-E2E-COVERAGE-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-061 lacked explicit mapping between E2E scope and active hard-cut/staged integration coverage tests.

Change Type:

- Add / Modify / Remove
  - modify DEX-061 progress section and append sequential execution record.

Impact:

- Affected modules:
  - engine direction evolution ledger progress tracking

Cleanup:

- Old logic to remove:
  - implicit E2E-track status without concrete test-file linkage.

Tests:

- Tests to add/update:
  - no new runtime tests; validate through engine+dependency typecheck, engine test, and CR gate.

### ER-035

- In-progress tasks: DEX-061
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-061 is current sequential target after DEX-060 record closure (done)
  - task-02: inspect DEX-061 scope for missing explicit E2E coverage-file mapping (done)
  - task-03: locate hard-cut end-to-end test coverage file in current engine testing tree (done)
  - task-04: locate staged integration-chain test coverage file for end-to-end orchestration path (done)
  - task-05: verify selected E2E coverage files are active under current test globs (done)
  - task-06: define minimal ledger-only DEX-061 progress sync without runtime behavior changes (done)
  - task-07: apply DEX-061 current progress mapping to concrete E2E coverage files (done)
  - task-08: add CHANGE REQUEST artifact for DEX-061 E2E coverage sync slice (done)
  - task-09: append ER-035 shell for sequential execution traceability (done)
  - task-10: complete ER-035 checklist trace for discovery, update, and validation actions (done)
  - task-11: capture touched-file list for this metadata alignment slice (done)
  - task-12: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-13: run engine test gate and verify hard-cut/staged integration tests remain green (done)
  - task-14: run engine CR gate and confirm change-request artifact gate remains green (done)
  - task-15: verify no full-monorepo validation command was used in this slice (done)
  - task-16: confirm DEX-061 remains DOING as an ongoing coverage-maintenance track (done)
  - task-17: capture residual risk notes for DEX-062+ pending tracks (done)
  - task-18: set next-task pointer to DEX-062 for strict sequential continuation (done)
  - task-19: re-check latest ledger tail before append to avoid overwrite drift (done)
  - task-20: append ER-035 with validation evidence and next-task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-061 still tracks maintenance coverage and does not expand E2E scenario breadth beyond current hard-cut and staged paths
  - DEX-062..DEX-063 remain DOING and still require sequential execution slices for closure
- Next task ID:
  - DEX-062

### CR-DEX-062-FUZZ-COVERAGE-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-062 lacked explicit linkage between fuzz-coverage scope and active deterministic fuzz planner test.

Change Type:

- Add / Modify / Remove
  - modify DEX-062 progress section and append sequential execution record.

Impact:

- Affected modules:
  - engine direction evolution ledger progress tracking

Cleanup:

- Old logic to remove:
  - implicit fuzz-track status without concrete test-file mapping.

Tests:

- Tests to add/update:
  - no new runtime tests; validate through engine+dependency typecheck, engine test, and CR gate.

### ER-036

- In-progress tasks: DEX-062
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-062 is current sequential target after DEX-061 record closure (done)
  - task-02: inspect DEX-062 scope for missing explicit fuzz-coverage file linkage (done)
  - task-03: locate deterministic fuzz planner stability test in categorized testing tree (done)
  - task-04: verify fuzz coverage file is active under current engine recursive test globs (done)
  - task-05: define minimal ledger-only DEX-062 progress sync without runtime behavior changes (done)
  - task-06: apply DEX-062 current progress mapping to concrete fuzz coverage file (done)
  - task-07: add CHANGE REQUEST artifact for DEX-062 fuzz coverage sync slice (done)
  - task-08: append ER-036 shell for sequential execution traceability (done)
  - task-09: complete ER-036 checklist trace for discovery, update, and validation actions (done)
  - task-10: capture touched-file list for this metadata alignment slice (done)
  - task-11: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-12: run engine test gate and verify fuzz coverage tests remain green (done)
  - task-13: run engine CR gate and confirm change-request artifact gate remains green (done)
  - task-14: verify no full-monorepo validation command was used in this slice (done)
  - task-15: confirm DEX-062 remains DOING as an ongoing coverage-maintenance track (done)
  - task-16: capture residual risk notes for DEX-063+ pending tracks (done)
  - task-17: set next-task pointer to DEX-063 for strict sequential continuation (done)
  - task-18: re-check latest ledger tail before append to avoid overwrite drift (done)
  - task-19: confirm prior ER ordering remains contiguous after append (done)
  - task-20: append ER-036 with validation evidence and next-task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-062 remains maintenance-oriented and currently covers deterministic planner fuzz stability rather than expanded random-distribution families
  - DEX-063 remains DOING and still requires a dedicated sequential execution slice
- Next task ID:
  - DEX-063

### CR-DEX-063-DETERMINISM-COVERAGE-SYNC

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-063 lacked explicit linkage between deterministic coverage scope and active replay/snapshot deterministic tests.

Change Type:

- Add / Modify / Remove
  - modify DEX-063 progress section and append sequential execution record.

Impact:

- Affected modules:
  - engine direction evolution ledger progress tracking

Cleanup:

- Old logic to remove:
  - implicit deterministic-track status without concrete replay/snapshot coverage mapping.

Tests:

- Tests to add/update:
  - no new runtime tests; validate through engine+dependency typecheck, engine test, and CR gate.

### ER-037

- In-progress tasks: DEX-063
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-063 is current sequential target after DEX-062 record closure (done)
  - task-02: inspect DEX-063 scope for missing explicit deterministic replay/snapshot linkage (done)
  - task-03: locate deterministic replay coverage tests in replay scenario profile suite (done)
  - task-04: locate deterministic snapshot/visual-signature coverage tests in visual suites (done)
  - task-05: verify deterministic coverage files are active under current recursive test globs (done)
  - task-06: define minimal ledger-only DEX-063 progress sync without runtime behavior changes (done)
  - task-07: apply DEX-063 current progress mapping to concrete replay/snapshot coverage files (done)
  - task-08: add CHANGE REQUEST artifact for DEX-063 deterministic coverage sync slice (done)
  - task-09: append ER-037 shell for sequential execution traceability (done)
  - task-10: complete ER-037 checklist trace for discovery, update, and validation actions (done)
  - task-11: capture touched-file list for this metadata alignment slice (done)
  - task-12: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-13: run engine test gate and verify deterministic replay/snapshot tests remain green (done)
  - task-14: run engine CR gate and confirm change-request artifact gate remains green (done)
  - task-15: verify no full-monorepo validation command was used in this slice (done)
  - task-16: confirm DEX-063 remains DOING as ongoing deterministic coverage-maintenance track (done)
  - task-17: capture residual risk notes for remaining scenario-foundation TODO streams (done)
  - task-18: set next-task pointer to DEX-010 for return to unresolved Phase B scenario foundations (done)
  - task-19: re-check latest ledger tail before append to avoid overwrite drift (done)
  - task-20: append ER-037 with validation evidence and next-task pointer (done)
- Touched files:
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - DEX-063 remains proxy/replay deterministic guard coverage and does not yet include cross-platform pixel-diff determinism
  - large scenario-foundation streams (DEX-010..DEX-019) remain TODO and block full-ledger closure
- Next task ID:
  - DEX-010

### CR-DEX-064-RENDER-CHAIN-CONTRACT-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - customer-facing symptom indicates blank canvas while hit-test still resolves nodes; current engine contracts lacked explicit reproducibility and backend/browser-chain coherence guards for this failure signature.

Change Type:

- Add / Modify / Remove
  - add backend/browser render-chain contract tests for event/hook continuity and draw visibility.
  - add deterministic mismatch fixture for hit-positive/draw-zero signature.
  - modify DEX-064 status/progress and append execution record.

Impact:

- Affected modules:
  - engine testing contract suite
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (test and tracking slice only).

Tests:

- Tests to add/update:
  - add `backendRenderBrowserChain.contract.test.ts` and run engine session validation gates.

### ER-038

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 is the active diagnostics track for blank-canvas/hit-positive symptom (done)
  - task-02: inspect render orchestration path for drawCount and visibility signal origin (done)
  - task-03: inspect graph-render facade for render hooks/events continuity points (done)
  - task-04: inspect existing hard-cut tests for missing backend/browser-chain guard coverage (done)
  - task-05: design deterministic backend render-chain contract fixture spanning headless/canvas2d/webgl/webgpu preferences (done)
  - task-06: design viewport-pressure probe fixture to stress pick/render chain invariants (done)
  - task-07: add backend render-chain contract test file under categorized contract tests (done)
  - task-08: add hook/event continuity assertions for beforeSubmit/afterSubmit/frameCompleted/frameFailed (done)
  - task-09: add backend resolved-mode domain assertions for cross-backend preference checks (done)
  - task-10: add viewport-pressure fixture confirming pick/render chain remains coherent in core runtime path (done)
  - task-11: update DEX-064 status and artifact mapping in ledger (done)
  - task-12: append DEX-064 CHANGE REQUEST artifact for this diagnostics test slice (done)
  - task-13: append ER-038 execution trace block with touched files and validation placeholders (done)
  - task-14: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-15: run engine test gate and confirm new backend/browser-chain contracts are green (done)
  - task-16: run engine CR gate and verify change-request artifact contract remains green (done)
  - task-17: verify no full-monorepo validation command was used in this slice (done)
  - task-18: capture residual risk for present-stage diagnostics granularity still pending (done)
  - task-19: set next-task pointer to DEX-064 follow-up remediation slice (done)
  - task-20: finalize ER-038 record for ledger continuity (done)
- Touched files:
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - current slice validates core runtime hook/event and draw-chain coherence but does not yet reproduce customer-reported blank-present symptom
  - browser-chain continuity is currently inferred via render hooks/events; dedicated bridge-stage diagnostics fields remain follow-up work
- Next task ID:
  - DEX-064

### CR-DEX-064-STRUCTURED-WARNING-PAYLOAD-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - warning events existed for backend-present and browser-bridge issues, but payload semantics were not structured enough to support deterministic downstream triage and adapter/tooling assertions.

Change Type:

- Add / Modify / Remove
  - modify diagnostics warning payloads to include explicit stage, reason, and remediation hints.
  - add contract assertions for structured warning payloads and a dedicated browser-bridge warning fixture.
  - update DEX-064 ledger progress and execution record.

Impact:

- Affected modules:
  - orchestration graph render warning telemetry
  - backend/browser diagnostics contract tests
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (payload enrichment and contract tightening only).

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` with structured payload assertions for `ENGINE_RENDER_BACKEND_PRESENT_SKIPPED` and `ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED`.

### ER-039

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 next refinement target is structured warning payload semantics (done)
  - task-02: inspect render warning emission payloads for backend-present and browser-bridge paths (done)
  - task-03: inspect existing backend/browser contract tests for warning payload assertion gaps (done)
  - task-04: define stable warning schema fields (`stage`, `reason`, `remediationHint`) for triage consumers (done)
  - task-05: enrich backend-present warning payload with structured stage/reason/remediation fields (done)
  - task-06: enrich browser-bridge warning payload with structured stage/reason/remediation fields (done)
  - task-07: keep existing warning code tokens stable for compatibility (`ENGINE_RENDER_BACKEND_PRESENT_SKIPPED`, `ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED`) (done)
  - task-08: update canonical backend-preference contract loop with backend-present structured warning assertions (done)
  - task-09: update unmounted canvas2d fixture with backend-present structured warning assertions (done)
  - task-10: add dedicated unmounted webgl fixture where backend present succeeds but browser bridge disconnect warning is expected (done)
  - task-11: validate warning-stage precedence remains deterministic (`backend-present` before `browser-bridge` when both conditions exist) (done)
  - task-12: update DEX-064 progress notes to reflect structured warning payload coverage (done)
  - task-13: append DEX-064 CHANGE REQUEST artifact for structured-warning payload slice (done)
  - task-14: append ER-039 execution record with touched files and risks (done)
  - task-15: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-16: run engine test gate and verify warning payload contract assertions are green (done)
  - task-17: run engine CR gate and verify ledger artifact governance remains green (done)
  - task-18: verify execution ledger sequencing stays contiguous after new ER append (done)
  - task-19: capture residual risk around real-adapter telemetry depth and pixel-readback absence (done)
  - task-20: set next-task pointer to DEX-064 adapter-level real-present telemetry continuation (done)
- Touched files:
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - structured warning semantics are deterministic, but webgl/webgpu still rely on noop present callbacks until concrete adapters land
  - diagnostics remain stage/adapter-signal based and still do not include framebuffer pixel-readback truth source
- Next task ID:
  - DEX-064

### CR-DEX-064-BROWSER-BRIDGE-REPRO-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-064 still lacked deterministic reproduction for a present-path-disconnected symptom class where selection/hit remains available but browser frame visibility path is not reachable.

Change Type:

- Add / Modify / Remove
  - modify render diagnostics path to mark browser-bridge soft failure stage and emit a targeted diagnostics warning.
  - add contract fixture for unmounted non-headless browser-bridge disconnect signature.
  - update DEX-064 ledger progress and execution records.

Impact:

- Affected modules:
  - orchestration render facade diagnostics behavior
  - public render-chain diagnostics semantics
  - backend/browser diagnostics contract tests
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (no legacy branch removal in this slice).

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` with deterministic browser-bridge disconnect reproduction and warning assertions.

### ER-040

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 third slice objective is deterministic browser-bridge disconnect reproduction (done)
  - task-02: inspect current render-chain diagnostics implementation for soft-failure insertion point (done)
  - task-03: inspect backend/browser contract tests for extension point to host new reproduction fixture (done)
  - task-04: define non-throw remediation behavior for browser-bridge disconnect to preserve runtime continuity (done)
  - task-05: add render-path soft-failure stage marker for `browser-bridge` when mount is disconnected on non-headless backend (done)
  - task-06: add diagnostics warning emission with deterministic code for browser-bridge disconnect events (done)
  - task-07: align render-chain contract wording to include hard/soft failure stage semantics (done)
  - task-08: add deterministic contract fixture for unmounted non-headless `pick-hit + draw-positive + bridge-disconnected` signature (done)
  - task-09: add diagnostics warning count/code assertions in browser-bridge reproduction fixture (done)
  - task-10: keep existing backend coherence and viewport-pressure fixtures green under new diagnostics behavior (done)
  - task-11: update DEX-064 progress text with deterministic reproduction and guarded remediation outcomes (done)
  - task-12: append DEX-064 CHANGE REQUEST artifact for browser-bridge reproduction slice (done)
  - task-13: append ER-040 execution record with touched files and risk notes (done)
  - task-14: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-15: run engine test gate and verify new reproduction fixture and existing contracts are green (done)
  - task-16: run engine CR gate and verify ledger artifact governance remains green (done)
  - task-17: verify no full-monorepo validation command was used (done)
  - task-18: capture residual risk for true pixel-visibility confirmation still inferred (done)
  - task-19: set next-task pointer to DEX-064 present-stage deep diagnostics follow-up (done)
  - task-20: finalize ER-040 record for sequential ledger continuity (done)
- Touched files:
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - reproduction now covers browser-bridge disconnect deterministically, but it still models present failure via mount connectivity signals rather than direct framebuffer pixel-readback
  - backend-present and browser-bridge checkpoints are now observable, yet fine-grained adapter-level present-call telemetry remains a follow-up opportunity
- Next task ID:
  - DEX-064

### CR-DEX-010-VOLUME-FOUNDATION-CONTRACT-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/runtime/volume/runtime-volume.foundation.contract.ts
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/public-types/runtime-capability.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime.facade.ts
  - packages/engine/src/orchestration/api/runtimeCapabilityMap.ts
  - packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-010 lacked executable runtime contracts for volume slice planning, transfer-function resolution, and residency-budget hooks under API-first runtime namespace governance.

Change Type:

- Add / Modify / Remove
  - add runtime volume foundation contract descriptors and public runtime type contracts.
  - modify runtime facade and capability map to expose deterministic `runtime.volume.*` endpoints.
  - modify capability-alignment/runtime-capability tests and ledger progress records for DEX-010.

Impact:

- Affected modules:
  - orchestration runtime foundation contracts
  - runtime public API types and runtime facade namespace
  - runtime capability governance tests
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (new foundation slice; no compatibility branch introduced).

Tests:

- Tests to add/update:
  - update runtime capability map contract coverage with volume namespace assertions.
  - update foundation alignment coverage to include runtime volume descriptor family.

### ER-041

- In-progress tasks: DEX-010
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-010 is current sequential target after ER-037 handoff (done)
  - task-02: inspect runtime capability map and runtime facade surfaces for API-first extension points (done)
  - task-03: inspect runtime foundation-alignment contract wiring to identify descriptor-family extension path (done)
  - task-04: design semantic-neutral volume foundation API names under `engine.runtime.volume.*` namespace (done)
  - task-05: add runtime volume foundation descriptor contract module with deterministic guarantees (done)
  - task-06: add runtime volume public type contracts for slice-plan, transfer-function, and residency-budget hooks (done)
  - task-07: add runtime volume namespace field to canonical `EngineRuntimeApi` contract (done)
  - task-08: implement deterministic `runtime.volume.createSlicePlan` facade path (done)
  - task-09: implement deterministic `runtime.volume.resolveTransferFunction` facade path (done)
  - task-10: implement deterministic `runtime.volume.resolveResidencyBudget` facade path with resource-hook integration (done)
  - task-11: register runtime volume capability descriptors in capability map and bump schema version (done)
  - task-12: include runtime volume descriptor family in foundation-alignment helper (done)
  - task-13: extend runtime capability map contract tests for volume endpoint entries and method-level assertions (done)
  - task-14: update DEX-010 status/progress/artifacts in ledger Phase B section (done)
  - task-15: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-16: run engine test gate and verify runtime capability/foundation contracts remain green (done)
  - task-17: run engine CR gate and verify change-request artifact contract remains green (done)
  - task-18: verify no full-monorepo validation command was used in this slice (done)
  - task-19: capture residual risks for remaining DEX-010 follow-up depth (asynchronous decode/MPR math deepening) (done)
  - task-20: append ER-041 with touched files, validation evidence, and next-task pointer (done)
- Touched files:
  - packages/engine/src/orchestration/runtime/volume/runtime-volume.foundation.contract.ts
  - packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
  - packages/engine/src/orchestration/api/public-types/runtime-capability.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime.facade.ts
  - packages/engine/src/orchestration/api/runtimeCapabilityMap.ts
  - packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - current DEX-010 slice establishes deterministic API/contracts and residency hooks but does not yet implement full MPR matrix math or asynchronous volume streaming/decode orchestration
  - residency-budget hook currently consumes resource residency snapshots and missing-resource reporting; adaptive runtime pressure arbitration integration remains follow-up work
- Next task ID:
  - DEX-010

### CR-DEX-064-STAGE-DIAGNOSTICS-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-064 first slice validated core render/hook continuity, but diagnostics still could not pinpoint stage boundaries across submit/plan/backend-present/browser-bridge for customer-reported blank-canvas symptoms.

Change Type:

- Add / Modify / Remove
  - add render-chain stage diagnostics contract in public render/diagnostics payloads.
  - modify render facade to populate stage checkpoints and failure-stage marker per render attempt.
  - modify diagnostics snapshot assembly and contract tests to assert stage visibility from both render result and diagnostics bridge.

Impact:

- Affected modules:
  - orchestration API render facade and diagnostics aggregation
  - public API type contracts for render and diagnostics payloads
  - engine contract tests for backend/browser chain diagnostics
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (diagnostics enrichment slice only).

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` with stage-diagnostics assertions across canonical backend preferences and viewport-pressure probe path.

### ER-042

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 follow-up scope is stage-level diagnostics for backend/browser chain checkpoints (done)
  - task-02: inspect render result/public diagnostics type contracts for extension points (done)
  - task-03: inspect graph-render facade to identify deterministic stage boundary hooks for instrumentation (done)
  - task-04: inspect diagnostics snapshot assembly path in createEngine runtime backend diagnostics foundation (done)
  - task-05: design minimal stage diagnostics contract with `failedStage` marker for plan/compose/submit/backend-present/browser-bridge (done)
  - task-06: add public type contract `EngineRenderChainDiagnostics` and wire optional fields on render/diagnostics payloads (done)
  - task-07: instrument render facade success path to set stage checkpoints and backend/browser reachability bits (done)
  - task-08: instrument render facade failure path to set `failedStage` deterministically from reached-stage snapshot (done)
  - task-09: add createEngine closure state for latest render-chain diagnostics snapshot (done)
  - task-10: expose latest render-chain diagnostics through `engine.getDiagnostics()` aggregation path (done)
  - task-11: align backend diagnostics foundation dependency contract with new optional render-chain payload field (done)
  - task-12: update backend/browser chain contract tests to assert render-result stage checkpoints (done)
  - task-13: update backend/browser chain contract tests to assert diagnostics snapshot stage checkpoints (done)
  - task-14: update DEX-064 progress/artifact map in execution ledger (done)
  - task-15: append DEX-064 CHANGE REQUEST artifact for stage-diagnostics slice (done)
  - task-16: append ER-042 execution record with touched files and risk notes (done)
  - task-17: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-18: run engine test gate and verify backend/browser chain diagnostics assertions remain green (done)
  - task-19: run engine CR gate and verify ledger artifact contract remains green (done)
  - task-20: set next-task pointer for DEX-064 reproducibility/remediation follow-up slice (done)
- Touched files:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - stage diagnostics now identify orchestration boundaries but backend-present/browser-bridge checks remain inferred signals, not direct framebuffer pixel-visibility confirmation
  - customer-reported blank-canvas + hit-positive symptom still needs deterministic reproduction fixture that fails before remediation, then guarded fix
- Next task ID:
  - DEX-064

### CR-DEX-064-BACKEND-PRESENT-TELEMETRY-SLICE

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.foundation.ts
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - DEX-064 diagnostics could identify stage boundaries but lacked adapter-level present completion evidence, making backend-present failures difficult to distinguish from browser-bridge disconnections.

Change Type:

- Add / Modify / Remove
  - add canvas2d/noop adapter present telemetry hooks (attempt/skipped/committed).
  - modify backend resolution and render facade path to consume adapter telemetry and emit backend-present skipped warnings.
  - modify render-chain contract and contract tests to assert backend-present completion/skipped diagnostics.

Impact:

- Affected modules:
  - backend adapter telemetry surface for canvas2d
  - orchestration render diagnostics pipeline
  - public render-chain diagnostics contract
  - backend/browser diagnostics contract tests
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (diagnostics depth extension only).

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` to validate `backendPresentCompleted` and `backendPresentSkippedReason` across canonical backend preferences and unmounted reproduction fixture.

### ER-043

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 next depth is adapter-level backend-present completion telemetry (done)
  - task-02: inspect backend adapter contracts for present-hook extension points (done)
  - task-03: inspect backend resolution path to merge diagnostics hooks without breaking existing draw hooks (done)
  - task-04: design adapter telemetry schema for attempted/committed/skipped reason signals (done)
  - task-05: extend canvas2d adapter hooks with present telemetry callbacks (done)
  - task-06: instrument canvas2d renderFrame to emit attempt/skipped/committed callbacks deterministically (done)
  - task-07: extend resolveEngineBackend to merge runtime diagnostics hooks with external canvas2d draw hooks (done)
  - task-08: add backend present telemetry state to createEngine closure and wire hook updates (done)
  - task-09: update graph render facade dependencies to trigger backend present attempt during `engine.render()` (done)
  - task-10: enrich render-chain diagnostics with backend-present completion and skip-reason fields (done)
  - task-11: emit targeted diagnostics warning when backend present is skipped (`ENGINE_RENDER_BACKEND_PRESENT_SKIPPED`) (done)
  - task-12: preserve browser-bridge warning semantics with stage-precedence guard to avoid overwrite of backend-present failures (done)
  - task-13: update backend/browser contract tests for backendPresentCompleted/skippedReason assertions (done)
  - task-14: update DEX-064 progress/artifacts in execution ledger (done)
  - task-15: append DEX-064 CHANGE REQUEST artifact for backend-present telemetry slice (done)
  - task-16: append ER-043 execution record with touched files and risk notes (done)
  - task-17: run engine+dependency-scoped typecheck gate per session policy (done)
  - task-18: run engine test gate and verify enriched diagnostics contract coverage remains green (done)
  - task-19: run engine CR gate and verify ledger governance checks remain green (done)
  - task-20: set next-task pointer to DEX-064 present-call adapter telemetry follow-up refinement (done)
- Touched files:
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.foundation.ts
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - adapter-level present completion is now explicit for canvas2d and noop-backed paths; webgl/webgpu still inherit no-op completion semantics until real adapters land
  - diagnostics still do not include direct framebuffer pixel-readback validation; present success reflects adapter callback completion semantics
- Next task ID:
  - DEX-064

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts

Goal:

- Problem being solved:
  - Backend/browser render-chain warnings were structured but lacked stable telemetry source semantics and were only observable through event listeners.
  - Diagnostics polling surfaces could not read last warning state directly, which slowed triage when event listeners were unavailable.

Change Type:

- Add / Modify / Remove
  - add `EngineRenderWarningPayload` public contract with stable telemetry source field.
  - modify render facade warning emission to use canonical payload helper and synchronize latest warning snapshot.
  - modify diagnostics snapshot contract/foundation to expose `lastRenderWarning`.
  - modify contract tests to assert telemetry source and diagnostics-event parity.

Impact:

- Affected modules:
  - public diagnostics/render contracts
  - render orchestration warning emission path
  - backend diagnostics foundation typing
  - backend/browser render-chain contract tests

Cleanup:

- Old logic to remove:
  - remove implicit duplicated warning payload literals by routing emission through one helper in render facade.

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` to assert `telemetrySource` and `diagnostics.lastRenderWarning` parity for both backend-present and browser-bridge warning paths.

### ER-044

- In-progress tasks: DEX-064
- Burst execution checklist (20 tasks):
  - task-01: confirm DEX-064 next slice as warning-source contract + diagnostics snapshot parity (done)
  - task-02: inspect current public diagnostics/render type boundaries for additive compatibility (done)
  - task-03: inspect render facade warning emission sites and stage-precedence guards (done)
  - task-04: define canonical `EngineRenderWarningPayload` with stable warning code/stage/reason/source semantics (done)
  - task-05: add `telemetrySource` signal to distinguish adapter-present evidence from mount-bridge checks (done)
  - task-06: extend diagnostics snapshot public contract with `lastRenderWarning` polling field (done)
  - task-07: extend backend diagnostics foundation dependency typing for `lastRenderWarning` passthrough (done)
  - task-08: add latest-warning state in createEngine closure for render diagnostics persistence (done)
  - task-09: wire latest-warning field into `resolveDiagnosticsSnapshot` payload assembly (done)
  - task-10: extend graph-render facade dependencies with warning state setter callback (done)
  - task-11: add render-facade helper to synchronize warning event emission and diagnostics snapshot state (done)
  - task-12: route backend-present warning through canonical helper and set telemetry source token (done)
  - task-13: route browser-bridge warning through canonical helper and set telemetry source token (done)
  - task-14: clear latest warning at render start to avoid stale warning carryover across clean frames (done)
  - task-15: extend contract test warning capture shapes with `telemetrySource` (done)
  - task-16: assert diagnostics `lastRenderWarning` parity for canvas2d backend-present warning path (done)
  - task-17: assert diagnostics `lastRenderWarning` parity for webgl browser-bridge warning path (done)
  - task-18: assert warning-free backend paths keep diagnostics `lastRenderWarning` at null (done)
  - task-19: run engine+dependency typecheck and contract test gates (done)
  - task-20: run CR gate and preserve sequential ledger continuity with ER-044 append (done)
- Touched files:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - `lastRenderWarning` is latest-frame scoped and intentionally cleared at render start; external tooling should still consume warning events for full history.
  - Warning `telemetrySource` is additive and stable for current adapters, but future real webgl/webgpu present paths may introduce additional source tokens.
- Next task ID:
  - DEX-064

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - In late-bound host setups, canvas2d adapter could lock into permanent `missing-context` state after bootstrap probe failure, causing blank canvas while runtime pick/hittest stays positive.

Change Type:

- Add / Modify / Remove
  - modify canvas2d adapter render path to retry context resolution on each frame when context is absent.
  - add deterministic contract test for first-frame skip and second-frame recovery.
  - add task insertion and execution record updates for DEX-065.

Impact:

- Affected modules:
  - canvas2d backend adapter present path
  - backend/browser render-chain contract coverage
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - remove sticky-null context behavior that required external resize/recreate to recover present path.

Tests:

- Tests to add/update:
  - update `backendRenderBrowserChain.contract.test.ts` with late-bound canvas fixture to assert recovery and warning-state convergence.

### ER-045

- In-progress tasks: DEX-064, DEX-065
- Burst execution checklist (20 tasks):
  - task-01: register new urgent blank-canvas remediation task in execution ledger (done)
  - task-02: inspect canvas2d adapter present path for sticky-state failure points (done)
  - task-03: confirm current render diagnostics signature for missing-context skip path (done)
  - task-04: isolate late-bound context scenario where bootstrap probe can return null temporarily (done)
  - task-05: design smallest remediation preserving adapter contract compatibility (done)
  - task-06: modify canvas2d render path to retry context resolution before skip decision (done)
  - task-07: preserve existing present telemetry callbacks around retry path (done)
  - task-08: retain deterministic clear baseline behavior after recovered context attach (done)
  - task-09: add deterministic late-bound canvas fixture in backend/browser contract tests (done)
  - task-10: add first-render assertion for backend-present skipped signature (done)
  - task-11: add second-render assertion for backend-present completed recovery signature (done)
  - task-12: assert recovery frame clears `failedStage` to null (done)
  - task-13: assert diagnostics `lastRenderWarning` converges to null after recovered frame (done)
  - task-14: update DEX-065 progress section with root-cause and remediation details (done)
  - task-15: sync S12 scenario quick-map to include DEX-065 (done)
  - task-16: append CHANGE REQUEST artifact for remediation slice (done)
  - task-17: run engine+dependency typecheck gate (done)
  - task-18: run engine test gate and verify new recovery fixture passes (done)
  - task-19: run engine CR gate and verify sequential ledger contract remains green (done)
  - task-20: set next task pointer to continue DEX-065/DEX-064 browser-chain hardening (done)
- Touched files:
  - packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - remediation relies on per-frame context probe when context is null; host canvases with permanently unavailable contexts still emit deterministic skip warnings.
  - this slice addresses late-binding blank-frame lock but does not yet validate pixel readback correctness.
- Next task ID:
  - DEX-065

[CHANGE REQUEST]

Target:

- File / Module:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - Customer still reports blank canvas after backend compatibility fixes; field sessions need immediate render-chain evidence (resolved backend + failed stage + warning payload) from real app runtime without reproducing in isolated engine tests only.

Change Type:

- Add / Modify / Remove
  - modify engine renderer scheduler render callback to publish deduplicated runtime render-chain diagnostics snapshots into window bridge state.
  - modify DEX-065 ledger progress and execution records to include app-side triage bridge slice.

Impact:

- Affected modules:
  - vector editor runtime engine bridge renderer diagnostics path
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - N/A (diagnostics visibility extension only).

Tests:

- Tests to add/update:
  - no new app contract test in this slice; validate by existing vector runtime bridge test and full engine gate suite.

### ER-046

- In-progress tasks: DEX-064, DEX-065
- Burst execution checklist (20 tasks):
  - task-01: validate customer feedback and pivot from adapter-only fixes to app-runtime evidence capture (done)
  - task-02: inspect vector engine renderer lifecycle wiring for stable per-frame diagnostics hook point (done)
  - task-03: inspect scheduler render callback path to ensure every engine render passes through one interception point (done)
  - task-04: inspect existing app diagnostics bridge conventions (`__venusZeroVisibilityDebug`) for non-invasive pattern reuse (done)
  - task-05: design minimal render-chain debug payload (backend requested/resolved, failedStage, warning, draw/visible counts) (done)
  - task-06: add dedupe ref to avoid repeatedly writing identical failure snapshots every frame (done)
  - task-07: inject render callback post-render inspection (`renderResult.renderChain` + `engine.getDiagnostics`) (done)
  - task-08: compute publish condition using warning presence and degraded render-chain predicates (done)
  - task-09: publish snapshot to `window.__venusRenderChainDebug` for live browser-side triage (done)
  - task-10: include backend fallback metadata from `engine.getBackendInfo()` in snapshot payload (done)
  - task-11: gate publication behind existing profile debug mode branch to keep behavior minimal in normal flows (done)
  - task-12: add required `AI-TEMP` annotation for temporary window diagnostics bridge (done)
  - task-13: update DEX-065 current-progress section with app-side triage bridge coverage (done)
  - task-14: update DEX-065 artifact list to include app renderer bridge file (done)
  - task-15: append CHANGE REQUEST artifact for app-runtime triage slice (done)
  - task-16: append ER-047 execution record with touched files and risk notes (done)
  - task-17: run vector runtime bridge contract test smoke (`editorRuntimeBridgeSync.contract.test.ts`) (done)
  - task-18: run engine typecheck gate after cross-package edit (done)
  - task-19: run engine test + CR gates to keep DEX-064/065 ledger compliance (done)
  - task-20: set next-task pointer to DEX-065 field-verification and root-cause closure (done)
- Touched files:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm dlx tsx --test apps/vector-editor-web/src/product/runtime/**tests**/editorRuntimeBridgeSync.contract.test.ts (pass)
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - diagnostics bridge writes only latest deduplicated failure signature; it is a triage aid and not a full event history stream.
  - window bridge payload is temporary (`AI-TEMP`) and should be replaced by a typed in-app diagnostics panel once available.
- Next task ID:
  - DEX-065

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/backendAdapterRegistry.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - Auto-priority can resolve to `webgpu`/`webgl`, but current adapter implementations are noop stubs, which can keep canvas blank even when render-plan/hittest are healthy.

Change Type:

- Add / Modify / Remove
  - modify webgpu/webgl adapters to execute canvas2d compatibility present path when a 2d context is available.
  - modify backend adapter registry to pass surface + canvas2d hooks into webgpu/webgl adapter constructors.
  - add conformance test proving compatibility draw execution under webgpu/webgl modes.

Impact:

- Affected modules:
  - backend adapter present path for webgpu/webgl stub stage
  - adapter registry wiring between orchestration hooks and backend adapters
  - web adapter conformance coverage

Cleanup:

- Old logic to remove:
  - remove pure noop-only present behavior for webgpu/webgl on 2d-capable surfaces.

Tests:

- Tests to add/update:
  - update `webAdapter.conformance.test.ts` to assert webgpu/webgl compatibility path reaches canvas2d draw hooks.

### ER-047

- In-progress tasks: DEX-064, DEX-065
- Burst execution checklist (20 tasks):
  - task-01: re-validate customer symptom against current adapter implementation boundaries (done)
  - task-02: inspect backend auto-priority selector for requested/resolved semantics (done)
  - task-03: inspect webgpu adapter implementation for real present capability vs noop behavior (done)
  - task-04: inspect webgl adapter implementation for real present capability vs noop behavior (done)
  - task-05: confirm registry wiring currently passes noop hooks only into webgpu/webgl adapters (done)
  - task-06: define compatibility strategy preserving webgpu/webgl mode metadata while enabling visible present (done)
  - task-07: add canvas2d compatibility detection helper in webgpu adapter (done)
  - task-08: add mode-preserving delegation wrapper in webgpu adapter (done)
  - task-09: route webgpu adapter to canvas2d compatibility backend when 2d context exists (done)
  - task-10: add required `AI-TEMP` marker for webgpu compatibility fallback branch (done)
  - task-11: add canvas2d compatibility detection helper in webgl adapter (done)
  - task-12: add mode-preserving delegation wrapper in webgl adapter (done)
  - task-13: route webgl adapter to canvas2d compatibility backend when 2d context exists (done)
  - task-14: add required `AI-TEMP` marker for webgl compatibility fallback branch (done)
  - task-15: update backend adapter registry to pass surface + canvas2d hooks into webgpu/webgl constructors (done)
  - task-16: add conformance test asserting webgpu/webgl compatibility path triggers draw hooks on 2d-capable surfaces (done)
  - task-17: update DEX-065 current-progress/artifacts entries to reflect webgpu/webgl remediation expansion (done)
  - task-18: append CHANGE REQUEST artifact for compatibility-present slice (done)
  - task-19: run engine typecheck/test/cr gates and verify full pass (done)
  - task-20: set next-task pointer to DEX-065 completion and diagnostics telemetry refinement (done)
- Touched files:
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/backendAdapterRegistry.ts
  - packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - compatibility path is temporary (`AI-TEMP`) and should be removed once native webgpu/webgl present pipelines are implemented.
  - compatibility fallback requires 2d-capable canvas; hosts without 2d context still rely on noop/stage diagnostics.
- Next task ID:
  - DEX-065

[CHANGE REQUEST]

Target:

- File / Module:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererLifecycle.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md

Goal:

- Problem being solved:
  - Field diagnostics show `backend-present` missing-context under webgpu path; app lifecycle needed explicit mount state and direct context probe evidence to distinguish mount-bridge drift from context unavailability.

Change Type:

- Add / Modify / Remove
  - modify renderer lifecycle to mount/unmount engine host explicitly.
  - add one-shot render-surface context probe snapshot (`2d/webgl/webgl2`) for field triage.
  - update execution ledger with app-side lifecycle remediation slice.

Impact:

- Affected modules:
  - vector runtime engine lifecycle bridge
  - engine direction evolution ledger

Cleanup:

- Old logic to remove:
  - remove implicit unmounted lifecycle assumption for engine host in renderer bootstrap.

Tests:

- Tests to add/update:
  - no new dedicated app test in this slice; validate via vector typecheck and engine gates.

### ER-048

- In-progress tasks: DEX-064, DEX-065
- Burst execution checklist (20 tasks):
  - task-01: parse field payload showing backend-present missing-context under requested/resolved webgpu (done)
  - task-02: re-audit vector renderer lifecycle for explicit `engine.mount` usage (done)
  - task-03: confirm current lifecycle did not mount host surface before render loop (done)
  - task-04: define minimal lifecycle remediation preserving existing engine bootstrap contract (done)
  - task-05: mount engine with stable host metadata immediately after createEngine bootstrap (done)
  - task-06: unmount engine during lifecycle cleanup before dispose to preserve bridge invariants (done)
  - task-07: design one-shot context probe payload to expose 2d/webgl/webgl2 availability (done)
  - task-08: publish context probe snapshot to `window.__venusRenderSurfaceContextDebug` (done)
  - task-09: include canvas width/height in probe snapshot for size-related triage (done)
  - task-10: add required `AI-TEMP` marker for temporary window probe bridge (done)
  - task-11: keep existing diagnostics-enable wiring unchanged to avoid new behavior drift (done)
  - task-12: verify lifecycle cleanup still resets existing refs/timers in original order (done)
  - task-13: update DEX-065 execution records with lifecycle remediation scope (done)
  - task-14: append CHANGE REQUEST artifact for app lifecycle slice (done)
  - task-15: append ER-048 with touched files, validation, and risks (done)
  - task-16: run vector-editor-web typecheck after lifecycle bridge edit (done)
  - task-17: run engine typecheck to ensure cross-package compile compatibility (done)
  - task-18: run engine tests to preserve DEX-064/065 contract green state (done)
  - task-19: run engine CR gate and keep sequential ledger continuity (done)
  - task-20: set next task pointer to DEX-065 field verification using new bridge probes (done)
- Touched files:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererLifecycle.ts
  - packages/engine/ai/engine-direction-evolution-task-ledger-2026-05-23.md
- Validation commands and result:
  - pnpm --filter @venus/vector-editor-web run typecheck (pass)
  - pnpm --filter @venus/engine... typecheck (pass)
  - pnpm --filter @venus/engine test (pass)
  - pnpm --filter @venus/engine run cr:check (pass)
- Risk notes:
  - context probe snapshot is one-shot bootstrap telemetry and may not reflect later context loss/recovery transitions.
  - window diagnostic bridge remains temporary and should be replaced by typed diagnostics UI plumbing.
- Next task ID:
  - DEX-065
