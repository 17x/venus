# Playground Multi-Scenario Atomic Requirements (2026-06-02)

## 0. Purpose

This document is the handoff source of truth for playground multi-scenario analysis and validation work.

Primary goal:

- Use playground multi-scenario demos, especially `3deditor` and `game`, to discover, enrich, and validate `engine` capabilities.
- Turn scenario needs into product-neutral, 3D-first engine APIs.
- Complete matching engine contract tests and bilingual API documentation.
- Keep playground as the validation surface, not the final owner of reusable runtime capability.

It merges and supersedes the active planning parts of:

- `.ai-tasks/playground/playground-scenario-validation-plan-2026-05-29.md`
- `.ai-tasks/playground/scenario-data-and-demo-plan-2026-05-29.md`
- `.ai-tasks/playground/playground-game-s10-mvp-plan-2026-06-01.md`
- `.ai-tasks/engine/engine-requirements-simplified-and-gap-check-2026-06-01.md`
- `.ai-tasks/engine/engine-openworld-capability-backlog-2026-06-01.md`
- `.ai-tasks/engine/engine-texture-capability-gap-check-2026-06-01.md`
- `.ai-tasks/engine/engine-scenario-foundation-plan-2026-05-29.md`

Use this document when switching agents. Older documents remain historical evidence and detailed references.

## 1. Non-Negotiable Boundaries

- `playground` may use scenario/product/domain labels.
- `engine` must stay 3D-first, API-first, product-neutral, and scenario-neutral.
- New reusable capability must be specified as engine API first, then implemented in engine, then consumed by playground.
- `vector-2d` remains an explicit adapter/opt-in path; it must not make 2D the engine default.
- `vector-editor-web` owns Vector2D commercial product semantics: pages, artboards, layers, tools, panels, masks, rich text, styles, export/import, and collaboration workflows.
- `playground` adapters convert scenario data into generic engine graph/resources/runtime APIs.
- Vector2D adapters convert product document data into generic engine graph/resources/runtime APIs; engine must not receive Figma/Illustrator/vector-product naming.
- Engine private imports are forbidden from playground scenario adapters.
- All scenario demos must expose observable diagnostics, not only static visuals.
- All new public engine APIs require contract tests and bilingual docs.

## 2. Current State Snapshot

### 2.1 Playground Routes And Scenario Coverage

- Local capability probes exist for `2d-basic`, `2d-interactive`, `2d-performance`, `3d-spatial`, `3d-editor-validation`, `webgl-render`, `canvas2d-fallback`, and `headless-deterministic`.
- Remote S1-S13 definitions exist, but most use proxy datasets.
- Scenario validation contracts already cover route/catalog/model/fixture planning at a basic level.
- Missing: local scenario-owned fixtures, true scenario data formats, deeper per-scenario interactions, browser screenshot/nonblank checks per scenario.

### 2.2 3D Editor Current State

Code pointers:

- `apps/playground/src/runtime/threeEditor/mountThreeEditorRuntime.ts`
- `apps/playground/src/runtime/threeEditor/buildThreeEditorEngineGraph.ts`
- `apps/playground/src/runtime/threeEditor/rawInputToCameraCommandAdapter.ts`
- `apps/playground/src/runtime/threeEditor/threeEditorRuntimeContracts.ts`
- `apps/playground/src/scenarios/3d-editor-validation/scene.ts`

Implemented/partially implemented:

- Engine graph-first 3D editor runtime.
- Orbit / Arcball camera interaction with azimuth/polar semantics.
- Stable ground grid improvements.
- Global gizmo overlay in the top-right.
- Object selection, hover, semi-transparent selected mesh, back-edge highlight.
- Transform gizmo nodes for translate/rotate/scale visuals.
- Basic transform gizmo interaction.
- Floor/panel texture graph now submits engine `materials`, mesh `uvs`, and `materialId`.
- Browser-side sampled public texture fallback has been removed after route-level texture parity proof.
- Lighting now uses `engine.runtime.lighting.applyEnvironment(...)`.

Known gaps:

- Transform gizmo interaction is still MVP-level and needs precise axis/plane behavior.
- Rotation and scale handles need stronger visual and behavioral parity.
- Selected-object back-edge highlight needs route-level screenshot verification.
- Atmosphere/haze output from `applyEnvironment` is not yet visualized in 3D editor.
- True engine UV/material texture path exists for floor/panel, with browser screenshot parity proving decoded texture output after fallback tile removal.
- 3D editor does not yet express an authoring/runtime split comparable to S10 game preview.

### 2.3 Game Current State

Code pointers:

- `apps/playground/src/demos/drivingGamePage.ts`
- `apps/playground/src/demos/drivingGameScene.ts`
- `apps/playground/src/demos/drivingGameTypes.ts`
- `apps/playground/src/demos/cityWorldGenerator.ts`
- `packages/engine/src/testing/openWorldRuntime.contract.test.ts`

Implemented/partially implemented:

- City open-world MVP with generated roads/buildings/blockers/lamps/paths.
- Player vehicle movement with replaceable vehicle profile.
- NPC cars and pedestrians move along generated paths.
- Collision against city blockers uses `engine.runtime.collision.resolve(...)`.
- Open-world blockers are synced via `engine.runtime.collision.setObstacles(...)`.
- Agents step via `engine.runtime.navigation.setAgents(...)` and `engine.runtime.navigation.stepAgents(...)`.
- Time, direction, and weather controls exist.
- Weather uses lighting/atmosphere inputs through `engine.runtime.lighting.applyEnvironment(...)`.
- Minimap exists with rotation, north pointer, zoom levels, blockers, NPCs, player heading, and sun direction.
- Sun/moon are sphere meshes rather than boxes.
- Ground/road texture graph now submits engine `materials`, mesh `uvs`, and `materialId`.
- Public sampled texture fallback has been removed after route-level texture parity proof for ground/roads.

Known gaps:

