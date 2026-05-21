# Engine Headless Modular Runtime Management

Status: Completed track (maintenance cadence)
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Canonical `@venus/engine` internal target architecture after vNext cutover, with headless-first core, protocol/adapters, profile assembly, scenario profiles, and migration task governance.
Sources:

- `ai/AI_HIGHEST_STANDARD.md`
- `.github/copilot-instructions.md`
- `ai/draft.md`
- `ai/refactor.md`
- `ai/refactor-vnext/engine-refactor-management.md`
- `ai/operations/engine-vnext-post-cutover-hardening-2026-05-20.md`

## 0. Executive Decision

`@venus/engine` stays as one package during the current migration phase.

Do not split `@venus/engine-core`, renderer packages, runtime packages, or platform packages yet. The immediate target is a strong internal architecture inside the canonical engine package:

```txt
packages/engine/src
├── core/          # platform-free capability modules
├── protocol/      # contracts between core, adapters, backends, hosts, profiles
├── adapters/      # browser/node/electron/test/backend host implementations
├── profiles/      # module composition manifests and scenario/runtime profiles
├── runtime/       # assembled runtime shell produced from profiles
├── api/           # public facade and compatibility facade
└── testing/       # module/profile/adapter/scenario conformance tests
```

Package splitting becomes a later cutover decision only after internal boundaries are stable, tests prove import isolation, and package contracts stop changing rapidly.

## 1. CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
  - Future implementation target: `packages/engine/src/{core,protocol,adapters,profiles,runtime,api,testing}`

Goal:

- Problem being solved:
  - Current canonical engine is in post-cutover migration state with vNext runtime shell, compatibility bridge, staged document/compiler/ECS/spatial/picking/render execution modules, and backend priority corrections.
  - Existing documents describe the broad vNext target, but they do not yet define the post-cutover single-package modular architecture requested for headless Node.js, Electron, Browser, and future renderer/platform separation.
  - The engine needs a task-management source of truth that keeps old migration goals while redirecting development toward headless-first core modules, protocol-driven adapters, profile-based runtime assembly, and capability-gated APIs.

Change Type:

- Add:
  - Add a new active management document that defines the target document tree, source tree, ownership rules, task ledger, validation gates, and migration order.
- Modify later:
  - Update existing ledgers only when a task status changes or a superseded route must be marked as redirected.
- Remove later:
  - Remove legacy compatibility fallback paths, stale structure docs, and package-split assumptions once this management track has coverage.

Impact:

- Affected modules:
  - `packages/engine/src/api`
  - `packages/engine/src/backend`
  - `packages/engine/src/document`
  - `packages/engine/src/compiler`
  - `packages/engine/src/ecs`
  - `packages/engine/src/spatial`
  - `packages/engine/src/picking`
  - `packages/engine/src/render-*`
  - future `packages/engine/src/core`, `protocol`, `adapters`, `profiles`
- Public API impact:
  - No immediate public API removal from this document-only change.
  - Future API additions must expose capability-aware runtime handles rather than unconditional method surfaces.
- Backend/runtime impact:
  - Backend auto priority is `webgpu -> webgl -> canvas2d -> headless` unless explicitly pinned by caller.
  - Headless is a first-class runtime profile, not a last-resort no-op behavior.

Cleanup:

- Old logic to remove:
  - Runtime default legacy rendering path.
  - Any direct platform access from engine core modules.
  - Compatibility bridge methods after profile/runtime APIs replace app requirements.
  - Stale `_vnext` structure language after canonical post-cutover docs are updated.
- Rename-back or cutover condition:
  - No package rename in this phase. Internal folder migration replaces the previous `_vnext` staging approach for canonical post-cutover work.

Tests:

- Tests to add/update:
  - Core import-boundary tests.
  - Protocol contract tests.
  - Adapter conformance tests for browser/node/electron/test hosts.
  - Profile manifest validation tests.
  - Capability-gated API tests: warn in dev mode, throw in strict mode, type-level restriction where possible.
  - Backend priority tests for WebGPU/WebGL/Canvas2D/Headless.
  - Scenario profile tests for vector, headless, browser, and replay paths.

## 2. Document Structure Tree

This is the planned documentation tree for the engine migration management surface. Create documents only when they contain real decisions, contracts, or task state.

