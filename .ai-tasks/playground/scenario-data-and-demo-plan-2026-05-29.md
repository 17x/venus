# Playground Scenario Data And Demo Plan (2026-05-29)

## 0. Scope Definition

This document plans playground coverage for the 13 engine scenario types. The current goal is MVP scenario visibility: each scenario should have a route, a documented domain model, interaction/function expectations, and locally managed sample data or a declared remote data source.

Mutation radius for this planning slice:

- Affected domain: planning documents only.
- Authorized modules: `.ai-tasks/playground`.
- Forbidden modules: playground runtime source, downloaded datasets, engine/vector source, package metadata.
- Capability tier: Tier A for repository read/write; validation is repository and web-reference inspection only.

Playground boundary rules:

- Playground may use scenario/domain labels because it is an app/demo layer.
- Playground must adapt real-world data into generic engine graph/resources before calling engine APIs.
- Engine must not own scenario-specific file formats or product semantics.
- MVP demos may use simplified samples, but each simplification must be explicit.

## 1. Type Definition

### 1.1 Status

- DONE: route, data, scene builder, interaction, and docs are complete enough for MVP validation.
- PARTIAL: route or scene exists, but real data type, interaction, docs, or local sample management is incomplete.
- TODO: no scenario-complete demo plan or implementation.
- BLOCKED: needs dataset/license/format decision.

### 1.2 Priority

- P0: scenario directory and core engine validation coverage.
- P1: true data-type loading and interactive MVP demos.
- P2: larger datasets, streaming, performance gates.
- P3: polished demo UX and advanced workflows.

## 2. CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module: `.ai-tasks/playground/*` planning documents.

Goal:

- Problem being solved: turn the playground into a scenario validation surface for S1-S13, with explicit data model, interaction, function, and sample-data plans.

Change Type:

- Add docs.

Impact:

- Affected modules: task planning only.

Cleanup:

- Old logic to remove: future implementation should replace generic proxy datasets with scenario-appropriate local samples where license permits.

Tests:

- Tests to add/update in future code slices:
  - scenario catalog coverage contract for S1-S13
  - data manifest validation contract
  - scene-builder deterministic output tests
  - browser smoke for each route
  - engine graph validation for each built scene

## 3. Test Design

Inspection performed:

- Read `apps/playground/src/scenarios/README.md`, `scenarioCatalog.ts`, `demos/README.md`, `remoteScenarioCatalog.ts`, and `remoteScenarioPage.ts`.
- Observed 8 local scenario scene builders under `apps/playground/src/scenarios`.
- Observed 13 remote scenario definitions under `apps/playground/src/demos`.
- No local data/assets/fixtures/sample directories were found under `apps/playground/src` by a directory-name scan.
- Remote scenario supported dataset formats are currently only `csv` and `json`.

External reference scan used:

- DICOM and OME/Bio-Formats/OME-Zarr for medical and multidimensional volume data.
- IFC for BIM/CAD model exchange.
- glTF 2.0 and OpenUSD for generic 3D scene/asset composition.
- OGC 3D Tiles for massive geospatial/BIM/CAD/point-cloud streaming.
- ASAM OpenSCENARIO for driving scenario/replay modeling.
- SVG2 for 2D vector document structure, painting, paths, text, clipping/masking, and pointer interaction.

Future validation commands:

1. `pnpm --filter @venus/playground typecheck`
2. route-level browser smoke for all `#/...` scenario paths
3. deterministic scene-builder tests for each scenario
4. engine graph validation for all generated scene snapshots

## 4. Current Playground State

### 4.1 Local Scenarios

Current local `apps/playground/src/scenarios` covers:

1. `2d-basic`
2. `2d-interactive`
3. `2d-performance`
4. `webgl-render`
5. `canvas2d-fallback`
6. `headless-deterministic`
7. `3d-spatial`
8. `3d-editor-validation`

These are useful engine capability probes, but they are not the same as scenario-complete S1-S13 domain demos.

### 4.2 Remote S1-S13 Routes

Current remote route list covers all 13 target scenario labels. However, many datasets are generic proxies:

- S1 uses volcano CSV as scalar field proxy, not DICOM/OME/medical volume metadata.
- S2 uses airports CSV as waypoint proxy, not surgical path/collision data.
- S3 uses building footprint GeoJSON, not IFC/BCF/BIM model data.
- S4 uses cars JSON, not CAD assembly/constraint data.
- S5 uses USGS GeoJSON, acceptable as a GIS starter but not tile/3D streaming.
- S6 uses NBA timeline CSV, not OpenSCENARIO/trajectory/sensor replay.
- S7 uses GDP CSV, not city telemetry/3D Tiles/building stream.
- S8 uses product catalog JSON, not glTF/variant/material asset data.
- S9 uses earthquake JSON, not molecular/PDB/mmCIF/volume data.
- S10 uses graph topology JSON, a reasonable editor-runtime proxy but not level assets.
- S11 uses time-series JSON, not headless render scene/capture artifacts.
- S12 uses weather CSV, not SVG/vector document sample.
- S13 uses stocks CSV, reasonable timeline proxy but not video clips/effects metadata.

### 4.3 Data Loading Gap

Current data loading is remote-only at route runtime. The requested direction requires data types to be loaded/downloaded into scenario-owned folders. A future implementation should introduce:

- `apps/playground/src/scenarios/s01-medical-volume/data/`
- `apps/playground/src/scenarios/s02-path-simulation/data/`
- `apps/playground/src/scenarios/s03-bim-review/data/`
- `apps/playground/src/scenarios/s04-cad-assembly/data/`
- `apps/playground/src/scenarios/s05-gis-map/data/`
- `apps/playground/src/scenarios/s06-driving-replay/data/`
- `apps/playground/src/scenarios/s07-city-twin/data/`
- `apps/playground/src/scenarios/s08-commerce-product/data/`
- `apps/playground/src/scenarios/s09-molecular-volume/data/`
- `apps/playground/src/scenarios/s10-game-preview/data/`
- `apps/playground/src/scenarios/s11-node-headless/data/`
- `apps/playground/src/scenarios/s12-vector-2d/data/`
- `apps/playground/src/scenarios/s13-video-timeline/data/`

Each folder should contain a `data-manifest.json` with source URL, license, checksum, format, fixture size, adapter owner, and allowed offline fallback.

## 5. Scenario Model, Interaction, And Data Plan

| Scenario                              | Document/data model to represent                                          | Interactions/functions                                                | MVP data type target                                                  | Current status |
| ------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------- |
| S1 Medical volume slice runtime       | volume series, slice stack, voxel spacing, transfer function, annotations | slice scrub, MPR plane switch, window/level, ROI pick, capture        | OME-Zarr or small NRRD/NIfTI-like fixture; DICOM metadata manifest    | PARTIAL        |
| S2 Pre-op path simulation             | anatomy volume proxy, instrument path, constraints, collision/risk zones  | path edit, clearance query, replay, overlay warnings                  | JSON path/constraint fixture plus volume proxy                        | TODO           |
| S3 BIM collaborative review           | building hierarchy, elements, materials/properties, issues/comments       | section cut, isolate, select, comment overlay, property inspect       | IFC sample or simplified IFC-derived JSON; optional BCF issue fixture | PARTIAL        |
| S4 Industrial CAD assembly validation | parts, assemblies, transforms, constraints, tolerances                    | explode view, constraint validate, clash/clearance query, measurement | glTF/STEP-derived simplified JSON plus constraint manifest            | TODO           |
| S5 GIS 2D/3D map browsing             | geospatial tiles, features, projection metadata, elevation/depth          | pan/zoom, tile LOD, feature pick, layer toggle                        | GeoJSON + 3D Tiles tileset fixture                                    | PARTIAL        |
| S6 Autonomous driving twin replay     | road/lane graph, actors, trajectories, sensors, time events               | seek/play/pause, actor follow, sensor overlay, event inspect          | OpenSCENARIO-like JSON plus trajectory CSV                            | TODO           |
| S7 City-scale twin wall               | city tiles/buildings, telemetry streams, alert layers, multi-view layout  | dashboard wall, live update, drilldown, capture                       | 3D Tiles + telemetry JSON fixture                                     | TODO           |
| S8 E-commerce 3D product runtime      | product asset, variants, materials, cameras, lights                       | variant switch, material swap, orbit, snapshot                        | glTF sample with variant/material manifest                            | PARTIAL        |
| S9 Molecular and volume exploration   | atoms/bonds, surfaces, volume density, annotations                        | rotate, select atom/residue, clip/slice, animation                    | PDB/mmCIF-like JSON plus volume scalar grid                           | TODO           |
| S10 Game editor/runtime preview       | level graph, entities/components, prefab/assets, runtime preview state    | select/transform, play preview, deterministic replay                  | glTF/USD-like scene plus ECS JSON                                     | PARTIAL        |
| S11 Node-side rendering runtime       | headless scene request, backend capabilities, render output artifact      | submit render, inspect diagnostics, compare signatures                | JSON scene request + expected snapshot signature                      | PARTIAL        |
| S12 Vector editor opt-in 2D           | SVG/vector document, pages/artboards, paths, fills, masks, text           | path edit, selection, lasso, snapping, style edit                     | SVG sample + vector editor fixture JSON                               | PARTIAL        |
| S13 Video timeline composition        | tracks, clips, keyframes, effects, monitor overlays                       | scrub, seek, effect toggle, frame capture                             | timeline JSON + small media metadata fixture                          | PARTIAL        |

