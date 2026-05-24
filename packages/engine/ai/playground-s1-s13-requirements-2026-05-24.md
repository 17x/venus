# Engine Requirements Specification for S1-S13 (AI Owned)

## [SCOPE]

- Scope: Define one direct engine requirements specification that can absorb all current S1-S13 scenario demands.
- Product boundary: Engine is 3D-first and API/events-only. UI frameworks are out of scope unless they change engine contract requirements.
- Goal:
  - Organize all scenario feature points into engine requirement language.
  - Produce a generalized and abstract engine requirement list derived from scenario specifics.
  - Define communication, lifecycle, material/texture, and data pipeline details needed for productionization.

## [TYPE DEFINITION]

- Change type: Engine specification document.
- Runtime risk level: None (documentation-only, no runtime code path change).
- Contract impact:
  - Engine runtime API contract is specified and constrained in this document.
  - No source-code API signature change is performed in this edit.

## [CHANGE REQUEST]

- CR-1: Produce a direct engine requirement specification from all S1-S13 feature points.
- CR-2: Derive an abstract and reusable requirement list for cross-scenario engine design.
- CR-3: Expand communication and lifecycle details for API/events-only engine integration.
- CR-4: Compare the resulting engine requirements against all 13 scenarios and report coverage.

## [SCENARIO INDEX]

- S1: Medical Volume Slice Runtime
- S2: Pre-op Path Simulation
- S3: BIM Collaborative Review
- S4: CAD Assembly Validation
- S5: GIS Live Map Streaming
- S6: Autonomous Driving Twin Replay
- S7: City Twin Monitoring Wall
- S8: Commerce Product Variant Runtime
- S9: Molecular Volume Exploration
- S10: Game Editor Runtime Preview
- S11: Node Headless Rendering
- S12: Vector Editor Opt-in 2D
- S13: Video Timeline Composition

## 1. Scenario-to-Model Classification

| Scenario | Primary Document Model                            | Update Pattern                      | Persistence Model                           |
| -------- | ------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| S1       | Hybrid (static grid + dynamic window/level state) | User interaction + optional stream  | Snapshot + parameter event log              |
| S2       | Event-sourced path graph                          | Incremental edits and replay        | Path graph snapshots + command events       |
| S3       | Hybrid BIM scene graph                            | Batch import + collaborative deltas | Scene chunks + collaboration log            |
| S4       | Static-to-dynamic assembly graph                  | Constraint solving bursts           | Assembly states + validation reports        |
| S5       | Streaming tiled geospatial graph                  | Continuous ingest                   | Tile cache + stream checkpoints             |
| S6       | Event-sourced timeline twin                       | Deterministic replay ticks          | Timeline segments + event journal           |
| S7       | Streaming dashboard graph                         | High-frequency aggregate updates    | Topic-partitioned time windows              |
| S8       | Dynamic product scene graph                       | Variant/user-state triggers         | Product snapshots + personalization events  |
| S9       | Hybrid point/volume scientific graph              | Analysis-driven transforms          | Multi-resolution volume + annotation layers |
| S10      | Dual graph (editor/runtime)                       | Patch and preview cycles            | Authoring graph + compiled runtime graph    |
| S11      | Deterministic render job graph                    | Queue-driven jobs                   | Immutable job inputs + reproducible outputs |
| S12      | Event-sourced vector doc                          | Frequent pointer edit bursts        | Operation log + periodic compaction         |
| S13      | Event-sourced timeline/track graph                | Frame and clip edits                | Track state + edit command log              |

## 2. Scenario-Level Feature Points and Requirements

### S1 Medical Volume Slice Runtime

- Feature points:
  - Scalar field ingestion and normalization.
  - Slice extraction and cross-section navigation.
  - Window/level interaction with deterministic redraw.
- Requirements:
  - R-S1-1: Support raster/volume-like scalar ingestion with normalization policy.
  - R-S1-2: Expose API for slice index and transfer-function controls.
  - R-S1-3: Emit events for viewport change, slice change, and render completion.
  - R-S1-4: Guarantee no blank frame during aggressive zoom/pan.