```txt
ai/
├── AI_HIGHEST_STANDARD.md
├── draft.md
├── refactor.md
├── module-map.md
├── rules-index.md
├── refactor-vnext/
│   ├── engine-headless-modular-runtime-management.md  # active post-cutover authority
│   ├── engine-refactor-management.md                  # historical vNext/cutover ledger, still referenced
│   ├── engine-vnext-change-request.md                 # original vNext shell CR, historical baseline
│   ├── adr-vnext-staging-and-cutover.md               # staging ADR, historical + future package split reference
│   ├── repo-refactor-management.md                    # repo-level package topology, not immediate engine package split
│   ├── package-apis/
│   │   ├── README.md
│   │   ├── venus-engine-vnext-api.md                  # update or supersede after canonical API stabilizes
│   │   ├── venus-runtime-api.md                       # future external package reference only
│   │   ├── venus-renderer-packages-api.md             # future external package reference only
│   │   ├── venus-platform-packages-api.md             # future external package reference only
│   │   ├── venus-editor-primitive-api.md
│   │   └── venus-lib-api.md
│   └── engine-headless-runtime/
│       ├── README.md                                  # create when split docs are justified
│       ├── source-tree.md                             # source ownership tree and import rules
│       ├── profile-manifest.md                        # profile schema and validation rules
│       ├── capability-gating.md                       # API gating and warning/strict policy
│       ├── adapter-conformance.md                     # adapter protocol test matrix
│       ├── scenario-profiles.md                       # vector/headless/GIS/video/etc profile plan
│       └── migration-ledger.md                        # optional split-out task ledger when this file grows
└── operations/
    ├── engine-vnext-post-cutover-hardening-2026-05-20.md
    └── engine-headless-modular-runtime-execution-2026-05-20.md # create only when execution slices start
```

Current action: keep this new management file as the single active document until it becomes too large. Do not create empty subdocuments.

## 3. Target Source Structure Tree

This is the target internal source tree for `packages/engine`. It is a planning tree, not permission to create empty folders.

```txt
packages/engine/src/
├── api/
│   ├── createEngine.ts
│   ├── createEngineCompat.ts                         # AI-TEMP migration surface until app bridge exits
│   ├── public-types.ts
│   ├── runtime-api.ts                                # future capability-aware runtime facade contract
│   └── capability-api.ts                             # future capability-gated public API helpers
├── core/
│   ├── module/
│   │   ├── module-contracts.ts                       # EngineCoreModule, capability ids, dependency ids
│   │   ├── module-registry.ts                        # deterministic registry/validation
│   │   └── module-diagnostics.ts                     # missing/disabled module diagnostics
│   ├── document/
│   ├── compiler/
│   ├── world/
│   ├── scene-runtime/
│   ├── view/
│   ├── spatial/
│   ├── visibility/
│   ├── picking/
│   ├── interaction/
│   ├── extraction/
│   ├── composition/
│   ├── render-planning/
│   ├── scheduler/
│   ├── resources/
│   ├── streaming/
│   └── observability/
├── protocol/
│   ├── runtime/
│   │   ├── runtime-port.ts                           # clock/frame/worker/timer contracts
│   │   └── runtime-host.ts                           # host lifecycle boundary
│   ├── surface/
│   │   ├── surface-port.ts                           # headless/canvas/offscreen/swapchain abstraction
│   │   └── viewport-port.ts
│   ├── backend/
│   │   ├── backend-port.ts                           # backend execution contract
│   │   ├── backend-selection.ts                      # WebGPU/WebGL/Canvas2D/Headless priority contract
│   │   └── backend-capabilities.ts
│   ├── input/
│   ├── resource/
│   ├── text/
│   ├── diagnostics/
│   └── replay/
├── adapters/
│   ├── browser/
│   │   ├── browser-runtime-adapter.ts
│   │   ├── browser-surface-adapter.ts
│   │   └── browser-input-adapter.ts
│   ├── node/
│   │   ├── node-runtime-adapter.ts
│   │   └── node-headless-surface-adapter.ts
│   ├── electron/
│   │   ├── electron-runtime-adapter.ts
│   │   └── electron-bridge-adapter.ts
│   ├── backend/
│   │   ├── webgpu-adapter.ts
│   │   ├── webgl-adapter.ts
│   │   ├── canvas2d-adapter.ts
│   │   └── headless-adapter.ts
│   └── testing/
│       ├── deterministic-runtime-adapter.ts
│       ├── mock-surface-adapter.ts
│       └── fake-backend-adapter.ts
├── profiles/
│   ├── profile-contracts.ts                          # manifest and assembly contracts
│   ├── profile-validator.ts                          # dependency/capability/strict-mode checks
│   ├── base/
│   │   └── base-runtime-profile.ts                   # minimum deterministic runtime profile
│   ├── headless/
│   │   └── headless-runtime-profile.ts
│   ├── browser/
│   │   └── browser-runtime-profile.ts
│   ├── electron/
│   │   └── electron-runtime-profile.ts
│   ├── vector-editor/
│   │   └── vector-editor-profile.ts
│   └── scenario/
│       ├── dense-vector-profile.ts
│       ├── gis-tile-profile.ts
│       ├── volume-profile.ts
│       ├── video-composition-profile.ts
│       └── replay-profile.ts
├── runtime/
│   ├── base-runtime.ts                               # profile-assembled runtime shell
│   ├── runtime-builder.ts                            # module/profile composition executor
│   ├── runtime-capabilities.ts                       # active capability map
│   ├── runtime-warnings.ts                           # dev warnings + strict failures
│   └── runtime-diagnostics.ts
├── backend/                                          # current canonical backend files; migrate behind protocol later
├── document/                                         # current staged modules; migrate into core/document later
├── compiler/                                         # current staged modules; migrate into core/compiler later
├── ecs/                                              # current staged modules; migrate into core/world later
├── spatial/                                          # current staged modules; migrate into core/spatial later
├── picking/                                          # current staged modules; migrate into core/picking later
├── render-runtime/                                  # current staged modules; split into core/runtime/composition later
├── render-planning/                                 # current staged modules; migrate into core/render-planning later
├── render-execution/                                # current staged modules; migrate into core/extraction/execution later
├── scheduler/                                       # current staged modules; migrate into core/scheduler later
├── view/                                            # current staged modules; migrate into core/view later
├── interaction/                                     # current compat-owned helpers; migrate or retire per capability ownership
├── animation/                                       # current compat helper; migrate into core module or scenario module
├── testing/
│   ├── module-conformance/
│   ├── protocol-conformance/
│   ├── adapter-conformance/
│   ├── profile-conformance/
│   ├── scenario-regression/
│   └── legacy-parity/
└── index.ts
```