- Map generator is mock-only and not fixture/schema driven.
- Collision is circle-vs-AABB only; no broadphase, triggers, or typed collider registry.
- Roads/buildings/agents/paths are app-side domain objects, not normalized scenario fixture documents.
- NPC behavior is simple path following; no traffic rules, avoidance, or nav graph.
- Sun/weather visual layer is MVP atmosphere and light color, no particles for rain/fog.
- Buildings, pedestrians, cars, lamps are simple procedural geometry; no model/asset runtime.
- WebGL/WebGPU material texture upload/bind parity exists for the true texture pipeline.
- Browser screenshot/canvas-pixel route tests prove decoded texture diagnostics on nonblank city/editor canvases.

### 2.4 Vector2D Commercialization Current State

Code/docs pointers:

- `apps/vector-editor-web/`
- `.ai-tasks/vector-editor/vector2d-canonical-authoring-model-contract-2026-06-03.md`
- `.ai-tasks/vector-editor/vector-commercial-mvp-document-model-plan-2026-05-29.md`
- `.ai-tasks/vector-editor/vector-commercial-mvp-assessment-2026-05-29.md`
- `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md`
- `.ai-tasks/release-program/commercial-launch-track-2026-06-01.md`

Current planning coverage:

- Vector commercial MVP is already tracked in `.ai-tasks/vector-editor/*` and release-program docs.
- Current playground coverage only includes `PG-S12` as a Vector 2D opt-in validation scenario.
- Engine boundary is correct in principle: Vector2D product data is adapted into generic engine graph/resources/runtime APIs through explicit 2D opt-in.

Commercialization gaps to keep visible from this playground/engine ledger:

- Product logic is not yet release-complete: canonical document ownership, file/runtime normalization, fixture completeness, persistence, command policy, undo/redo, and export/import need hard gates.
- Interaction is not yet release-complete: tool switching, selection precedence, path editing, transform/resize/rotate, snapping/guides, masks/booleans, keyboard modifiers, and recovery flows need product-grade coverage.
- UI is not yet release-complete: layer panel, property inspector, style/asset panels, toolbar modes, status/diagnostics, empty/error states, and release smoke flows need cohesive commercial acceptance.
- Deep Vector2D execution is now tracked in `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md` across UI, inspector, overlays, handlers, drawing tools, transform/group, file CRUD, element CRUD, and product-runtime-engine full-chain gates.
- Engine bridge must remain adapter-owned: only generic engine APIs and explicit 2D opt-in may be requested; vector product semantics stay outside engine.

## 3. Priority Model

- P0: Engine capability/API/doc gaps that block credible scenario validation.
- P1: Playground validation depth and MVP demo completeness that exposes more engine capability requirements.
- P2: Productization depth, scale, polish, or advanced scenario coverage.

Status values:

- TODO: not implemented.
- DOING: actively being built.
- PARTIAL: some implementation exists but acceptance is not satisfied.
- DONE: implementation, tests, and docs are complete.

## 4. Global Atomic Requirements

### PG-GLOBAL-001 [P0] Scenario-owned fixture manifest convention

Status: DONE

Requirement:

- Add a manifest convention for every S1-S13 scenario.
- Each manifest records id, source, license, checksum, format, fixture size, adapter owner, and fallback mode.

Acceptance:

- A contract test fails if any S1-S13 fixture manifest is missing.
- Remote-only datasets are marked as fallback, not canonical local fixture.

### PG-GLOBAL-002 [P0] Scenario adapter boundary contract

Status: DONE

Requirement:

- Every scenario adapter must map domain data to generic engine graph/resources/runtime APIs.
- No adapter imports engine private modules.

Acceptance:

- Existing private-import boundary tests include playground scenario adapter paths.
- Each scenario model spec lists domain model, adapter output, and engine API usage.

### PG-GLOBAL-003 [P0] Route smoke and nonblank canvas checks

Status: DONE

Requirement:

- Every local/remote playground scenario route must load and render a nonblank surface.

Acceptance:

- Browser test visits each route.
- Canvas pixel sample proves nonblank render.
- Route status exposes node count and draw count.

Progress:

- Added browser smoke coverage for every S1-S13 remote scenario route.
- The test mocks public dataset fetches with deterministic CSV/JSON fixtures so route validation is network-independent.
- Each route must expose `#remote-status` with positive `nodes` and `draw` values.
- Each route must render a nonblank, multi-color `#remote-canvas` sample.

### PG-GLOBAL-004 [P1] Per-scenario interaction harness

Status: DONE

Requirement:

- Every scenario has at least one meaningful interaction beyond static render.

Acceptance:

- Interaction mutates deterministic state.
- Status/diagnostics updates after interaction.
- Scenario-specific smoke test covers the interaction.

Progress:

- Remote scenario harness controls now mutate deterministic state for every S1-S13 route.
- Generic remote scenario controls advance `previewStep`, update selection diagnostics, advance revision, and re-render.
- S10 keeps its scenario-specific preview-step/pick/play/stop behavior.
- Browser smoke now clicks one harness control per scenario and asserts deterministic status changes while the canvas remains nonblank.

### PG-GLOBAL-005 [P1] Scenario docs

Status: TODO

Requirement:

- Add one concise doc per S1-S13 scenario.

Acceptance:

- Each doc lists model, fixtures, adapter output, engine APIs, interactions, current limitations, and validation commands.

## 5. 3D Editor Atomic Requirements

### PG-3DE-001 [P0] Stabilize Orbit / Arcball camera behavior

Status: DONE

Requirement:

- Mouse left drag rotates camera around target.
- Drag left increases view toward object right side.
- Drag right increases view toward object left side.
- Drag up moves camera upward/over target.
- Drag down moves camera downward/under target.

Acceptance:

- Dedicated contract test covers raw input to camera command signs.
- Manual smoke: grid and objects stay stable across pan/orbit/zoom.

Progress:

- Added a raw input adapter contract for mouse orbit drag signs across left/right/up/down movement.
- Added browser smoke coverage for the local `#/3dEditor` route that performs orbit, shift-pan, and wheel zoom interactions.
- Browser smoke verifies camera state mutation, finite camera telemetry, positive draw status, and grid visibility after each interaction.