### S2 Pre-op Path Simulation

- Feature points:
  - Waypoint graph loading and route generation.
  - Constraint visualization (safe corridor, no-go zones).
  - Path replay and adjustment.
- Requirements:
  - R-S2-1: Support polyline/path primitives with per-segment metadata.
  - R-S2-2: Allow constraint overlays with priority-based render ordering.
  - R-S2-3: Provide deterministic replay ticks for path simulation.

### S3 BIM Collaborative Review

- Feature points:
  - Footprint/block visualization in pseudo-3D.
  - Layer toggles and category filtering.
  - Review state overlays and cross-user consistency.
- Requirements:
  - R-S3-1: Support hierarchical scene graph layers and category masks.
  - R-S3-2: Accept adapter-linearized scene deltas and apply them in deterministic revision order.
  - R-S3-3: Keep deterministic z-order and highlight behavior across clients.

### S4 CAD Assembly Validation

- Feature points:
  - Part-level metadata mapping.
  - Assembly stacking/explosion views.
  - Constraint/violation highlighting.
- Requirements:
  - R-S4-1: Support part-instance graph with transform inheritance.
  - R-S4-2: Provide API-level validation overlays with consistent thresholds.
  - R-S4-3: Emit materialized diagnostics for failed constraints.

### S5 GIS Live Map Streaming

- Feature points:
  - Real-time external feed ingestion.
  - Depth/layer semantics from geospatial attributes.
  - High-volume point rendering with filtering.
- Requirements:
  - R-S5-1: Implement tile/chunk streaming ingestion with backpressure controls.
  - R-S5-2: Support geospatial projection transforms and depth mapping.
  - R-S5-3: Emit ingest latency and dropped-sample metrics as events.

### S6 Autonomous Driving Twin Replay

- Feature points:
  - Time-indexed track replay.
  - Playback rate and jump-to-time controls.
  - Multi-entity synchronization.
- Requirements:
  - R-S6-1: Timeline engine must support deterministic tick advancement.
  - R-S6-2: API must provide seek/scrub/reverse-safe state transitions.
  - R-S6-3: Emit replay state events with monotonic timestamps.

### S7 City Twin Monitoring Wall

- Feature points:
  - Macro dashboard layers.
  - Regional aggregation and ranking overlays.
  - Continuous stream update with bounded drift.
- Requirements:
  - R-S7-1: Support multi-panel/multi-layer composition in one scene contract.
  - R-S7-2: Provide topic-based update channels with QoS policies.
  - R-S7-3: Surface stale-data and out-of-order indicators in diagnostics events.

### S8 Commerce Product Variant Runtime

- Feature points:
  - Product card/variant visualization.
  - Variant switching and detail overlays.
  - Pricing/rating data binding.
- Requirements:
  - R-S8-1: Support runtime variant swaps without full graph rebuild.
  - R-S8-2: Preserve interaction state through data refresh transitions.
  - R-S8-3: Emit variant-change and data-binding lifecycle events.

### S9 Molecular Volume Exploration

- Feature points:
  - Cluster/point-cloud exploration.
  - Volume-like layering and thresholding.
  - Focus-context transitions.
- Requirements:
  - R-S9-1: Provide multi-resolution representation with LOD switches.
  - R-S9-2: Support threshold filtering and semantic highlighting.
  - R-S9-3: Expose camera-focus events for analysis pipelines.

### S10 Game Editor Runtime Preview

- Feature points:
  - Authoring graph and runtime graph parity checks.
  - Dependency link visualization.
  - Rapid preview cycles.
- Requirements:
  - R-S10-1: Maintain dual graph contracts (authoring and runtime compiled view).
  - R-S10-2: Expose parity-check APIs with diff diagnostics events.
  - R-S10-3: Ensure preview rebuild latency budget for editing loops.

### S11 Node Headless Rendering

- Feature points:
  - Deterministic render jobs from server-side contexts.
  - Telemetry and reproducibility checks.
  - Cross-backend output consistency.