Migration rule: existing folders remain valid until their contents are moved behind the new boundaries. Do not move a folder just to match this tree; move only when the target contract and tests exist.

## 4. Architecture Principles

### 4.1 Headless Core Is The Default Assumption

Core modules must run without DOM, Canvas, WebGL, WebGPU, Electron, Node-only APIs, or browser globals.

Allowed in core:

- deterministic data transforms
- document/runtime/render state contracts
- pure scheduling decisions
- extraction/planning outputs
- diagnostics snapshots
- typed capability requirements

Forbidden in core:

- `window`, `document`, `navigator`, `HTMLElement`
- direct `CanvasRenderingContext2D`, `WebGLRenderingContext`, `GPUDevice` usage
- Node `fs`, Electron IPC, browser event objects
- app product policy

### 4.2 Protocol Owns Boundaries

`protocol/` defines the contracts that core modules consume and adapters implement.

Protocol contracts must be stable, narrow, and scenario-agnostic. They should describe required capabilities, not concrete hosts.

### 4.3 Adapters Implement Protocols Only

`adapters/` may know about browser, Node.js, Electron, WebGPU, WebGL, Canvas2D, test doubles, or future host features.

Adapters must not own engine policy. They report capabilities and execute protocol calls.

### 4.4 Profiles Assemble Modules

Profiles are manifests that combine core modules, protocol requirements, adapter defaults, backend priority, and scenario policy into a runtime.

A profile may choose modules. A module must not silently import another module's internal state.

### 4.5 Base Runtime Is Profile Output

`runtime/base-runtime.ts` is the assembled runtime shell created from a validated profile. It is not a dumping ground for all engine behavior.

Runtime owns:

- active module registry
- active capability map
- lifecycle
- frame orchestration
- diagnostics aggregation
- warning/strict handling

Runtime must not own persistent document internals, backend-specific command encoding, or app policy.

## 5. Module Contract Model

Each core module must eventually declare:

```txt
Module id
Provided capabilities
Required capabilities
Optional capabilities
Initialization input
Runtime state ownership
Frame/update hooks
Diagnostics output
Public API extension points
Test conformance suite
```

Minimum module contract categories:

| Category        | Examples                                                             |
| --------------- | -------------------------------------------------------------------- |
| Document        | document graph, transaction, revision, changeset                     |
| Compiler        | incremental compile, invalidation categories, deterministic output   |
| World           | runtime ECS/world snapshot, component storage, dirty propagation     |
| View            | viewport state, camera state, projection, pan/zoom controls          |
| Spatial         | 2D/3D bounds, R-tree/BVH/quadtree-ready query contracts              |
| Visibility      | visible set, overscan, LOD, viewport candidates                      |
| Picking         | broad phase, narrow phase, priority, hit stack, GPU optional picking |
| Interaction     | normalized input, gesture/tool dispatch, command buffer output       |
| Extraction      | runtime world to render packets/render world                         |
| Composition     | layer graph, hover/selection/overlay/document surfaces               |
| Render Planning | frame plan, tile schedule, ROI, progressive refinement               |
| Scheduler       | phases, budgets, pressure contraction, latency priority              |
| Resources       | handles, residency, upload scheduling, cache policy                  |
| Streaming       | tile/resource stream priority and lifecycle                          |
| Observability   | traces, counters, replay, frame capture, diagnostics                 |