### PG-3DE-002 [P0] Grid stability verification

Status: DONE

Requirement:

- Grid lines must remain stable at different distances, angles, and zooms.

Acceptance:

- `gridStability3dEditor.contract.test.ts` or equivalent verifies deterministic grid graph output.
- Browser screenshot smoke confirms no line drift at near/mid/far camera states.

Progress:

- Extended `gridStability3dEditor.contract.test.ts` to verify runtime grid mesh ids, topology, colors, positions, and indices remain deterministic across near/mid/far camera distance and angle states.
- Extended 3D editor browser smoke to set near/mid/far camera states through the runtime API and sample screenshots for nonblank pixels, color detail, and edge/line transitions.
- The browser smoke keeps `grid on` and positive draw diagnostics as part of each camera-state check.

### PG-3DE-003 [P0] Selection rendering

Status: DONE

Requirement:

- Selected object is semi-transparent.
- Selected object back edges are highlighted.
- Hover and selected states are visually distinct.

Acceptance:

- Graph builder test asserts selected material opacity and outline nodes.
- Browser screenshot confirms selected mesh remains readable.

Progress:

- Added graph contract coverage proving selected objects use transparent mesh color and generate four back-edge outline nodes.
- Added graph contract coverage proving hover highlight and selected rendering remain visually distinct.
- Extended 3D editor browser smoke to select `Main Cube` from the document model, verify hit/status selection diagnostics, and sample the canvas for readability, edge detail, and selection accent pixels.

### PG-3DE-004 [P0] Transform controls behavior

Status: DONE

Requirement:

- Translate arrows, rotate rings, and scale handles must be visible and interactable.
- Interaction changes the selected object transform deterministically.

Acceptance:

- Pointer hit on gizmo node resolves axis and mode.
- Dragging X/Y/Z translate handle changes only expected position component.
- Rotate and scale modes have at least one deterministic contract test each.

Progress:

- Added a transform-control helper for gizmo node id axis/mode resolution and snapshot-based drag transform math.
- Runtime gizmo drags now use drag-start snapshots for deterministic translate, rotate, and scale updates.
- Added contract coverage for translate X/Y/Z, rotate, scale, visible translate/rotate/scale gizmo handles, and transformed graph semantics.
- Extended 3D editor browser smoke to select `Main Cube`, apply deterministic translate/rotate/scale transform drags, verify object state updates, and confirm the canvas remains readable.

### PG-3DE-005 [P1] Top-right global gizmo indicator

Status: DONE

Requirement:

- Global gizmo indicator remains fixed in the top-right and reflects camera orientation.

Acceptance:

- Route smoke confirms only one global gizmo overlay exists.
- Visual overlap check confirms it does not cover app controls.

Progress:

- Extended 3D editor browser smoke to assert exactly one `#global-gizmo-overlay` exists on the local `#/3dEditor` route.
- Browser smoke verifies the overlay is absolute-positioned, pointer-transparent, fixed to the top-right of the canvas frame, and non-overlapping with command/document panels.
- Browser smoke samples the overlay canvas and verifies it redraws when camera yaw/pitch changes.

### PG-3DE-006 [P1] Environment lighting UI parity

Status: DONE

Requirement:

- 3D editor light controls use `engine.runtime.lighting.applyEnvironment(...)`.
- Controls expose direction, time, cloud, rain, fog, directional intensity, and ambient intensity.

Acceptance:

- Changing each control changes active lighting output.
- Status row shows active environment values.
- Engine lighting API remains product-neutral.

Progress:

- Added stable 3D editor lighting control selectors for direction, time, cloud, rain, fog, directional intensity, and ambient intensity.
- Extended status telemetry to show active `lightDir`, `dirI`, `ambI`, `time`, `cloud`, `rain`, `fog`, and `activeLights` values.
- Extended 3D editor browser smoke to change every environment lighting control and verify local lighting state, status telemetry, and active engine lighting collection output all update.
- 3D editor lighting continues to use product-neutral `engine.runtime.lighting.applyEnvironment(...)`.

### PG-3DE-007 [P1] Atmosphere visualization

Status: DONE

Requirement:

- 3D editor visualizes `applyEnvironment(...).atmosphere` haze output.

Acceptance:

- Haze layer or graph effect responds to cloud/rain/fog values.
- Haze does not obscure transform controls.

Progress:

- Added a pointer-transparent `#atmosphere-haze-layer` inside the 3D editor canvas frame.
- The haze layer is driven by `engine.runtime.lighting.applyEnvironment(...).atmosphere` and updates from active sky color, haze color, and haze opacity.
- Status telemetry now includes active `haze` opacity.
- Browser smoke changes cloud/rain/fog controls, verifies atmosphere state/status/style changes, and confirms selected transform accents remain visible through the haze layer.

### PG-3DE-008 [P1] Texture productization bridge

Status: DONE

Requirement:

- Submit editor texture surfaces through engine graph `materials`, mesh `uvs`, and `materialId`.
- Sampled-color texture fallback has been removed after visual parity proof.

Acceptance:

- Floor and object panel nodes include engine material ids and non-empty UV payloads.
- Contract test proves the 3D editor scene submits floor/panel texture materials through the engine graph contract.
- Browser screenshot parity proves decoded WebGL textures after sampled-color fallback removal.

### PG-3DE-009 [P2] Authoring/runtime split probe

Status: DONE

Requirement:

- Add a 3D editor mode that compares authoring graph and runtime graph output.

Acceptance:

- UI exposes authoring/runtime graph counts.
- Contract test verifies deterministic compile/extraction parity signature.

Progress:

- Added a visible 3D editor `Authoring / Runtime` panel that reports authoring/runtime node/material counts, parity state, and preview step.
- Status telemetry also exposes authoring/runtime graph counts alongside parity.
- Added a browser smoke check proving the UI/status counts are visible and stay parity-matched after selection changes.
- Added a contract test proving deterministic authoring/runtime snapshot signatures, node/material counts, preview token signature, and zero diff.