- Requirements:
  - R-S11-1: Headless runtime must support stable canvas/surface abstraction.
  - R-S11-2: Emit per-job diagnostics and output hash metadata.
  - R-S11-3: Support batch rendering without state leakage between jobs.

### S12 Vector Editor Opt-in 2D

- Feature points:
  - Path editing semantics in a 3D-first engine.
  - Handle manipulation and precision snapping.
  - Undo/redo friendly command flow.
- Requirements:
  - R-S12-1: 2D mode is explicit opt-in and isolated from 3D semantics.
  - R-S12-2: Support command-oriented edit APIs for robust history/replay.
  - R-S12-3: Emit fine-grained pointer/edit events for external toolchains.

### S13 Video Timeline Composition

- Feature points:
  - Track/clip layout and overlap handling.
  - Playhead movement and monitor sync.
  - Timeline composition with deterministic ordering.
- Requirements:
  - R-S13-1: Timeline graph must support layered tracks and clip transitions.
  - R-S13-2: Provide frame-time alignment APIs for monitor/runtime sync on decoded frame inputs.
  - R-S13-3: Emit clip lifecycle events (create/split/trim/move/delete).
  - R-S13-4: Treat media decode as out-of-engine scope and consume adapter-submitted decoded render payloads.

## 3. Engine Communication Contract (API + Events)

### 3.0 Adapter Boundary Assumptions (Normative)

- A-BOUNDARY-1: For S3-like collaborative scenarios, conflict resolution is product/adapter responsibility. Engine only consumes linearized operations.
- A-BOUNDARY-2: Adapter must submit monotonically ordered deltas with revision metadata before calling setGraph/patchGraph paths.
- A-BOUNDARY-3: For S13-like media scenarios, decode/transcode is product/adapter responsibility. Engine consumes decoded frame payloads only.
- A-BOUNDARY-4: Decoded frame payloads submitted to engine must include timestamp semantics and render-ready buffer descriptors.

### 3.1 API Surface (Minimal Required)

- Graph/data APIs:
  - setGraph(revision, nodes)
  - patchGraph(revisionDelta)
  - getGraph()
- View/camera APIs:
  - setView(viewport)
  - getView()
  - fitToBounds(bounds, strategy)
- Timeline APIs:
  - setTimeline(timeState)
  - seek(time)
  - play(rate)
  - pause()
- Render/execution APIs:
  - render()
  - resize(width, height)
  - getStats()
  - getDiagnostics()
- Resource/material APIs:
  - registerTexture(textureDescriptor)
  - updateMaterial(materialPatch)
  - preloadResources(resourceSet)
  - evictResources(policy)

### 3.2 Event Categories

- Lifecycle events:
  - engine:init
  - scene:loaded
  - scene:patched
  - scene:disposed
- Interaction events:
  - input:pointer
  - input:gesture
  - interaction:pick
  - interaction:selection
- Timeline/state events:
  - timeline:tick
  - timeline:seek
  - replay:state
- Resource events:
  - resource:requested
  - resource:loaded
  - resource:failed
  - resource:evicted
- Diagnostics/governance events:
  - render:path
  - render:stats
  - qos:degraded
  - contract:warning

### 3.3 Lifecycle State Machine

- Phase A: bootstrap
  - Construct engine surface/backend.
  - Register event sinks and diagnostics hooks.
- Phase B: ingest
  - Fetch/parse/decode source payloads.
  - Normalize into scenario-neutral graph entities.
- Phase C: bind
  - setGraph and optional material/texture registration.
  - Emit scene:loaded and baseline stats.
- Phase D: interact/replay
  - Process API commands and user gestures.
  - Emit interaction/timeline/resource events.
- Phase E: refresh/patch
  - Apply incremental deltas with deterministic revisions.
  - Preserve selection/camera unless explicitly overridden.
- Phase F: suspend/dispose
  - Stop streaming/replay timers.
  - Release resources and emit scene:disposed.

## 4. Material, Texture, and Rendering Data Requirements

### 4.1 Material Classes

