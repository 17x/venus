# Commercial Release Execution Master Plan (2026-05-29)

## 0. Scope

This is the top-level execution source for the commercial release of:

1. `@venus/engine` — official release with complete bilingual API docs, 3D-first baseline, scenario-neutral generic APIs
2. `@venus/vector-editor-web` — first commercial 2D vector editor (Adobe AI/Figma-level document foundations)
3. `@venus/playground` — S1-S13 scenario demo pages with real data models and MVP interactions

## 1. Current State Assessment

### Engine (packages/engine)

**Architecture Guardrails**: ALL DONE (DEX-001 through DEX-006)

- Layer boundary contracts enforced
- 3D-first baseline, 2D opt-in
- Domain-semantic neutrality
- API-first surface governance

**Threejs Parity**: ALL DONE (TP-001 through TP-122)

- Scene graph, camera, geometry, material, lights, shadows, renderer
- Visibility/culling, picking, asset ecosystem, animation
- Editor runtime parity, diagnostics, multi-backend strategy

**Scenario Foundations**: 1 DOING, 7 TODO (DEX-010 through DEX-017)

- Medical volume partially done, 7 scenarios need foundation contracts

**Bilingual Docs**: 7 doc pairs (EN/CN) published, indexed

### Vector Editor (apps/vector-editor-web)

**Document Model**: Canvas of 2 canonical fixture shapes covers ~90% of DocumentNode fields
**Contracts**: 130 product-spec tests, 0 fail
**Gaps**: Only frame + path shapes in fixture; need all 10 ShapeType variants

### Playground (apps/playground)

**Contracts**: 18 tests, 0 fail (including browser screenshot)
**Data**: All scenario folders empty; dataset URLs defined but not downloaded
**Interaction**: Harness controls declared but not wired to real scene state mutations

## 2. Task Plan

### Phase 1: Engine Scenario Foundations (Engine Release Blocker)

#### ENG-101 [P1] Complete medical volume foundation (DEX-010)

- Status: DOING
- Add deterministic volume slice test, transfer function contract, residency diagnostics
- Primary: S1, S9

#### ENG-102 [P1] Surgical planning path simulation foundation (DEX-011)

- Status: TODO
- Path constraint API, collision/risk query, replay hooks
- Primary: S1, S2

#### ENG-103 [P1] BIM/CAD assembly semantics foundation (DEX-012)

- Status: TODO
- Hierarchy/instance runtime, generic constraint/validation, assembly visibility
- Primary: S3, S4

#### ENG-104 [P1] GIS geospatial runtime foundation (DEX-013)

- Status: TODO
- Projection pipeline, tile streaming LOD, floating origin, multi-view sync
- Primary: S5, S7

#### ENG-105 [P1] Digital twin replay foundation (DEX-014)

- Status: TODO
- Event/timeline replay, telemetry ingestion, frame-budget playback
- Primary: S6, S7

#### ENG-106 [P1] Commerce 3D runtime foundation (DEX-015)

- Status: TODO
- Variant switch graph, material/shader permutation, snapshot transition
- Primary: S8

#### ENG-107 [P1] Game editor-runtime isomorphism foundation (DEX-016)

- Status: TODO
- Authoring/runtime split, incremental compile parity, preview consistency
- Primary: S10

#### ENG-108 [P1] Node runtime rendering foundation (DEX-017)

- Status: TODO
- Headless runtime adapters, node platform protocol, deterministic frame output
- Primary: S11

#### ENG-109 [P0] Engine release candidate validation

- Status: TODO
- Run full engine validation suite, close residual blockers
- Dependencies: ENG-101 through ENG-108

### Phase 2: Vector Commercial MVP Hardening

#### VEC-101 [P0] Complete canonical fixture with all 10 ShapeType variants

- Status: TODO
- Add rectangle, ellipse, polygon, star, lineSegment, text, image, group shapes to fixture
- Each shape must exercise every applicable DocumentNode property

#### VEC-102 [P0] Complete fixture coverage gate

- Status: TODO
- Add drift gate to product-spec: fail when any DocumentNode field lacks fixture coverage
- Enforce all ShapeGradientType, ShadowKind, BlurKind, StrokeDashPattern, ShapeBlendMode variants

#### VEC-103 [P1] Asset library completeness

- Status: TODO
- Add fixture assets: image asset with blob URL, multi-fill gradient, multi-stroke dash
- Verify style reference resolution: document → node → render pipeline

#### VEC-104 [P1] File persistence round-trip

- Status: TODO
- Save canonical fixture to file format, reload, verify all fields survive
- Test with all ShapeType variants and all property combinations

#### VEC-105 [P0] Vector commercial release candidate

- Status: TODO
- Full validation suite, residual risk closure
- Dependencies: VEC-101 through VEC-104

### Phase 3: Playground Scenario Data & Validation

#### PG-101 [P0] Download scenario datasets with checksums

- Status: TODO
- Download 13 public datasets to `apps/playground/public/scenario-fixtures/`
- Record SHA256 checksums, license attributions
- Dependencies: data URLs already defined in remoteScenarioCatalog

#### PG-102 [P0] Add local deterministic fallback fixtures

- Status: TODO
- Create small deterministic fixtures for each scenario
- Used when remote data is unavailable

#### PG-103 [P1] Per-scenario interaction depth

- Status: TODO
- Wire interaction harness controls to real scene mutations
- Add zoom/pan/pick/timeline/variant controls per scenario

#### PG-104 [P1] Scenario render parity gates

- Status: TODO
- Add deterministic snapshot tests per scenario
- Verify canvas nonblank, node count, draw count

#### PG-105 [P0] Playground scenario demo MVP

- Status: TODO
- All 13 scenario pages render with real data
- Each page has at least one interactive control
- Dependencies: PG-101 through PG-104

### Phase 4: Release Hardening

#### REL-201 [P0] Cross-package release validation

- Status: TODO
- Run all engine/vector/playground validation gates
- Record release evidence

#### REL-202 [P0] Documentation and demo handoff

- Status: TODO
- Final bilingual docs, scenario docs, MVP reports
- Dependencies: REL-201

#### REL-203 [P0] Commercial release decision

- Status: TODO
- Go/no-go decision, residual risks, next backlog
- Dependencies: REL-202

#### REL-204 [P0] Final cleanup

- Status: TODO
- Remove dead paths, close temporary tags
- Dependencies: REL-203