## 6. Game Atomic Requirements

### PG-GAME-001 [P0] Scenario fixture schema

Status: DONE

Requirement:

- Define local game fixture schema for world bounds, roads, buildings, lamps, agents, paths, vehicles, weather defaults, and preview seed.

Acceptance:

- `apps/playground/public/scenario-fixtures/s10/` contains fixture and manifest.
- Fixture loading path replaces hardcoded-only mock generator as canonical input.
- Mock generator remains allowed as fallback/dev generator.

Implementation:

- Fixture: `apps/playground/public/scenario-fixtures/s10/s10-city-openworld.fixture.json`
- Manifest: `apps/playground/public/scenario-fixtures/s10/data-manifest.json`
- Adapter: `apps/playground/src/demos/drivingGameFixture.ts`
- State integration: `apps/playground/src/demos/drivingGameTypes.ts`
- Page loading path: `apps/playground/src/demos/drivingGamePage.ts`
- Contract test: `apps/playground/src/testing/drivingGameFixture.contract.test.ts`

### PG-GAME-002 [P0] Map generator determinism

Status: DONE

Requirement:

- City map generation must be seed-driven and deterministic.

Acceptance:

- Same seed and map size produce identical roads/buildings/blockers/paths.
- Contract test verifies stable signature.

Implementation:

- `generateCityWorldMap(mapSize, seed)` now accepts an explicit seed while preserving the legacy map-size-only default.
- Driving game fixture projection passes `previewSeed` into `configPatch.mapSeed` so fallback/dev regeneration uses fixture seed state.
- Map-size UI regeneration uses the active `config.mapSeed` instead of implicitly reseeding from size alone.
- Contract test: `apps/playground/src/testing/drivingGameMapGenerator.contract.test.ts`

### PG-GAME-003 [P0] Engine open-world API usage

Status: DONE

Requirement:

- Game must continue using generic engine APIs for open-world state:
  - `engine.runtime.navigation.setAgents`
  - `engine.runtime.navigation.stepAgents`
  - `engine.runtime.collision.setObstacles`
  - `engine.runtime.collision.resolve`

Acceptance:

- Game page does not reimplement collision resolution for player blockers.
- Contract tests cover engine APIs.
- No engine API names contain game/city/product semantics.

Implementation:

- S10 game page synchronizes blockers through `engine.runtime.collision.setObstacles` and delegates player blocker penetration to `engine.runtime.collision.resolve`.
- S10 game page synchronizes and steps NPC/pedestrian state through `engine.runtime.navigation.setAgents` and `engine.runtime.navigation.stepAgents`.
- Added a source-level contract that guards `updateGame` against direct blocker collision resolution and verifies required generic runtime calls remain present.
- Added runtime namespace checks proving navigation/collision/open-world method names stay generic and free of game/city/product terms.
- Contract test: `apps/playground/src/testing/drivingGameOpenWorldApiUsage.contract.test.ts`

### PG-GAME-004 [P0] Collision expansion

Status: DONE

Requirement:

- Prevent player/NPC/pedestrian penetration through buildings and blockers.

Acceptance:

- Player cannot pass blockers.
- NPC agents have collision or avoidance policy documented.
- Engine backlog tracks collider registry, broadphase query, penetration resolution, and trigger events.

Implementation:

- Added substepped S10 player movement resolution through `engine.runtime.collision.resolve` to prevent high-delta blocker pass-through while keeping the engine API generic.
- Tightened fallback/generated NPC and pedestrian paths so they stay inside the boundary blocker ring.
- Fixed canonical S10 fixture pedestrian path/spawn to avoid the northwest blocker.
- Documented S10 NPC/pedestrian collision policy as path-authored avoidance in `apps/playground/src/demos/README.md`.
- Updated the engine open-world backlog to reflect landed collision registry, broadphase query, penetration resolution, and trigger event coverage, with collision-aware navigation and swept collision remaining as future productization work.
- Contract test: `apps/playground/src/testing/drivingGameCollisionExpansion.contract.test.ts`

### PG-GAME-005 [P0] Vehicle-bound acceleration

Status: DONE

Requirement:

- Acceleration, mass, max speed, radius, and brake/drag behavior are derived from selected vehicle profile.

Acceptance:

- Switching vehicle changes movement response without changing engine API.
- Contract test verifies profile values alter velocity integration.

Implementation:

- Added exported S10 vehicle profiles with profile-owned `mass`, `acceleration`, `maxSpeed`, `radius`, `brakeDeceleration`, and `drag` values.
- Added a profile resolver that keeps existing config sliders as tuning multipliers while preserving vehicle-selected base behavior.
- Routed player velocity integration through a pure `resolveDrivingGameVehicleVelocityStep` helper used by `updateGame`.
- Contract test verifies selected vehicle changes acceleration, max-speed clamp, radius, drag, and brake behavior without introducing engine game/vehicle-specific APIs.
- Contract test: `apps/playground/src/testing/drivingGameVehicleProfiles.contract.test.ts`

### PG-GAME-006 [P1] NPC movement depth

Status: DONE

Requirement:

- Cars and pedestrians must move visibly and deterministically.

Acceptance:

- Agent path step is deterministic.
- Minimap positions update.
- Future backlog records traffic rules, pedestrian avoidance, and spawn/despawn.

Implementation:

- Added a deterministic S10 NPC/pedestrian movement helper that syncs agents and steps them through `engine.runtime.navigation.stepAgents`.
- Added a pure minimap projection helper and routed minimap rendering through it so marker position updates are contract-testable.
- Contract test verifies cars and pedestrians move visibly and deterministically, engine navigation state matches stepped agents, and minimap projections update after movement.
- Updated the engine open-world backlog to retain traffic rules, pedestrian avoidance, and spawn/despawn lifecycle as future navigation/productization work.
- Contract test: `apps/playground/src/testing/drivingGameNpcMovement.contract.test.ts`

### PG-GAME-007 [P1] Lighting, time, and weather

Status: DONE