- M0 flat semantic material:
  - For overlays, labels, helper layers.
- M1 physically-inspired material:
  - For pseudo-3D blocks and product-like presentations.
- M2 volume/procedural mapping:
  - For medical and molecular proxy visualizations.
- M3 timeline/UI composition material:
  - For track, clip, and monitor overlays.

### 4.2 Texture Classes

- T0 color atlas/icon sprites.
- T1 scalar field textures (volume slices, heatmaps).
- T2 normal/roughness-like parameter maps (optional in current demos).
- T3 dynamic render targets (monitor panel, mini-map, timeline preview).

### 4.3 Residency and LOD

- Support residency tiers:
  - hot (must remain resident).
  - warm (keep if budget allows).
  - cold (evictable).
- LOD policy requirements:
  - deterministic tier transitions based on camera distance + workload budget.
  - no blank-frame transitions during promotion/demotion.

## 5. Data Formats, Decode, and Conversion Pipelines

### 5.1 Ingress Formats (Current Demo Baseline)

- CSV
- JSON
- GeoJSON

### 5.2 Target Production Format Families (Required)

- Geometry/scene:
  - glTF/GLB, OBJ/FBX (ingress adapters), internal packed mesh format.
- Volume/scientific:
  - DICOM/NIfTI adapters, internal tiled scalar format.
- GIS:
  - GeoJSON/Vector tile adapters, internal chunked geospatial graph.
- Timeline/media:
  - clip metadata JSON, optional media index manifests.

### 5.3 Decode/Transcode Stages

- Stage 1: acquisition
  - fetch/read stream, verify schema and version.
- Stage 2: decode
  - parse source into typed intermediate representation.
- Stage 3: normalize
  - map to engine graph/material/resource contracts.
- Stage 4: optimize
  - chunking, dedupe, optional quantization, index build.
- Stage 5: bind
  - setGraph/patchGraph, register textures/materials.
- Stage 6: export
  - scenario-neutral snapshot export for replay/testing.

## 6. Interaction Model and Performance Budgets

### 6.1 Interaction Classes

- I1 direct manipulation (pan/zoom/drag/edit).
- I2 timeline control (play/seek/scrub/speed).
- I3 semantic selection/filtering.
- I4 collaborative annotation (future-ready).

### 6.2 Budget Targets

- Pointer/gesture feedback:
  - p95 <= 16 ms visual response for standard scenes.
- Scene patch apply:
  - p95 <= 50 ms for medium graph updates.
- Replay tick stability:
  - drift <= 1 frame equivalent over 10 seconds.
- Remote ingest to visible update:
  - p95 <= 1000 ms for small payloads; degraded mode must emit qos:degraded.

## 7. Dynamic Document Storage Strategy

- Required storage tiers:
  - hot memory state for active interaction.
  - append-only operation/event log for replay/debug.
  - periodic snapshot compaction for quick restore.
- Consistency model:
  - optimistic local apply + deterministic revision IDs.
  - conflict handling with patch ordering and explicit rejection events.
- Recovery model:
  - restart from latest snapshot + replay tail events.

## 8. Abstract General Requirement List (Scenario-Neutral)

### P0 (Must)

- G-P0-1: Engine integration must remain API/events-only and scenario-neutral.
- G-P0-2: Deterministic revision and replay contracts are mandatory.
- G-P0-3: No blank-frame behavior is allowed during interaction or LOD transitions.
- G-P0-4: Data ingestion pipeline must support schema validation and fault isolation.
- G-P0-5: Diagnostics and stats must be queryable and event-emitted.
- G-P0-6: 3D-first semantic model with explicit 2D opt-in path is required.
- G-P0-7: Headless and browser runtimes must share a stable contract surface.

### P1 (Should)

- G-P1-1: Multi-backend parity checks should be automated (webgl/webgpu/canvas/headless).
- G-P1-2: Resource residency policy should be tunable by scenario profile.
- G-P1-3: Ingress adapters should cover domain formats (medical/gis/cad/timeline).
- G-P1-4: Collaboration-ready event namespaces should exist even when disabled.
- G-P1-5: Timeline and streaming primitives should share one scheduling abstraction.

