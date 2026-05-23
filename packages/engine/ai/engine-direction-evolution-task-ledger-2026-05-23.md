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

- ai/draft.md
- ai/refactor.md
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
- pnpm --filter @venus/vector-editor-web typecheck

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

- Status: DOING
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
  - next slice will shrink forbidden baseline debt and move toward strict edge enforcement
- Artifacts:
  - packages/engine/docs/en/concepts/layer-boundary-contracts.md
  - packages/engine/docs/cn/concepts/layer-boundary-contracts.md
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs

### DEX-003 [P0] [R/O] Create rolling execution backlog index

- Status: DOING
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
- Artifacts:
  - packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs

### DEX-005 [P0] [K/R] Enforce domain-semantic neutrality

- Status: DOING
- Outcome:
  - define engine contract rule that forbids industry product semantics and business logic
  - require scenario capabilities to be assembled from generic primitives
- Acceptance:
  - architecture docs include semantic-neutral contract checklist
  - new scenario modules pass semantic-neutral naming and contract review
- Current progress:
  - semantic-neutrality contract tests added for runtime capability descriptors
  - semantic-neutrality contract tests added for backend foundation descriptors
- Artifacts:
  - packages/engine/src/testing/semanticNeutrality.contract.test.ts

### DEX-006 [P0] [R] Enforce API-first surface and concise naming governance

- Status: DOING
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
  - next slice will cover automated guard for non-governed top-level export symbol additions
- Artifacts:
  - packages/engine/docs/en/concepts/api-surface-governance.md
  - packages/engine/docs/cn/concepts/api-surface-governance.md
  - packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts

## Phase B: Scenario Foundation Modules

### DEX-010 [P1] [K/R/O] Medical volume foundation

- Status: TODO
- Scope:
  - volume runtime contract
  - slice/MPR path
  - transfer function + residency budget hooks
- Primary scenarios: 1, 9

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
  - next slice is contract/type surface definition under kernel/orchestration
- Artifacts:
  - packages/engine/docs/en/concepts/asset-compression-baseline.md
  - packages/engine/docs/cn/concepts/asset-compression-baseline.md

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
- Artifacts:
  - packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
  - packages/engine/src/platform/protocol/backend/texture-compression.ts
  - packages/engine/src/orchestration/runtime/backend/backend.foundation.contract.ts
  - packages/engine/src/testing/textureCompressionSupport.contract.test.ts

### DEX-036 [P2] [K/O/R] Geometry and animation compression runtime policy

- Status: TODO
- Scope:
  - quantization/delta/streaming chunk policy contracts for geometry and animation payloads
  - decode precision policy by zoom/LOD/interaction state
  - replay-safe deterministic decode checkpoints for node/headless runtimes
- Primary scenarios: 2, 3, 4, 6, 7, 8, 10, 11

## Phase D: Source Mining and Migration Closure

### DEX-040 [P2] [All] Source inventory from \_vnext and engine-legacy

- Status: TODO
- Scope:
  - classify reusable modules and tests
  - map each candidate to target layer and scenario
- Rules:
  - prefer package-level contracts
  - avoid private legacy path coupling

### DEX-041 [P2] [All] Structured extraction implementation batches

- Status: TODO
- Scope:
  - migrate reusable logic by capability slices
  - each slice includes tests and docs sync

### DEX-042 [P2] [All] Legacy decommission readiness gate

- Status: TODO
- Scope:
  - ensure no active dependency on packages/\_vnext and engine-legacy internals
  - verify parity coverage and fallback retirement

### DEX-043 [P3] [All] Final cleanup of \_vnext and engine-legacy

- Status: TODO
- Scope:
  - remove obsolete modules after readiness gate pass
  - keep migration notes and risk closure record

## Phase E: Validation and Cleanup Protocol

### DEX-050 [P0] [All] Per-slice validation record

- Status: TODO
- Required record fields:
  - touched files
  - validation commands and result
  - risk notes
  - next task ID

### DEX-051 [P0] [All] Cleanup-first enforcement

- Status: TODO
- Scope:
  - remove replaced code in same batch
  - forbid long-lived compatibility leftovers without explicit removal condition

### DEX-052 [P1] [All] Documentation and API governance sync

- Status: TODO
- Scope:
  - update en/cn docs for new runtime contracts
  - keep capability map and contract descriptors aligned

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
- S12 Vector editor: DEX-018, DEX-031, DEX-032
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