Requirement:

- Game exposes direction, time, and weather.
- Default weather is sunny.
- Weather presets map to neutral environment inputs before calling engine.

Acceptance:

- Sunny/cloudy/rainy/foggy visibly affect lighting/atmosphere.
- `engine.runtime.lighting.applyEnvironment(...)` is the source of active runtime lights.
- Rain/fog particles are tracked separately as P2.

Implementation:

- Added a pure S10 weather preset mapper that converts `sunny/cloudy/rainy/foggy` into neutral environment inputs before calling engine lighting.
- S10 lighting continues to use `engine.runtime.lighting.applyEnvironment(...)` as the source of active runtime lights and atmosphere output.
- Contract test verifies direction/time/weather controls exist, default weather remains sunny, weather presets map to neutral inputs, active engine lighting output updates through `applyEnvironment`, and weather changes visible ground/road colors plus atmosphere haze opacity.
- Contract test also guards rain/fog particles as separate `PG-GAME-012 [P2]` work.
- Contract test: `apps/playground/src/testing/drivingGameLightingWeather.contract.test.ts`

### PG-GAME-008 [P1] Sun/moon rendering

Status: DONE

Requirement:

- Sky objects indicate light direction.
- Sun/moon must use sphere-like meshes, not boxes.

Acceptance:

- Scene builder test asserts sun/moon mesh topology is sphere-derived.
- Sun direction matches minimap indicator and runtime lighting direction.

Implementation:

- Added shared S10 sun-direction math used by scene/model placement and minimap sun indicator rendering.
- Upgraded registered sun/moon model assets from single-triangle placeholders to sphere-derived procedural meshes.
- Scene graph sun/moon instances continue rendering through sphere-derived mesh topology, not boxes.
- Contract test verifies sun/moon scene meshes and registered model assets are sphere-derived, and sun direction matches scene placement, minimap indicator math, and `engine.runtime.lighting.applyEnvironment(...)` key-light direction.
- Contract test: `apps/playground/src/testing/drivingGameSunMoonRendering.contract.test.ts`

### PG-GAME-009 [P1] Minimap

Status: DONE

Requirement:

- Minimap shows map footprint, blockers, player, NPC cars, pedestrians, north pointer, zoom level, and rotation-follow behavior.

Acceptance:

- Minimap rotates with camera.
- North pointer remains readable.
- Zoom level control changes map scale.

Implementation:

- Added a pure minimap north-indicator helper so the compass arrow rotates with camera-relative map projection while the `N` label stays in a fixed readable corner widget.
- Kept minimap projection driven by `miniMapZoomLevel`, with near/mid/far changing map scale through the shared projection helper.
- Contract test verifies camera rotation projection, zoom scale ordering, readable rotating north pointer geometry, required minimap layers, and zoom-control wiring.
- Contract test: `apps/playground/src/testing/drivingGameMinimap.contract.test.ts`

### PG-GAME-010 [P1] Open-world model variety

Status: DONE

Requirement:

- Add more model types: roads, sidewalks, buildings, lamps, vehicles, pedestrians, props.

Acceptance:

- Scene has at least one visible instance per model type.
- Light sources exist on lamps where appropriate.
- Model types remain playground/domain data, not engine API names.

Implementation:

- Added sidewalk and prop domain data to generated and canonical S10 city maps.
- Scene builder renders visible roads, sidewalks, buildings, lamp posts/heads, vehicles, pedestrians, and props from playground/domain data.
- Extracted lamp point-light generation into a pure runtime helper reused by lighting sync and tested for night/fog conditions.
- Contract test verifies generated and fixture model variety, visible scene nodes for each required type, lamp light emission, and that road/sidewalk/building/prop variety does not become engine model API names.
- Contract test: `apps/playground/src/testing/drivingGameOpenWorldModelVariety.contract.test.ts`

### PG-GAME-011 [P1] True texture migration

Status: DONE

Requirement:

- Submit ground and road texture surfaces through engine graph `materials`, mesh `uvs`, and `materialId`.
- Sampled-color texture fallback has been removed after visual parity proof.

Acceptance:

- Ground and road nodes include engine material ids and non-empty UV payloads.
- Contract test proves the game scene submits ground/road texture materials through the engine graph contract.
- Browser screenshot parity proves decoded WebGL textures after sampled-color fallback removal.

### PG-GAME-012 [P2] Weather particles

Status: DONE

Requirement:

- Add rainy/foggy particle or volumetric visual layer after lighting/atmosphere is stable.

Acceptance:

- Particle effect can be toggled.
- It is deterministic enough for smoke/screenshot tests.

Implementation:

- Added `weatherParticlesEnabled` config/fixture/settings toggle for S10 weather effects.
- Scene builder emits deterministic rain streak nodes for rainy weather and deterministic fog band nodes for foggy weather.
- Particle nodes are seeded from stable S10 config/state inputs and use stable `weather-rain-*` / `weather-fog-*` ids for smoke/screenshot tests.
- Sunny/cloudy weather and disabled toggle produce no weather particle nodes.
- Contract test verifies toggle behavior, fixture/settings wiring, rain/fog specificity, deterministic signatures, and scene graph visibility.
- Contract test: `apps/playground/src/testing/drivingGameWeatherParticles.contract.test.ts`

### PG-GAME-013 [P2] Authoring/runtime preview parity

Status: DONE

Requirement:

- Implement S10 editor/runtime preview loop for game-domain fixture.

Acceptance:

- Authoring graph to runtime graph compile path is visible.
- Play/step/stop/reset works on fixed tick.
- Snapshot signature is deterministic for same seed.

Implementation:

- Added reusable S10 preview compile helper that creates authoring/runtime snapshots, compares parity, and creates a preview token through `engine.runtime.authoring`.
- Added reusable S10 preview control reducer for play, fixed-step, stop, reset, and node-pick behavior.
- Remote S10 page now exposes parity/signature telemetry in status text and uses a shared fixed tick interval constant for preview playback.
- Added `reset preview` to the S10 interaction harness controls.
- Contract test verifies fixed tick play/step/stop/reset behavior, deterministic authoring/runtime/preview signatures, and visible remote-page compile telemetry.
- Contract test: `apps/playground/src/testing/s10GameRuntimeInteractions.contract.test.ts`