### P2 (Could)

- G-P2-1: Unified scene export/import package for cross-scenario migration.
- G-P2-2: Adaptive quality scaler driven by runtime telemetry.
- G-P2-3: Semantic contract linter for scenario onboarding.

## 9. Validation Matrix (What to Verify per Scenario)

- Functional:
  - Graph load, render, interaction, scene patch, and status telemetry.
- Determinism:
  - Same input/revision produces same node ordering and metrics envelope.
- Resilience:
  - Remote data failure keeps render path alive with explicit diagnostics.
- Lifecycle:
  - init -> ingest -> bind -> interact -> patch -> dispose transitions are complete.
- Resource:
  - Texture/material registration, update, and eviction behave within policy.

## [TEST MATRIX]

- Build-time validation:
  - Engine contract typecheck for graph/view/timeline/resource APIs.
  - Event namespace schema checks for lifecycle/interaction/timeline/resource/diagnostics.
- Runtime smoke validation:
  - Initial loading frame visibility and no blank frame under view interaction.
  - Deterministic replay consistency for timeline-based scenarios.
- Governance validation:
  - Requirement-to-scenario mapping completeness for all S1-S13.
  - Scenario-neutral abstraction check for subsystem requirements E-CORE..E-OBS.

## [IMPLEMENTATION NOTES]

- This document uses current playground public datasets only as proxy data sources.
- Production requirements deliberately abstract away from specific endpoint providers.
- All future scenario additions should follow:
  - model classification,
  - API/event mapping,
  - lifecycle mapping,
  - resource/material mapping,
  - generalized requirement derivation.

## [VALIDATION]

- Expected user-visible impact:
  - One direct engine requirements reference is available for roadmap and architecture alignment.
  - Requirement IDs can be used as implementation backlog keys and test-case anchors.

## [CLEANUP]

- No temporary compatibility branch is introduced.
- No AI-TEMP marker required in this change.

## 10. Engine Subsystem Requirement Set (Direct)

### 10.1 Core Graph and Revision Control

- E-CORE-1: Engine must support deterministic graph revisions with stable node ordering under identical input.
- E-CORE-2: Engine must support full graph set and incremental patch with conflict-safe revision boundaries.
- E-CORE-3: Engine must preserve view and selection state across non-breaking graph patches unless explicitly reset.

### 10.2 View, Camera, and Spatial Query

- E-VIEW-1: Engine must provide stable pan/zoom/orbit controls and bounded anchor handling to avoid viewport jumps.
- E-VIEW-2: Engine must provide deterministic picking/query results for mixed 2D/3D semantic nodes.
- E-VIEW-3: Engine must provide fit strategy variants for dense, sparse, and timeline-like scene layouts.

### 10.3 Timeline and Replay

- E-TIME-1: Engine must expose deterministic tick scheduling with seek, scrub, pause, and rate control.
- E-TIME-2: Engine must support replay-safe state restoration from snapshot plus event tail.
- E-TIME-3: Engine must guarantee monotonic timeline event emission order for the same replay plan.

### 10.4 Resource, Material, and Texture

- E-RES-1: Engine must support explicit texture/material registration and update with residency control.
- E-RES-2: Engine must support LOD transitions without blank frames or undefined material states.
- E-RES-3: Engine must expose resource lifecycle events for request/load/fail/evict.

### 10.5 Ingest, Decode, and Format Adaptation

- E-DATA-1: Engine ingest adapters must support schema-validated decode pipelines with typed intermediates.
- E-DATA-2: Engine normalization must map external data into scenario-neutral graph/material contracts.
- E-DATA-3: Engine must support exportable deterministic snapshots for replay and conformance tests.

### 10.6 Runtime Surfaces and Backend Parity

- E-RT-1: Engine must maintain browser and headless parity for graph/view/timeline/diagnostics APIs.
- E-RT-2: Engine must expose backend-path diagnostics for render fallback and capability gating.
- E-RT-3: Engine must isolate batch jobs to prevent cross-job state leakage in headless mode.