## 6. Capability-Gated API Policy

Some APIs must only be available when the profile includes the owning module.

Required policy:

1. Type-level gating first where TypeScript can express it.
2. Runtime strict mode throws on missing required capability.
3. Runtime dev mode warns once per missing capability and returns a safe declared fallback only when the API contract allows fallback.
4. Runtime production mode must be deterministic: either strict failure or documented fallback, never noisy repeated warnings.

Examples:

| API Family                           | Required Capability                                               | Missing Capability Behavior                                               |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `loadScene` / `applyScenePatchBatch` | `document`, `compiler`, `world`                                   | strict throw; dev warning only if compat mode supplies fallback           |
| `queryVisibleSet`                    | `visibility`, `spatial`, `view`                                   | strict throw; dev warning + empty set only for compatibility facade       |
| `hitTest` / `hitTestAll`             | `picking`, `spatial`, `view`                                      | strict throw; dev warning + miss result only for compatibility facade     |
| `setOverlayNodes` / hover layer APIs | `composition`                                                     | strict throw; dev warning + no-op only for compatibility facade           |
| `renderFrame`                        | `scheduler`, `extraction`, `render-planning`, one backend adapter | strict throw unless headless profile explicitly uses no-presentation mode |
| `captureFrame`                       | `scheduler`, `observability`                                      | strict throw or deterministic stats-only snapshot in headless profile     |

Compatibility exception: `createEngineCompat` may temporarily provide warn/no-op behavior to preserve existing app callability, but each fallback must have an `AI-TEMP` removal condition.

## 7. Profile Model

Profile manifest fields:

```txt
profile id
runtime target: headless | browser | electron | node | test | scenario
strictness: strict | dev | compat
modules
required capabilities
optional capabilities
adapter requirements
backend priority
scenario policy
diagnostics policy
compatibility shims
validation gates
```

Mandatory profiles:

| Profile                 | Purpose                                    | Initial Module Set                                                                                        |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Base Runtime            | smallest deterministic runtime shell       | scheduler, observability, capability registry                                                             |
| Headless Runtime        | Node/test/replay without presentation      | document, compiler, world, spatial optional, scheduler, observability                                     |
| Browser Runtime         | browser host with presentation             | base + view + extraction + composition + backend adapters                                                 |
| Electron Runtime        | browser renderer plus IPC-aware host hooks | browser profile + electron adapter protocols                                                              |
| Vector Editor           | current app parity profile                 | document, view, spatial, visibility, picking, interaction, composition, render planning, backend priority |
| Replay                  | deterministic regression profile           | document, compiler, scheduler, observability, replay protocol                                             |
| Dense Vector Scenario   | stress profile for large 2D vector scenes  | vector editor + tile/visibility policy                                                                    |
| Future GIS/Volume/Video | scenario placeholders in docs only         | create only when real module contracts exist                                                              |

Profile constraints:

- Profiles compose modules; they do not implement module internals.
- Profiles may set policy defaults; they must not directly call adapter-specific APIs.
- Profiles must validate dependencies before runtime starts.
- Profile order must be deterministic.

## 8. Backend And Adapter Policy

Backend auto priority is fixed unless caller explicitly pins a backend:

```txt
webgpu -> webgl -> canvas2d -> headless
```

Meaning:

- `webgpu`: first presentation target when host reports usable WebGPU.
- `webgl`: primary compatibility GPU backend when WebGPU is unavailable.
- `canvas2d`: fallback presentation backend and auxiliary/offscreen/composition support.
- `headless`: deterministic no-presentation runtime for Node.js, replay, tests, server workflows, and unsupported hosts.

Backend selection must be observable through diagnostics:

```txt
requested backend
resolved backend
capability probe results
fallback reason
native eligibility
presentation mode
```

Headless must not mean broken. It means no platform presentation dependency.

## 9. Current Capability Inventory

Current canonical source already contains partial capability slices:

| Existing Area                     | Current Path                                    | Target Ownership                                                        |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Public vNext shell                | `api/createEngine.ts`, `api/public-types.ts`    | `api` + `runtime` + `protocol`                                          |
| Compatibility bridge              | `api/createEngineCompat.ts`, compat types/state | temporary `api` until app exits compat surface                          |
| Backend resolver                  | `backend/backend.ts`                            | `protocol/backend` + `adapters/backend`                                 |
| Canvas2D backend                  | `backend/canvas2dBackend.ts`                    | `adapters/backend/canvas2d-adapter.ts`                                  |
| No-op backend                     | `backend/noopBackend.ts`                        | `adapters/backend/headless-adapter.ts`                                  |
| Document store                    | `document/*`                                    | `core/document`                                                         |
| Incremental compiler              | `compiler/incrementalCompiler.ts`               | `core/compiler`                                                         |
| Runtime world                     | `ecs/runtimeWorld.ts`                           | `core/world`                                                            |
| Spatial query                     | `spatial/spatialIndex.ts`                       | `core/spatial`                                                          |
| Picking pipeline                  | `picking/pickingPipeline.ts`                    | `core/picking`                                                          |
| Frame planning                    | `render-planning/createEngineFrameResolver.ts`  | `core/render-planning`                                                  |
| Staged execution                  | `render-execution/stagedExecutionChain.ts`      | `core/extraction` + execution bridge                                    |
| Runtime facade/frame controller   | `render-runtime/*`                              | `runtime` + `core/scheduler` + `core/composition`                       |
| Frame budget broker               | `scheduler/frameBudgetBroker.ts`                | `core/scheduler`                                                        |
| Viewport facade                   | `view/viewportFacade.ts`                        | `core/view`                                                             |
| Interaction compatibility helpers | `interaction/*`                                 | split across `core/interaction`, `core/picking`, `core/view`, or retire |
| Animation helper                  | `animation/engineAnimationController.ts`        | `core/animation` or scenario module                                     |

Ownership-map note:

- This table is the active current-to-target source ownership map for H0.3.
- Update rows in the same change whenever module ownership or target destination changes.

## 10. Migration Phase Plan

### H0: Management And Boundary Baseline

Status: Completed

Tasks:

- [x] Create active post-cutover management document.
- [x] Update stale structure docs that still describe `_vnext` as current staging state.
- [x] Add import-boundary guard design for core/protocol/adapters/profiles.
- [x] Add source tree ownership map for current-to-target migration.
- [x] Update stale repo memory about backend priority.

Acceptance:

- One current management document explains the active route.
- Old vNext documents are marked historical where needed, not silently treated as current.

### H1: Protocol Contract Foundation

Status: Completed

Tasks:

- [x] Define module contract types in `packages/engine/src/core/module/module-contracts.ts`.
- [x] Define capability id and module dependency contracts in `packages/engine/src/core/module/module-contracts.ts`.
- [x] Define runtime, surface, backend, diagnostics, replay, input, text, and resource protocol contracts.
- [x] Add conformance tests for module registry and deterministic validation in `packages/engine/src/testing/headlessModularRuntime.contract.test.ts`.
- [x] Move backend selection contract behind protocol while preserving public behavior.

Acceptance:

- Core modules can depend on protocol contracts without importing concrete adapters.
- Backend priority remains tested and observable.

### H2: Profile Manifest And Runtime Builder

Status: Completed

Tasks:

- [x] Define profile manifest contract in `packages/engine/src/profiles/profile-contracts.ts`.
- [x] Implement profile validator for missing capabilities, duplicate modules, backend metadata warnings, and strict/dev/compat missing-capability modes in `packages/engine/src/profiles/profile-validator.ts`.
- [x] Implement runtime builder that assembles base runtime from validated modules in `packages/engine/src/runtime/runtime-builder.ts`.
- [x] Add base, headless, browser, and vector-editor profile manifests under `packages/engine/src/profiles`.
- [x] Add profile conformance tests in `packages/engine/src/testing/headlessModularRuntime.contract.test.ts`.

Acceptance:

- `createEngine` can be routed through a profile without changing app-visible behavior.
- Missing module behavior is deterministic and tested.

Closeout evidence (2026-05-21):

- Profile/runtime parity remains covered by `packages/engine/src/testing/headlessModularRuntime.contract.test.ts` and `packages/engine/src/testing/createEngine.orchestration.test.ts`.
- Gate snapshot for closeout includes engine tests + typecheck + lint + build + CR check.

### H3: Core Module Relocation Without Behavior Rewrite

Status: Completed

Tasks:

- [x] Move document store behind core document module contract via `packages/engine/src/core/document/document-module-contracts.ts` and `packages/engine/src/core/document/document-store-module.ts`, and route `createEngine` through the module factory.
- [x] Move compiler behind core compiler module contract via `packages/engine/src/core/compiler/compiler-module-contracts.ts` and `packages/engine/src/core/compiler/incremental-compiler-module.ts`, and route `createEngine` compile calls through the module.
- [x] Move runtime world behind core world module contract via `packages/engine/src/core/world/world-module-contracts.ts` and `packages/engine/src/core/world/runtime-world-module.ts`, and route staged execution world projection through the module.
- [x] Move viewport facade behind core view module contract via `packages/engine/src/core/view/view-module-contracts.ts` and `packages/engine/src/core/view/viewport-module.ts`, and route `createEngine` viewport facade creation through the module.
- [x] Move scheduler/frame budget broker behind core scheduler contract via `packages/engine/src/core/scheduler/scheduler-module-contracts.ts` and `packages/engine/src/core/scheduler/frame-budget-module.ts`, and route runtime frame-controller budget resolution through the module.
- [x] Add import-boundary tests for each moved module in `packages/engine/src/testing/coreModuleBoundary.contract.test.mjs`.

Acceptance:

- Behavior remains green while ownership becomes explicit.
- Moved modules do not import adapters or platform APIs.

### H4: Backend Adapter Separation

Status: Completed

Tasks:

- [x] Split backend selector contract from backend implementations by extracting selector probe registry/priority logic into `packages/engine/src/backend/backendSelector.ts` and keeping `packages/engine/src/backend/backend.ts` focused on runtime backend contract.
- [x] Move Canvas2D backend into adapter ownership by migrating implementation to `packages/engine/src/adapters/backend/canvas2dBackendAdapter.ts` and routing registry creation through adapter module.
- [x] Move noop backend into headless adapter ownership by migrating implementation to `packages/engine/src/adapters/backend/noopBackendAdapter.ts` and removing legacy backend-owned noop file.
- [x] Add WebGPU/WebGL adapter stubs with capability probes and conformance tests in `packages/engine/src/adapters/backend/webgpuBackendAdapter.ts`, `packages/engine/src/adapters/backend/webglBackendAdapter.ts`, and `packages/engine/src/testing/webAdapter.conformance.test.ts`.
- [x] Add fake backend adapter for deterministic tests by introducing backend adapter registry injection and fake-adapter conformance coverage in `packages/engine/src/testing/backendAdapterRegistry.contract.test.ts`.

Acceptance:

- Core/runtime selects backends through protocol and adapter registry.
- Auto priority stays `webgpu -> webgl -> canvas2d -> headless`.

Closeout evidence (2026-05-21):

- Backend adapter parity remains covered by `packages/engine/src/testing/backendSelector.contract.test.ts`, `packages/engine/src/testing/backendAdapterRegistry.contract.test.ts`, and `packages/engine/src/testing/webAdapter.conformance.test.ts`.
- Backend priority and selector behavior remain covered by canonical/protocol parity tests in `packages/engine/src/testing/backendSelectionProtocol.contract.test.ts`.

### H5: Compatibility Bridge Retirement Track

Status: Completed

Tasks:

- [x] Convert `createEngineCompat` from fallback-heavy adapter to profile-backed compatibility facade.
- [x] Move no-op fallbacks into capability-gated compat policy.
- [x] Remove explicit legacy render backend opt-in after hover/composition parity is available through modules by retiring runtime `@venus/engine-legacy` import and delegation path in `packages/engine/src/api/createEngineCompat.ts`.
- [x] Remove `@venus/engine-legacy` dependency from `packages/engine/package.json` after canonical runtime/tests no longer import legacy package or legacy source paths.
- [x] Update legacy boundary tests from inventory tracking to zero-reference enforcement by locking runtime import inventory to an empty set in `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs`.

Acceptance:

- App bridge uses public/profile-backed engine runtime rather than legacy-compatible local shims.
- Legacy dependency is test-only or removed.

### H6: Composition And Scene Profile Parity

Status: Completed

Tasks:

- [x] Define composition module contract for document, hover, selection, guide, overlay, debug, and presentation layers in `packages/engine/src/core/composition/composition-contracts.ts`.
- [x] Implement vector-editor profile composition stack diagnostics in compatibility runtime (`packages/engine/src/api/createEngineCompat.ts`) and expose it through `getDiagnostics().composition`.
- [x] Introduce explicit composition planes (`base`, `active`, `overlay`) and wire active-node state (`setInteractionActiveNodeIds`) into compatibility composition diagnostics and draw path.
- [x] Port hover composition semantics out of legacy fallback by resolving local compat hit-test hover state and wiring hover diagnostics in `packages/engine/src/api/createEngineCompat.ts`.
- [x] Add scenario tests for hover layer, offset/DPR, low-scale zoom, dense scene, and overlay invalidation in `packages/engine/src/testing/createEngineCompat.adapter.test.ts`.

Acceptance:

- Hover/selection/overlay no longer depend on legacy fallback.
- Rendering parity failures are profile/module bugs, not compatibility bridge behavior.

Closeout evidence (2026-05-21):