## 7. Other S1-S13 Atomic Requirements

### PG-S01 [P1] Medical volume MVP

Status: DONE

Requirement:

- Use a local volume-like fixture with slice, transfer function, ROI pick, and capture controls.

Implementation:

- Switched S1 medical volume route from remote/public scalar CSV to checked-in local fixture `/scenario-fixtures/s1/volcano.csv`.
- Scene builder emits volume slice cells with deterministic intensity metadata plus transfer, slice, ROI, and capture status nodes.
- Added S1 medical interaction helper for deterministic slice scrub, transfer preset cycling, ROI pick, and capture frame state updates.
- Remote scenario page routes S1 controls through the S1 helper while preserving fit-view behavior.
- Scenario harness, data manifest, and model spec now describe the local fixture and full S1 MVP controls.
- Contract test verifies local fixture source, volume metadata, transfer/ROI/capture nodes, deterministic control mutations, and harness control declarations.
- Contract test: `apps/playground/src/testing/s1MedicalVolumeMvp.contract.test.ts`

### PG-S02 [P1] Path simulation MVP

Status: DONE

Requirement:

- Use path/constraint/risk-zone fixture with edit, replay, and clearance query controls.

Implementation:

- Switched S2 path simulation route from remote/public airport CSV to checked-in local fixture `/scenario-fixtures/s2/airports.csv`.
- Scene builder emits waypoint path nodes, corridor constraint overlay, deterministic risk zones, replay marker, edit/replay/clearance status labels, and waypoint metadata.
- Added S2 path interaction helper for deterministic edit path, path step replay, pick waypoint, and clearance query state updates.
- Remote scenario page routes S2 controls through the S2 helper while preserving fit-view behavior.
- Scenario harness, data manifest, and model spec now describe the local path/constraint/risk-zone fixture and full S2 MVP controls.
- Contract test verifies local fixture source, graph overlays/status nodes, deterministic control mutations, and route/harness control declarations.
- Contract test: `apps/playground/src/testing/s2PathSimulationMvp.contract.test.ts`

### PG-S03 [P1] BIM review MVP

Status: PARTIAL

Requirement:

- Use IFC-derived or simplified building hierarchy fixture with select/isolate/section/property controls.

### PG-S04 [P1] CAD assembly MVP

Status: TODO

Requirement:

- Use assembly/constraint fixture with explode, clash/clearance, and measurement controls.

### PG-S05 [P1] GIS map MVP

Status: PARTIAL

Requirement:

- Use GeoJSON plus tile/LOD metadata with pan/zoom/pick/layer toggles.

### PG-S06 [P1] Driving replay MVP

Status: TODO

Requirement:

- Use OpenSCENARIO-like trajectory fixture with play/seek/follow/sensor overlay controls.

### PG-S07 [P1] City twin MVP

Status: TODO

Requirement:

- Use city tiles/buildings plus telemetry fixture with alert layer and drilldown controls.

### PG-S08 [P1] Commerce 3D product MVP

Status: PARTIAL

Requirement:

- Use glTF-like product asset plus variant/material/camera/light controls.

### PG-S09 [P1] Molecular/volume MVP

Status: TODO

Requirement:

- Use atom/bond/surface or scalar-grid fixture with rotate/select/clip/slice controls.

### PG-S11 [P0] Node headless rendering MVP

Status: PARTIAL

Requirement:

- Use JSON scene request plus expected output signature and diagnostics compare controls.

### PG-S12 [P0] Vector 2D opt-in MVP alignment

Status: PARTIAL

Requirement:

- Use SVG/vector fixture, path/selection/style/mask/text interactions, and explicit engine 2D opt-in adapter.

Commercialization scope:

- This item is the playground/engine validation bridge for Vector2D, not the full commercial product backlog.
- Commercial product execution is tracked under `.ai-tasks/vector-editor/*`, especially `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md` and:
  - `VEC-MVP-001` document model single source of truth.
  - `VEC-MVP-002` fixture complete sample document.
  - `VEC-MVP-003` normalization and round-trip contracts.
  - `VEC-MVP-004` commercial editing core hardening.
  - `VEC-MVP-005` shape/path/text/style production baseline.
  - `VEC-MVP-008` engine bridge release gate.

Acceptance:

- Vector route uses a representative SVG/vector fixture and canonical vector editor fixture JSON.
- Adapter explicitly opts into engine 2D mode and converts vector document/page/artboard/layer/path/text/style/mask data into generic engine graph/resources/runtime payloads.
- Path edit, selection, lasso or marquee, snapping, style edit, mask visibility, and rich-text edit controls mutate deterministic state and update diagnostics.
- Browser smoke proves the vector canvas is nonblank after interaction and exposes adapter/render diagnostics.
- Source-level contract proves vector app uses only public `@venus/engine` APIs and no engine private imports.
- Engine API requests stay generic; no engine API names contain vector-product, Figma, Illustrator, artboard, layer-panel, or tool-specific semantics.

Known commercial gaps:

- Product logic, interaction depth, and UI polish remain insufficient for a paid Vector2D release until the vector-editor MVP tasks above are completed.
- Playground S12 should validate engine bridge behavior, but product-grade UI/UX belongs in `apps/vector-editor-web` and `.ai-tasks/vector-editor/*`.

### PG-S13 [P1] Video timeline MVP

Status: PARTIAL

Requirement:

- Use timeline JSON and media metadata fixture with scrub/seek/effect toggle/frame capture.

## 8. Engine Follow-Up Requirements Discovered By Playground

This is the primary implementation queue. Playground requirements exist to expose and validate these engine capabilities.

### ENG-PG-001 [P0] Runtime world productization

Status: DONE

Requirement:

- Move from experimental open-world helpers to stable generic world/collider/navigation APIs.