### 10.7 Observability and QoS Governance

- E-OBS-1: Engine must emit lifecycle, interaction, timeline, resource, and diagnostics event domains.
- E-OBS-2: Engine must provide QoS degradation signaling when latency, ingest delay, or resource pressure crosses thresholds.
- E-OBS-3: Engine must expose stable stats snapshots suitable for CI conformance and regression gates.

## 11. Coverage Comparison Against 13 Scenarios

| Scenario                            | Key Required Engine Capability                                    | Requirement Mapping                         | Coverage Status |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | --------------- |
| S1 Medical Volume Slice Runtime     | Scalar field ingestion, slice control, no-blank-frame interaction | R-S1-1..R-S1-4, E-DATA-1, E-RES-2, E-VIEW-1 | Covered         |
| S2 Pre-op Path Simulation           | Path graph, constraints, deterministic replay                     | R-S2-1..R-S2-3, E-CORE-1, E-TIME-1          | Covered         |
| S3 BIM Collaborative Review         | Hierarchy layers, linearized adapter deltas, consistent highlight | R-S3-1..R-S3-3, A-BOUNDARY-1, E-CORE-2      | Covered         |
| S4 CAD Assembly Validation          | Part graph, constraint diagnostics, transform inheritance         | R-S4-1..R-S4-3, E-CORE-2, E-OBS-3           | Covered         |
| S5 GIS Live Map Streaming           | Streaming ingest, geospatial mapping, backpressure                | R-S5-1..R-S5-3, E-DATA-1, E-OBS-2           | Covered         |
| S6 Autonomous Driving Twin Replay   | Deterministic timeline replay and seek                            | R-S6-1..R-S6-3, E-TIME-1..E-TIME-3          | Covered         |
| S7 City Twin Monitoring Wall        | Multi-panel composition and stream QoS                            | R-S7-1..R-S7-3, E-CORE-3, E-OBS-2           | Covered         |
| S8 Commerce Product Variant Runtime | Runtime variant swap and state preservation                       | R-S8-1..R-S8-3, E-CORE-3, E-RES-1           | Covered         |
| S9 Molecular Volume Exploration     | LOD, threshold filtering, analysis focus                          | R-S9-1..R-S9-3, E-RES-2, E-VIEW-2           | Covered         |
| S10 Game Editor Runtime Preview     | Dual graph parity and diff diagnostics                            | R-S10-1..R-S10-3, E-CORE-2, E-OBS-3         | Covered         |
| S11 Node Headless Rendering         | Deterministic headless jobs and parity                            | R-S11-1..R-S11-3, E-RT-1..E-RT-3            | Covered         |
| S12 Vector Editor Opt-in 2D         | Explicit 2D mode, command edits, pointer granularity              | R-S12-1..R-S12-3, E-VIEW-2, E-OBS-1         | Covered         |
| S13 Video Timeline Composition      | Layered tracks, decoded-frame playback, clip lifecycle            | R-S13-1..R-S13-4, A-BOUNDARY-3, E-TIME-1    | Covered         |

### 11.1 Coverage Verdict

- Requirement-spec coverage result: 13/13 scenarios covered.
- Engine abstraction quality result: Pass. The requirement set remains scenario-neutral while preserving domain-specific constraints through requirement mapping.
- Residual implementation risk note:
  - No unresolved engine-internal risk remains for S3 conflict resolution and S13 decode, because both are now explicitly out-of-engine and adapter-scoped by contract.

## 12. Task Kickoff (Started)

### 12.1 Current Execution Policy

- Task execution is constrained by adapter-boundary assumptions A-BOUNDARY-1..A-BOUNDARY-4.
- Engine tasks below focus only on in-engine responsibilities.

### 12.2 Phase-1 Implementation Tasks