- Composition parity behavior remains covered by `packages/engine/src/testing/createEngineCompat.adapter.test.ts`.
- Compatibility-only shim branches are now explicitly tagged with `AI-TEMP` markers and guarded by `packages/engine/src/testing/createEngineCompatShimBoundary.contract.test.mjs`.

### H7: Scenario Profiles And Replay

Status: Completed

Tasks:

- [x] Define scenario profile manifest extension in `packages/engine/src/profiles/profile-contracts.ts` (replay payload + diagnostics snapshot contracts).
- [x] Create vector dense scene scenario profile in `packages/engine/src/profiles/scenario/vector-dense-scene-profile.ts`.
- [x] Create headless replay profile in `packages/engine/src/profiles/scenario/headless-replay-profile.ts`.
- [x] Add recorded input/document/viewport replay tests in `packages/engine/src/testing/scenarioProfiles.replay.test.ts`.
- [x] Add diagnostics snapshots for module activation and backend selection in scenario manifests and validate them in `packages/engine/src/testing/scenarioProfiles.replay.test.ts`.

Acceptance:

- Engine regressions can be reproduced without app private state.
- Scenario profiles document which modules they require.

### H8: Future Package Split Readiness

Status: Completed

Tasks:

- [x] Measure stability of protocol contracts.
- [x] Verify internal import graph has no adapter/core cycles.
- [x] Identify modules that can become future packages.
- [x] Update `repo-refactor-management.md` with package split cutover plan only after internal boundaries are stable.

Acceptance:

- Package split is mechanical, not architectural discovery.

Candidate split inventory (H8.3):

- Renderer candidates: `adapters/backend/webgpuBackendAdapter.ts`, `adapters/backend/webglBackendAdapter.ts`, `adapters/backend/canvas2dBackendAdapter.ts`, and shared backend protocol contracts under `protocol/backend/*`.
- Platform candidates: browser/node runtime and surface adapters under `adapters/browser/*` and future `adapters/node/*` once they stop importing staged runtime helpers.
- Runtime candidate: `runtime/*` plus profile validator/manifest surfaces once protocol dependencies are narrowed to stable contracts.
- Not-ready set: none in protocol legacy-coupling dimension; decoupling gate is green.

## 11. Validation Matrix

| Gate                | Command / Check                           | Required When                               |
| ------------------- | ----------------------------------------- | ------------------------------------------- |
| Engine tests        | `pnpm --filter @venus/engine test`        | every engine task                           |
| Typecheck           | `pnpm typecheck`                          | every public contract/profile/protocol task |
| Lint                | `pnpm lint`                               | every source change                         |
| Build               | `pnpm build`                              | every runtime or app-facing change          |
| Change request      | `pnpm --filter @venus/engine cr:check`    | every engine code task with CR blocks       |
| Debug guard         | `pnpm --filter @venus/engine debug:guard` | compatibility/debug setting changes         |
| Import boundary     | future boundary guard                     | every core/protocol/adapter/profile move    |
| Profile conformance | future profile tests                      | every profile change                        |
| Adapter conformance | future adapter tests                      | every adapter change                        |
| Scenario replay     | future replay tests                       | every scenario/runtime behavior change      |

### 11.1 Import-Boundary Guard Design (H0.4)

Guard intent:

- Keep ownership boundaries enforceable while folders migrate gradually.
- Fail fast when new imports violate target architecture DAG.

Allowed edges:

- `api` -> `runtime`, `profiles`, `core`, `protocol`, `backend`, `document`, `compiler`, `view`, `scheduler`, `render-*`, `interaction`.
- `runtime` -> `core`, `protocol`, `profiles`.
- `profiles` -> `core`, `protocol`.
- `core` -> `protocol` only; `core` must not import `adapters`.
- `adapters` -> `protocol` and adapter-local implementation files.
- `protocol` -> contract-only dependencies (no adapter/runtime policy).

Disallowed edges:

- `core` -> `adapters`.
- `protocol` -> `adapters`.
- `profiles` -> `adapters`.
- reverse imports from legacy staged folders into `core` module internals.

Execution plan:

- Keep `packages/engine/src/testing/coreModuleBoundary.contract.test.mjs` as active baseline guard.
- Add a dedicated boundary inventory test under `packages/engine/src/testing` that scans import specifiers and enforces the allowed/disallowed edges above.
- Wire this test into `pnpm --filter @venus/engine test` so boundary regressions fail in the default engine gate.

### 11.2 H8.1 Stability Snapshot (2026-05-21)

Measured indicators:

- Protocol contract file count: 11 files under `packages/engine/src/protocol`.
- Protocol legacy-coupling dependencies: zero imports from `view/*`, `document/*`, and `render-runtime/*`.
- Core/adapters cycle-risk signal: no import path from `core/*` to `adapters/*` and no import path from `adapters/*` to `core/*`, validated by `packages/engine/src/testing/importGraphBoundary.contract.test.mjs`.

Stability interpretation:

- Boundary isolation between `core` and `adapters` is green for direct and transitive import paths.
- Protocol contracts are decoupled from legacy staged `view/document/render-runtime` contracts and now meet H8 coupling-gate criteria for split-readiness planning.

## 12. Development Rules

1. Do not create empty future folders.
2. Do not split packages during H0-H7.
3. Do not move current modules until their target protocol/profile contract and tests exist.
4. Do not let core import adapters.
5. Do not let adapters own policy.
6. Do not let profiles implement module internals.
7. Do not add optional API behavior without capability gating.
8. Do not leave compat fallbacks without `AI-TEMP` removal criteria.
9. Do not demote WebGPU/WebGL priority to Canvas2D for convenience.
10. Do not treat headless as a no-op-only mode; it is a real deterministic runtime target.

## 13. Immediate Execution Queue

1. Governance maintenance: keep phase evidence and CR inventory synchronized when new conformance tests are added.
2. Split-readiness verification: re-run H8 stability metrics before every renderer/platform extraction slice.
3. Governance cadence: refresh open-decision ledger only when new unresolved decisions are introduced.
4. Closure checkpoint: if section 15 criteria stays green in the next review window, archive this file to historical authority and open a new cycle document only when scope changes.
5. Maintenance gates: run `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm --filter @venus/engine cr:check` for each extraction-slice handoff.
6. Batch governance replay: use `ai/operations/engine-headless-modular-runtime-maintenance-batch-2026-05-21-100-tasks.md` as the numbered maintenance execution reference.

## 14. Open Decisions

Archive note:

- Open-decision snapshot and assigned execution ledger are archived in `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`.

- Resolved (2026-05-21): capability-gated public APIs use one runtime handle with typed feature accessors (`ai/refactor-vnext/adr-capability-gated-api-shape-2026-05-21.md`).
- Resolved (2026-05-21): browser/electron/node adapters remain internal until extraction contracts are stable (`ai/refactor-vnext/adr-platform-adapter-exposure-policy-2026-05-21.md`).
- Resolved (2026-05-21): WebGPU/WebGL ownership uses adapter-only execution and engine-owned policy (`ai/refactor-vnext/adr-webgpu-webgl-ownership-model-2026-05-21.md`).
- Resolved (2026-05-21): vector-editor scenario profile ownership is phased (engine during stabilization, app-level after split readiness) (`ai/refactor-vnext/adr-vector-editor-scenario-profile-ownership-2026-05-21.md`).
- Resolved (2026-05-21): `createEngineCompat` end-state is thin translation/diagnostics facade with explicit shim retirement trigger (`ai/refactor-vnext/adr-createenginecompat-end-state-boundary-2026-05-21.md`).
- New-decision handling: append unresolved items to `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md` with a new dated execution block; do not rewrite completed entries.

## 15. Definition Of Done For This Architecture Track

This track is complete when:

- Core modules are platform-free and import-boundary tested.
- Protocol contracts isolate runtime, surface, backend, resource, text, input, diagnostics, and replay boundaries.
- Adapters implement protocols without owning policy.
- Profiles assemble modules into base/headless/browser/electron/vector runtimes.
- Missing module APIs are type-gated where possible and strict/dev behavior is tested.
- Backend priority is fixed and observed by tests.
- `createEngineCompat` no longer owns hidden runtime behavior.
- Legacy engine dependency is removed or test-only with a documented removal path.
- Package splitting can be decided mechanically from stable internal boundaries.

## 16. Closeout Snapshot (2026-05-21)

- Track state: H0-H8 and all residual architecture decisions are complete.
- Decision artifacts: five accepted ADRs under `ai/refactor-vnext/adr-*-2026-05-21.md` define API shape, adapter exposure, backend ownership, vector profile ownership, and compat end-state boundaries.
- Boundary evidence: protocol contracts are decoupled from legacy staged view/document/render-runtime imports, and transitive core/adapters boundaries are guarded by import-graph tests.
- Governance state: immediate queue is now maintenance-only; open-decision ledger is executed snapshot mode.
- Validation baseline at closeout: engine tests pass, typecheck/lint/build pass, CR checks pass, and git diff whitespace checks pass.

## 17. Numbered Maintenance Batch Reference

- 2026-05-21 execution bundle: `ai/operations/engine-headless-modular-runtime-maintenance-batch-2026-05-21-100-tasks.md`.
- Usage rule: append new dated maintenance bundle files instead of mutating historical numbered ledgers.