Acceptance:

- API names stay generic.
- Docs and contract tests cover map, agents, collision, and path stepping.

Progress:

- Added generic runtime namespaces:
  - `engine.runtime.navigation.setAgents/getAgents/stepAgents`
  - `engine.runtime.navigation.registerPath/unregisterPath/getPaths/stepPathAgents`
  - `engine.runtime.collision.setObstacles/getObstacles/resolve`
  - `engine.runtime.collision.registerCollider/unregisterCollider/queryAabb`
  - `engine.runtime.collision.evaluateTriggers`
- Added registered navigation path constraints:
  - `constraints.arrivalTolerance`
  - `constraints.maxStepDistance`
  - `loop: false` terminal-path behavior
- Kept `engine.runtime.world.*` helpers as compatibility aliases.
- Migrated driving game to consume navigation/collision namespaces.
- Added contract coverage in `packages/engine/src/testing/openWorldRuntime.contract.test.ts`.
- Added bilingual docs:
  - `packages/engine/docs/en/api/runtime-navigation-collision.md`
  - `packages/engine/docs/cn/api/runtime-navigation-collision.md`
- Promoted canonical `engine.runtime.navigation.*` and `engine.runtime.collision.*` capability registry entries to `stable`.
- Added `runtime.world` compatibility-alias migration guides:
  - `packages/engine/docs/en/migration/runtime-world-navigation-collision-migration.md`
  - `packages/engine/docs/cn/migration/runtime-world-navigation-collision-migration.md`
- Updated API governance docs with runtime namespace rules and rejection examples for product/2D-specific names.

Remaining:

- Keep `engine.runtime.world.*` compatibility aliases only for older consumers and alias-parity tests.

### ENG-PG-002 [P0] True 3D material texture pipeline

Status: DONE

Requirement:

- Add UV payloads, material texture refs, sampler config, backend texture upload/bind, cache diagnostics, and bilingual docs.

Acceptance:

- 3D editor/game can remove browser-side sampled-color texture fallback.

Progress:

- Added graph-level `materials` support to `EngineGraphInput`.
- Added mesh-level `uvs` and `materialId` support to native mesh payload contracts.
- Added material texture sampler descriptors for texture refs.
- Added public type exports for material and sampler contracts.
- Added contract coverage in `packages/engine/src/testing/materialTextureGraph.contract.test.ts`.
- Added WebGL native mesh texture readiness diagnostics:
  - `webglNativeMaterialTextureCandidateCount`
  - `webglNativeMaterialTextureUvReadyCount`
  - `webglNativeMaterialTextureBindingCount`
  - `webglNativeMaterialTextureUploadBytes`
  - `webglNativeMaterialTextureCacheHitCount`
  - `webglNativeMaterialTextureCacheMissCount`
  - `webglNativeMaterialTextureDecodeFailureCount`
  - `webglNativeMaterialTextureDecodeFailureReason`
  - `webglNativeMaterialTextureFallbackReason`
- Added WebGL native mesh placeholder texture bind path for texture-ready material refs.
- Added first-pass texture cache diagnostics using deterministic 1x1 placeholder uploads.
- Added WebGL async `Image` decode/upload path for URI/data-url material texture refs.
- Added contract coverage proving placeholder upload first, decoded-image upload on a later frame, and cache-hit diagnostics.
- Added WebGL sampler descriptor mapping for wrap/filter texture parameters.
- Added WebGL texture decode failure diagnostics while keeping placeholder binding active.
- Added WebGPU native material texture readiness diagnostics:
  - `webgpuNativeMaterialTextureCandidateCount`
  - `webgpuNativeMaterialTextureUvReadyCount`
  - `webgpuNativeMaterialTextureBindingCount`
  - `webgpuNativeMaterialTextureUploadBytes`
  - `webgpuNativeMaterialTextureCacheHitCount`
  - `webgpuNativeMaterialTextureCacheMissCount`
  - `webgpuNativeMaterialTextureDecodeFailureCount`
  - `webgpuNativeMaterialTextureDecodeFailureReason`
  - `webgpuNativeMaterialTextureFallbackReason`
- Added WebGPU native material texture placeholder upload/cache path using deterministic 1x1 `queue.writeTexture` uploads.
- Added WebGPU contract coverage proving placeholder upload on first texture-ready frame and cache hit on a later frame.
- Added WebGPU decoded image texture upload path using `queue.copyExternalImageToTexture` on a later frame.
- Added WebGPU contract coverage proving decoded-image upload bytes after async `Image` decode.
- Added WebGPU decoded textured mesh composition present path through native model-complete copy.
- Added WebGPU contract coverage proving decoded textured mesh `drawImage` composition and WebGPU present on a later frame.
- Updated bilingual resource/asset ingestion docs with the graph material texture contract.
- Migrated driving game ground/road graph output to submit engine `materials`, mesh `uvs`, and `materialId`.
- Migrated 3D editor floor/panel graph output to submit engine `materials`, mesh `uvs`, and `materialId`.
- Removed playground browser-side sampled-color texture fallback geometry and helper samplers from driving game and 3D editor paths.
- Added playground contract coverage in `apps/playground/src/testing/playgroundMaterialTextureGraph.contract.test.ts`.
- Added browser route texture parity coverage in `apps/playground/src/testing/materialTextureBrowserParity.contract.test.ts`:
  - S10 driving game route proves decoded WebGL material texture upload diagnostics on a nonblank canvas.
  - 3D editor route proves decoded WebGL material texture upload diagnostics on a nonblank canvas.
- Added deterministic 3D editor post-decode texture refresh so the route re-renders after backend image decode/upload becomes available.

### ENG-PG-003 [P1] Multi-light shading quality

Status: DONE

Requirement:

- Ensure point/directional/ambient/hemisphere lights visibly affect native mesh shading.

Acceptance:

- 3D editor/game lighting changes are obvious in screenshots.
- Point lights from lamps affect nearby surfaces.

Progress:

- Replaced WebGL native mesh aggregate light-count brightness with deterministic per-mesh shading.
- WebGL native mesh shading now accounts for `ambient`, `hemisphere`, `directional`, `point`, and `spot` light entity fields.
- Added backend conformance coverage proving typed runtime lights change submitted native mesh colors and point light range affects intensity.
- Added browser route parity coverage proving driving game and 3D editor screenshots change when lighting is toggled.
- Updated bilingual lighting runtime controls docs with native mesh shading behavior and scenario-neutral boundary notes.

### ENG-PG-004 [P1] Asset/model runtime

Status: DONE

Requirement:

- Add generic asset/model loading hooks, instancing, LOD, and diagnostics.

Acceptance:

- Game can use model assets for vehicles, pedestrians, lamps, and sun/moon without hardcoding procedural-only geometry.

Progress:

- Added generic `engine.runtime.model` API for scene asset registration, model instance registration, deterministic instance/LOD snapshots, and model diagnostics.
- Reused canonical `EngineSceneAsset` payloads for model assets and exported scene asset/model runtime types from the engine public surface.
- Added runtime capability-map entries and contract coverage for `runtime.model` methods.
- Added playground S10 model asset catalog and model instances for vehicles, pedestrians, lamps, sun, and moon; route code registers them through `engine.runtime.model` and exposes model diagnostics on the debug element.
- Updated bilingual resource/asset ingestion docs with runtime model namespace behavior.

### ENG-PG-005 [P1] Authoring/runtime parity API

Status: DONE

Requirement:

- Define generic authoring/runtime graph split, compile/extract parity, diff diagnostics, and runtime preview consistency APIs.

Acceptance:

- S10 game and 3D editor can both validate authoring/runtime graph parity.

Progress:

- Added generic `engine.runtime.authoring` API for authoring/runtime graph snapshots, graph snapshot comparison, deterministic preview tokens, and parity diagnostics.
- Structural parity signatures compare graph/material identity independent of role and revision while reporting `revisionDelta` separately.
- Added runtime capability-map entries and contract coverage for `runtime.authoring` methods.
- Added bilingual API docs:
  - `packages/engine/docs/en/api/runtime-authoring-parity.md`
  - `packages/engine/docs/cn/api/runtime-authoring-parity.md`
- Wired S10 driving game and 3D editor routes to create authoring/runtime snapshots, compare parity, create preview tokens, and expose route diagnostics via datasets.
- Added playground contract coverage proving both S10 game and 3D editor graph builders validate through `engine.runtime.authoring`.
- Extended browser route parity coverage to require authoring/runtime parity diagnostics on both routes.

### ENG-PG-006 [P1] Continuous collision sweep baseline

Status: DONE

Requirement:

- Promote high-speed movement continuous collision from scenario-side substep-only mitigation into a generic runtime collision API.

Acceptance:

- API names stay generic.
- Swept circle collision returns earliest collider contact, time-of-impact, impact point, normal, and safe terminal point.
- Docs and contract tests cover the public runtime collision method.

Progress:

- Added `engine.runtime.collision.sweepCircle(...)` as a stable runtime capability.
- Added public swept-circle input/output types and engine public exports.
- Added deterministic swept circle-vs-expanded-AABB implementation over active runtime colliders.
- Added contract coverage in `packages/engine/src/testing/openWorldRuntime.contract.test.ts` and capability-map coverage in `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`.
- Updated bilingual runtime navigation/collision API docs and migration docs.
- Updated engine open-world backlog to mark swept collision baseline as landed while keeping shape expansion/navigation integration as future productization work.

## 9. Validation Commands

Use these commands after touching the related areas:

```bash
pnpm -C apps/playground build
pnpm -C apps/playground exec tsx --test src/testing/remoteScenarioBrowserSmoke.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/routeScenarioSmoke.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/s1MedicalVolumeMvp.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/s2PathSimulationMvp.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/s10GameRuntimeInteractions.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameMapGenerator.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameOpenWorldApiUsage.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameCollisionExpansion.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameVehicleProfiles.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameNpcMovement.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameLightingWeather.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameSunMoonRendering.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameMinimap.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameOpenWorldModelVariety.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/drivingGameWeatherParticles.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/rawInputToCameraCommandAdapter.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/threeEditorCameraBrowserSmoke.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/gridStability3dEditor.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/threeEditorSelectionRendering.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/threeEditorTransformControls.contract.test.ts
pnpm -C apps/playground exec tsx --test src/testing/threeEditorAuthoringRuntimeParity.contract.test.ts
pnpm -C packages/engine exec tsx --test src/testing/runtimeCapabilityMap.contract.test.ts
pnpm -C packages/engine exec tsx --test src/testing/openWorldRuntime.contract.test.ts
```

## 10. Recommended Next Work Order

1. If Vector2D commercialization is the active product priority, switch to the vector track before continuing generic scenario depth:

- Start from `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md` Phase A: commercial skeleton, canonical model, fixture suite, command boundary, engine adapter contract, and full-chain signature smoke.
- Then execute Phase B: UI shell, inspector matrix, selection, marquee/lasso, transform lifecycle, and single/multi-select CRUD flows.
- Then execute Phase C: drawing tools, special handlers, style/text baselines, group/mask/boolean CRUD.
- Use `PG-S12` only as the playground/engine opt-in bridge validation surface.

2. If playground scenario validation remains the active priority, continue remaining scenario MVP work in section 7, starting with `PG-S03` BIM review MVP.
3. Continue other S1-S13 scenario MVP depth after local 3D editor, S10 game, and Vector2D bridge validation are stronger.
4. Add scenario docs (`PG-GLOBAL-005`) when implementation validation pauses.

## 11. Handoff Notes

- Continue from this document first.
- Do not continue by blindly executing old ledgers line by line.
- When implementing a requirement, update its status here and add exact code/test/doc pointers.
- If a playground requirement implies reusable runtime capability, first define the engine API contract, then implement engine, then add bilingual docs, then migrate playground to consume it.
- Keep game/editor semantics inside playground. Keep engine names generic.
