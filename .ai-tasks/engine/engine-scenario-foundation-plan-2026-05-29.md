# Engine Scenario Evolution Task Plan (2026-05-29)

## 0. Scope Definition

This plan drives engine scenario-foundation development for the 13 target scenarios defined in `engine-direction-evolution-task-ledger-2026-05-23.md`. The threejs parity baseline (TP-001 through TP-122) is complete and provides foundational 3D capability.

### Current Engine State Summary

Architecture guardrails (DEX-001 to DEX-006): **ALL DONE**

- Scenario capability matrix mapped ✅
- Layer boundary contracts enforced (zero forbidden debt) ✅
- Rolling execution backlog indexed ✅
- 3D-first baseline, 2D opt-in boundary enforced ✅
- Domain-semantic neutrality enforced ✅
- API-first surface + naming governance enforced ✅

Threejs parity (TP-001 to TP-122): **ALL DONE**

- Scene graph/transform (TP-001-004) ✅
- Camera system (TP-010-013) ✅
- Geometry/mesh pipeline (TP-020-023) ✅
- Material/shading (TP-030-033) ✅
- Lights/shadows (TP-040-043) ✅
- Renderer/pass graph (TP-050-053) ✅
- Visibility/culling/spatial (TP-060-063) ✅
- Picking/interaction (TP-070-073) ✅
- Asset/format ecosystem (TP-080-083) ✅
- Animation system (TP-090-093) ✅
- Editor runtime parity (TP-100-103) ✅
- Diagnostics/governance (TP-110-113) ✅
- Multi-backend strategy (TP-120-122) ✅

Scenario foundations (DEX-010 to DEX-017):

- DEX-010 Medical volume: DOING (volume runtime contract exists)
- DEX-011 Surgical planning: TODO
- DEX-012 BIM/CAD assembly: TODO
- DEX-013 GIS/geospatial: TODO
- DEX-014 Digital twin replay: TODO
- DEX-015 Commerce 3D: TODO
- DEX-016 Game editor-runtime: TODO
- DEX-017 Node runtime rendering: TODO

### Remaining Scenario Foundation Work

#### DEX-010 Medical Volume Foundation (P1) — currently DOING

- [ ] Complete volume runtime contract: slice-plan, transfer-function, residency-budget APIs ✅ mostly done
- [ ] Add deterministic volume slice test
- [ ] Add transfer function contract test
- [ ] Add residency budget diagnostics

#### DEX-011 Surgical Planning & Path Simulation (P1) — TODO

- [ ] Define path constraint API contracts
  - Generic constraint-system decision and atomic design completed:
    `.ai-tasks/engine/engine-generic-constraint-system-design-2026-06-04.md`
  - Initial generic kernel and governed `runtime.constraints` API landed:
    line/segment/plane/circle/scalar-range/angle-range, registry, transient resolve, diagnostics.
- [ ] Add collision/risk query contracts
- [ ] Add deterministic replay hooks
- [ ] Primary scenarios: S1, S2

#### DEX-012 BIM/CAD Assembly Semantics (P1) — TODO

- [ ] Define hierarchy/instance runtime contracts
- [ ] Add generic constraint and validation channels
- [ ] Add large assembly visibility pipeline contracts
- Primary scenarios: S3, S4

#### DEX-013 GIS & Geospatial Runtime (P1) — TODO

- [ ] Define projection pipeline contracts
- [ ] Add tile streaming + LOD budget contracts
- [ ] Add floating origin and multi-view sync contracts
- Primary scenarios: S5, S7

#### DEX-014 Digital Twin Replay (P1) — TODO

- [ ] Define event/timeline replay contracts
- [ ] Add telemetry ingestion adapters
- [ ] Add frame-budget aware playback contracts
- Primary scenarios: S6, S7

#### DEX-015 Commerce 3D Runtime (P1) — TODO

- [ ] Define variant switch graph primitive
- [ ] Add material/shader permutation policy
- [ ] Add stable snapshot and fast transition contracts
- Primary scenarios: S8

#### DEX-016 Game Editor-Runtime Isomorphism (P1) — TODO

- [ ] Define authoring/runtime split contracts
- [ ] Add incremental compile/extraction parity contracts
- [ ] Add runtime preview consistency API contracts
- Primary scenarios: S10

#### DEX-017 Node Runtime Rendering (P1) — TODO

- [ ] Define headless runtime adapter contracts
- [ ] Add node platform protocol contracts
- [ ] Add deterministic server-side frame output contracts
- Primary scenarios: S11

### Engine Public API (Bilingual Docs Required)

Current public API surface verified by:

- `packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs`
- `packages/engine/src/testing/releaseApiContracts.contract.test.ts`

Existing bilingual docs:

- `packages/engine/docs/en/api/release-api-baseline.md` + CN
- `packages/engine/docs/en/concepts/3d-first-2d-opt-in.md` + CN
- `packages/engine/docs/en/api/resource-asset-ingestion.md` + CN
- `packages/engine/docs/en/api/spatial-query-baseline.md` + CN
- `packages/engine/docs/en/api/timeline-replay-baseline.md` + CN
- `packages/engine/docs/en/backends/release-backend-matrix.md` + CN
- `packages/engine/docs/en/editor-integration/scenario-adapter-boundary-cookbook.md` + CN

### Priority Execution Order

1. Complete DEX-010 (already DOING, closest to done)
2. DEX-017 Node runtime (unblocks playground S11)
3. DEX-014 Digital twin replay (unblocks S6)
4. DEX-013 GIS/geospatial (unblocks S5, S7)
5. DEX-012 BIM/CAD (unblocks S3, S4)
6. DEX-015 Commerce 3D (unblocks S8)
7. DEX-011 Surgical planning (unblocks S2)
8. DEX-016 Game editor (unblocks S10)