- T-001 (completed): Define linearized delta envelope contract required by R-S3-2 and A-BOUNDARY-2.
- T-002 (completed): Define decoded frame payload contract required by R-S13-2, R-S13-4, and A-BOUNDARY-4.
- T-003 (completed): Add deterministic revision-order validation checks for adapter-submitted deltas.
- T-004 (completed): Add timeline-frame alignment validation checks for decoded frame playback.
- T-005 (completed): Extend diagnostics events for contract-violation reporting on adapter payload/schema mismatch.

### 12.3 Phase-1 Done Criteria

- D-001: Adapter delta envelope contract is documented and validated by runtime guards. Status: completed.
- D-002: Decoded frame payload contract is documented and validated by runtime guards. Status: completed.
- D-003: Determinism and timeline alignment checks are covered by automated tests. Status: completed.

## 13. Phase-2 Task Progress

### 13.1 Phase-2 Implementation Tasks

- T-006 (completed): Canonicalize runtime document contract-violation warning codes as stable constants and remove hard-coded literals from runtime apply path.
- T-007 (completed): Expose runtime.document preflight validation API for adapter payload checks without mutation.
- T-008 (completed): Add docs baseline references for runtime document warning code catalog.

### 13.2 Phase-2 Done Criteria

- D-004: Runtime document warning codes are stable, centralized, and referenced by runtime apply path. Status: completed.
- D-005: Runtime document preflight API is callable from engine.runtime.document and validates adapter payload contracts without mutating runtime state. Status: completed.
- D-006: Runtime document warning code catalog is linked to requirement ids and covered by contract tests. Status: completed.

## 14. Runtime Document Warning Code Catalog Baseline

### 14.1 Canonical Source of Truth

- Runtime warning code constants source:
  - `packages/engine/src/kernel/document/document-warning-codes.ts`
- Runtime warning code baseline requirement linkage source:
  - `packages/engine/src/kernel/document/document-warning-codes.ts` (`ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS`)
- Contract test coverage source:
  - `packages/engine/src/testing/documentStoreModule.contract.test.ts`

### 14.2 Warning Code to Requirement Mapping

| Warning Code                                          | Requirement Baseline IDs       | Rationale Summary                                                                    |
| ----------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| ENGINE_RUNTIME_DOCUMENT_CHANGESET_INVALID             | E-CORE-2, E-OBS-1              | Change-set shape must be contract-safe and surfaced via deterministic diagnostics.   |
| ENGINE_RUNTIME_DOCUMENT_LINEARIZED_ENVELOPE_INVALID   | R-S3-2, A-BOUNDARY-2, E-CORE-2 | Adapter-linearized deltas require strict revision/order envelope validation.         |
| ENGINE_RUNTIME_DOCUMENT_LINEARIZED_CHANGESET_MISMATCH | R-S3-2, A-BOUNDARY-2, E-CORE-2 | Envelope and apply payload must reference the same deterministic change-set lineage. |
| ENGINE_RUNTIME_DOCUMENT_DECODED_FRAME_INVALID         | R-S13-4, A-BOUNDARY-4, E-OBS-1 | Decode remains adapter-owned; engine validates submitted decoded payload contracts.  |
| ENGINE_RUNTIME_DOCUMENT_TIMELINE_ALIGNMENT_INVALID    | R-S13-2, E-TIME-3, E-OBS-1     | Frame payload timestamps must align to monotonic timeline constraints.               |
| ENGINE_RUNTIME_DOCUMENT_REVISION_CONFLICT             | R-S3-2, E-CORE-2, E-OBS-1      | Apply base revision must match active runtime revision to keep deterministic state.  |
| ENGINE_RUNTIME_DOCUMENT_SCHEMA_MISMATCH               | E-CORE-2, E-OBS-1              | Runtime schema mismatch must hard-fail contract apply and emit diagnostics context.  |

### 14.3 Governance Rule

- Any new runtime document warning code must update both:
  - `ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS`
  - contract tests in `documentStoreModule.contract.test.ts`
- Any requirement-id baseline change must update this section and code map in the same change.
- D-005: Runtime preflight API exists and is covered by contract tests.
- D-006: Warning code catalog appears in docs baseline and remains parity-checked.