## 6. Backlog

### PG-MVP-001 [P0] Scenario catalog coverage contract

- Status: PARTIAL
- Scope: ensure S1-S13 are represented once in routes, local scenario registry, docs, and data manifests.
- Acceptance:
  - Automated test fails if any S1-S13 id is missing.
  - Route labels and task matrix ids stay synchronized.

### PG-MVP-002 [P0] Data folder and manifest convention

- Status: TODO
- Scope: create scenario-owned data folders and `data-manifest.json` schema.
- Acceptance:
  - Each scenario has local fixture manifest.
  - Manifest records source URL, license, checksum, format, size, and adapter owner.
  - Remote-only datasets become explicit fallback, not the canonical sample path.

### PG-MVP-003 [P1] Replace proxy datasets with scenario-appropriate samples

- Status: TODO
- Scope: download or vendor small permitted fixtures for DICOM/OME, IFC, 3D Tiles, OpenSCENARIO-like, SVG, glTF, timeline JSON, and molecular/volume samples.
- Acceptance:
  - No dataset is added without license and checksum.
  - Fixtures are small enough for repository policy or stored behind scripted download.
  - Each parser produces deterministic `PlaygroundSceneSnapshot` output.

### PG-MVP-004 [P1] Scenario document model specs

- Status: TODO
- Scope: add per-scenario model docs describing source data, adapter output, engine graph/resources, interactions, and MVP limitations.
- Acceptance:
  - Each scenario doc separates domain model from engine generic graph.
  - Each doc lists required engine APIs and current gaps.

### PG-MVP-005 [P1] Interaction harness per scenario

- Status: TODO
- Scope: add minimal controls for each scenario: fit, reset, pick, query, timeline controls where relevant, variant/layer toggles where relevant.
- Acceptance:
  - Every scenario has at least one interaction beyond static render.
  - Interactions update diagnostics/status and remain deterministic.

### PG-MVP-006 [P1] Browser smoke and screenshot checks

- Status: TODO
- Scope: run route-level smoke across all scenario pages and local 3D editor route.
- Acceptance:
  - Canvas is nonblank.
  - Node count and draw count are visible in status.
  - Failed data load degrades to deterministic local fallback.

### PG-MVP-007 [P2] Streaming and scale gates

- Status: TODO
- Scope: add tile/LOD/streaming stress variants for S5/S7 and dense scene gates for S3/S4/S10.
- Acceptance:
  - Frame budget diagnostics show pressure decisions.
  - Scenario remains navigable under reduced quality.

## 7. Release Readiness Opinion

Playground is already useful as an engine smoke surface and has a good route shell for S1-S13. It is not yet a scenario-validation product because most remote data is proxy data, local data folders are absent, and per-scenario interactions are shallow. The next milestone should be data-manifest first, then one true-format MVP fixture per scenario, then deterministic scene-builder tests and browser smoke coverage.
