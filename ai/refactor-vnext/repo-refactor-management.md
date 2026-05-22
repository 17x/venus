# Venus Repo-Level Refactor Management

Status: Active governance baseline (post-H8 maintenance)
Date: 2026-05-21
Source: `ai/refactor.md`
Scope: Monorepo topology, package boundaries, dependency direction, workspace staging, app/package migration, governance gates.
Non-scope: Engine internal execution architecture. Manage that in `ai/refactor-vnext/engine-refactor-management.md`.

## 1. Positioning

This document manages the repo-level refactor. The target is to move Venus from a canvas-editor-shaped monorepo toward a cross-platform graphics runtime monorepo.

The repo-level goal is not to implement renderer internals. It is to create package boundaries that let renderer, runtime, platform, plugin, app, and editor layers evolve without circular dependency or product coupling.

Core dependency direction:

```txt
lib
↑
runtime
↑
engine
↑
editor-primitive
↑
plugins
↑
apps
```

Current mandatory governance still applies until this repo-level DAG is implemented:

```txt
app -> editor-primitive
app -> engine
app -> lib
editor-primitive -> lib
engine -> lib
```

Any temporary deviation must be captured in a CHANGE REQUEST and removed before cutover.

## 2. Destructive Refactor Strategy

This is a large destructive refactor. Use a vNext staging model instead of mutating every production package in place.

Recommended staging roots:

```txt
packages/_vnext/
apps/_vnext/
ai/refactor-vnext/
```

Why this shape:

- `pnpm-workspace.yaml` currently includes only `packages/*`, `apps/*`, and `docs/*`.
- Nested packages under `packages/_vnext/*` or `apps/_vnext/*` are not automatically workspace packages unless explicitly added.
- This allows building the new version beside the current version without breaking the current app on every intermediate commit.

Cutover rule:

1. Build and validate the vNext tree in staging.
2. Add explicit workspace entries only when a vNext package is ready for typecheck/test integration.
3. Freeze old package writes during cutover.
4. Rename old package/app folders to an archive location outside the active workspace.
5. Rename vNext folders back to canonical names.
6. Run full governance, typecheck, lint, test, and app build gates.
7. Delete archive folders only after parity and rollback windows close.

Do not create `v2`, `new`, or `temp` package names in the final tree. Those names are allowed only inside `_vnext` staging roots and must disappear before cutover.

Readiness note (2026-05-21):

- Engine internal H8 stability snapshot confirms no core/adapters import-cycle paths in current graph checks.
- Protocol contracts are decoupled from legacy staged view/document/render-runtime type imports.

Engine split cutover plan (enabled 2026-05-21):

1. Freeze protocol contracts for one stabilization window with mandatory conformance gates.
2. Extract backend adapters into renderer package staging targets while keeping selector policy in engine.
3. Extract browser/node host adapters into platform package staging targets behind protocol contracts.
4. Keep runtime/profile policy in `@venus/engine` until adapter package contracts stop changing.
5. Cut over staged renderer/platform packages into canonical names only after parity gates pass for tests, typecheck, lint, and CR checks.
6. Update repo DAG enforcement to include renderer/platform packages and block reverse imports before final rename-back.

Platform adapter exposure policy (accepted 2026-05-21):

- Browser/electron/node adapter implementations remain internal to `@venus/engine` during pre-cutover stabilization.
- Do not publish platform adapter implementation symbols from engine public exports before `platform-*` extraction packages pass parity gates.
- Re-evaluate public exposure only after extraction contract stability is proven in cutover windows.

WebGPU/WebGL ownership model (accepted 2026-05-21):

- WebGPU/WebGL execution ownership remains adapter-only during stabilization and extraction.
- Engine/runtime layers keep policy/orchestration only (selector policy, diagnostics normalization, frame planning contracts).
- Do not add backend-execution branches into engine core/runtime modules during renderer extraction.

Vector-editor scenario profile ownership (accepted 2026-05-21):

- Keep vector-editor scenario profile in engine during stabilization for parity continuity.
- Move ownership to app-level profile packages after split-readiness gates are stable and app profile contracts exist.

Decision synchronization note (2026-05-21):

- Engine track closeout and maintenance queue authority: `ai/refactor-vnext/engine-headless-modular-runtime-management.md`.
- Open-decision execution snapshot authority: `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`.

## 3. Target Package Topology

Long-term topology from `refactor.md`:

```txt
packages/
├── lib
├── runtime
├── engine
├── editor-primitive
├── renderer-canvas2d
├── renderer-webgl
├── renderer-webgpu
├── platform-browser
├── platform-electron
├── platform-node
├── plugin-text
├── plugin-history
├── plugin-animation
├── plugin-video
├── plugin-collab
├── plugin-export
├── plugin-medical
├── plugin-gis
├── plugin-cad
├── plugin-bim
├── plugin-timeline
├── app-vector
├── app-video
├── app-medical
├── app-gis
└── app-editor-shell
```

Recommended first landing topology:

```txt
packages/
├── lib
├── runtime
├── engine
├── editor-primitive
├── renderer-canvas2d
├── renderer-webgl
├── renderer-webgpu
├── platform-browser
└── platform-node
```

Defer domain plugins until the runtime/package contracts are stable. Do not add medical/GIS/CAD/video plugin packages as empty placeholders.

## 4. Package Responsibilities

### `@venus/lib`

Pure foundation only.

Owns:

- math, vector, matrix, geometry primitives
- event emitter, assertions, profiling helpers
- memory pools, typed arrays, bitsets, id allocators
- immutable helpers and deterministic utility contracts

Forbidden:

- DOM, GPU, renderer, window, document, React, app policy

### `@venus/runtime`

Platform abstraction and runtime host contracts.

Owns:

- frame scheduling
- worker abstraction
- clock and performance timing
- storage, clipboard, filesystem, network contracts
- pointer, keyboard, IME, cursor contracts
- canvas/platform host factories

Forbidden:

- engine internals
- renderer packet execution
- app/editor product state

### `@venus/engine`

Graphics runtime kernel.

Owns:

- document/runtime/render execution model
- scene/runtime state
- visibility, spatial, picking, extraction
- scheduler, streaming, diagnostics, GPU/resource runtime
- backend-independent public engine API

Forbidden:

- React/Vue/DOM direct usage
- app state, toolbar/menu/panel policy
- editor-primitive private imports

### Renderer Packages

Renderer packages are backend implementations, not product engines.

Own:

- Canvas2D/WebGL/WebGPU command execution
- backend capabilities
- backend resource adapters
- backend diagnostics

Forbidden:

- document state ownership
- app/editor interaction logic
- product scenario branches

### Platform Packages

Platform packages adapt runtime contracts to browser/node/electron.

Own:

- browser canvas and event source adapters
- node/headless surfaces
- worker, filesystem, clipboard, storage bridges

Forbidden:

- engine render policy
- editor tool behavior

### `@venus/editor-primitive`

Reusable editor interaction primitives, independent of engine internals.

Owns:

- generic editor gestures and controls
- selection/tool abstractions that do not import engine private modules
- adapter contracts consumed by apps

Forbidden:

- direct dependency on `@venus/engine` until governance changes explicitly allow it
- renderer/backend state

### Apps

Apps compose packages and product policy.

Own:

- React/UI shell
- toolbar, panels, menus, settings
- product profiles and app-specific adapters
- package assembly

Forbidden:

- importing engine private modules
- mutating renderer/backend internals

## 5. Phase Plan

### Phase R0: Repo Baseline and Freeze Rules

Tasks:

- [x] Produce package ownership inventory for current `apps/*` and `packages/*`.
- [x] Identify imports that would violate the future DAG.
- [x] Mark modules that must remain stable while vNext is built.
- [x] Define cutover branch policy and rollback location.
- [x] Add an ADR for vNext staging and rename-back cutover.

R0 evidence snapshot:

- Inventory / DAG scan / stable modules / cutover+rollback policy: `ai/operations/repo-baseline-freeze-r0-2026-05-21.md`
- ADR: `ai/refactor-vnext/adr-vnext-staging-and-cutover.md`

Acceptance:

- Current package graph is known.
- All future package moves have an owner and target layer.
- No code package is moved before its target contract exists.

### Phase R1: `@venus/runtime` Extraction

Tasks:

- [x] Define runtime adapter contracts for frame, clock, worker, canvas, input, cursor, storage, clipboard.
- [x] Create `packages/_vnext/runtime` as the staging package.
- [x] Move platform-neutral runtime contracts out of app/engine code only after contract tests exist.
- [x] Add browser/node platform adapter boundaries without pulling engine logic down into runtime.

R1 bootstrap evidence:

- Contract definitions: `packages/_vnext/runtime/src/contracts/runtimeAdapters.ts`
- Staging package: `packages/_vnext/runtime/package.json`, `packages/_vnext/runtime/src/index.ts`
- Change request note: `ai/operations/runtime-r1-adapter-contract-bootstrap-2026-05-21.md`
- Platform boundaries: `packages/_vnext/runtime/src/platform/browserRuntimeAdapters.ts`, `packages/_vnext/runtime/src/platform/nodeRuntimeAdapters.ts`
- Contract tests: `packages/_vnext/runtime/src/platform/runtimePlatformBoundaries.contract.test.ts`
- Validation: `pnpm dlx tsx --test packages/_vnext/runtime/src/platform/runtimePlatformBoundaries.contract.test.ts`（2/2 通过）

Acceptance:

- `runtime` does not import `engine`, app, React, DOM implementation files, or renderer internals.
- Engine can receive runtime adapters through public configuration.

### Phase R2: Renderer Package Split

Tasks:

- [x] Define backend package contract shared by canvas2d/webgl/webgpu.
- [x] Stage `packages/_vnext/renderer-canvas2d`, `renderer-webgl`, and `renderer-webgpu` only when there is real code to move.
- [ ] Move backend execution code out of engine without moving render planning or document/runtime policy.
- [x] Preserve engine facade so apps do not choose backend implementation details directly.

R2 bootstrap evidence:

- Shared contract package: `packages/_vnext/renderer-shared/src/contracts/rendererBackendContract.ts`
- Contract tests: `packages/_vnext/renderer-shared/src/tests/rendererContractConformance.test.ts`
- Change request note: `ai/operations/renderer-r2-shared-backend-contract-bootstrap-2026-05-22.md`
- Validation: `pnpm dlx tsx --test packages/_vnext/renderer-shared/src/tests/rendererContractConformance.test.ts`（2/2 通过）
- Renderer staging packages with real execution code:
  - `packages/_vnext/renderer-canvas2d/src/canvas2dBackendExecution.ts`
  - `packages/_vnext/renderer-webgl/src/webglBackendExecution.ts`
  - `packages/_vnext/renderer-webgpu/src/webgpuBackendExecution.ts`
- Staging contract tests:
  - `packages/_vnext/renderer-canvas2d/src/tests/canvas2dBackendExecution.contract.test.ts`
  - `packages/_vnext/renderer-webgl/src/tests/webglBackendExecution.contract.test.ts`
  - `packages/_vnext/renderer-webgpu/src/tests/webgpuBackendExecution.contract.test.ts`
- Change request note: `ai/operations/renderer-r2-backend-package-staging-2026-05-22.md`
- Validation: three staging tests 3/3 passed + `pnpm --filter @venus/engine cr:check` + `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

R2 task-3 extraction readiness note:

- Extraction slice plan: `ai/operations/renderer-r2-engine-execution-extraction-slice-plan-2026-05-22.md`
- Current blocker: direct engine-to-\_vnext source bridge violates engine tsconfig `rootDir/include` boundary (TS6059/TS6307)
- Baseline after rollback: `webAdapter.conformance` 3/3 pass + engine/vector type gates pass

R2 facade-preservation evidence:

- Validation note: `ai/operations/renderer-r2-facade-preservation-validation-2026-05-22.md`
- Static scan confirms apps consume `@venus/engine` facade imports and do not import renderer staging/backend selector internals.

Acceptance:

- Backend packages execute packets/resources, but do not own document or interaction state.
- Engine chooses backend via stable backend selector.

### Phase R3: Platform Package Split

Tasks:

- [x] Stage `platform-browser` for DOM/browser adapters.
- [x] Stage `platform-node` for headless and test adapters.
- [ ] Keep browser APIs outside engine package after cutover.
- [x] Add platform contract tests for requestFrame, now, canvas creation, worker creation, cursor, clipboard/storage optional adapters.

R3 bootstrap evidence:

- Browser staging package: `packages/_vnext/platform-browser/src/browserPlatformAdapters.ts`
- Node staging package: `packages/_vnext/platform-node/src/nodePlatformAdapters.ts`
- Contract tests:
  - `packages/_vnext/platform-browser/src/tests/browserPlatformAdapters.contract.test.ts`
  - `packages/_vnext/platform-node/src/tests/nodePlatformAdapters.contract.test.ts`
- Change request note: `ai/operations/platform-r3-staging-bootstrap-2026-05-22.md`
- Validation: platform tests 2/2 passed + `pnpm --filter @venus/engine cr:check` + `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
- Browser API boundary status note: `ai/operations/platform-r3-browser-api-boundary-status-2026-05-22.md`
- Blocking globals remain in engine pending extraction: frame scheduler fallbacks and webgpu `navigator` probe.

Acceptance:

- Engine can run in browser/headless mode through adapter injection.
- No direct engine dependency on `window`, `document`, `navigator`, or `HTMLElement`.

### Phase R4: App and Plugin Boundary

Tasks:

- [x] Keep current app stable while package vNext evolves.
- [x] Define plugin lifecycle contract before creating plugin packages.
- [x] Split product-specific features into app or plugin packages only when their runtime boundary is stable.
- [x] Avoid domain plugin placeholders.

R4 stability evidence:

- Build gate: `pnpm --filter @venus/vector-editor-web build`（通过）
- Type gate: `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`（通过）

R4 plugin-lifecycle evidence:

- Staging contract package: `packages/_vnext/plugin-lifecycle/src/pluginLifecycleContract/pluginLifecycleContract.ts`
- Conformance test: `packages/_vnext/plugin-lifecycle/src/pluginLifecycleContract/pluginLifecycleContract.test.ts`
- Change request note: `ai/operations/plugin-r4-lifecycle-contract-bootstrap-2026-05-22.md`
- Validation: `pnpm dlx tsx --test packages/_vnext/plugin-lifecycle/src/pluginLifecycleContract/pluginLifecycleContract.test.ts`（3/3 通过）

R4 boundary-admission and placeholder-guard evidence:

- Admission rules and decision table: `ai/operations/plugin-r4-boundary-admission-and-placeholder-guard-2026-05-22.md`
- Current `_vnext` plugin package inventory: only `plugin-lifecycle`; no domain placeholder plugin packages.

Acceptance:

- Apps own product policy and UI.
- Plugins depend on stable runtime/engine contracts rather than private files.

### Phase R5: Cutover and Rename Back

Tasks:

- [x] Freeze writes to old package folders.
- [ ] Run parity test suite against old and vNext paths.
- [ ] Move old folders to `archive/refactor-cutover-YYYY-MM-DD/` or another non-workspace archive.
- [ ] Rename `packages/_vnext/<name>` to canonical `packages/<name>`.
- [ ] Update workspace entries, package names, exports, tsconfig references, and imports.
- [ ] Run full validation gates.
- [ ] Remove old compatibility shims after the rollback window.

R5 freeze-write evidence:

- Guard script: `scripts/cutover-freeze-guard.mjs`
- Freeze roots config: `ai/refactor-vnext/cutover-freeze-roots.json`
- Repo command: `pnpm governance:cutover-freeze`
- Change request note: `ai/operations/cutover-r5-freeze-write-guard-bootstrap-2026-05-22.md`

Acceptance:

- Canonical tree contains no `_vnext`, `v2`, `new`, or temporary package names.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and governance checks pass.
- Apps boot through canonical packages.

## 6. Repo CHANGE REQUEST Template

```txt
[CHANGE REQUEST]

Target:
- Package / Workspace:

Goal:
- Repo-level boundary problem being solved:

Change Type:
- Add / Move / Rename / Remove

Impact:
- Affected packages/apps:
- Workspace/package manager impact:
- Import path impact:

Cleanup:
- Old folders/imports/shims to remove:
- Rename-back condition:

Tests:
- Typecheck/lint/test/build/governance gates:
```

## 7. Validation Gates

Required for every repo-level move:

```txt
pnpm governance:check
pnpm governance:file-shape
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Use narrower package-level checks during staging, but do not cut over without full gates.

## 8. Risk Register

| Risk                                         | Impact                      | Mitigation                                                                              |
| -------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Workspace picks up half-built vNext packages | Broken install/typecheck    | Keep vNext nested under `_vnext` without package.json at immediate workspace glob level |
| Runtime extracts engine behavior by mistake  | Reverse dependency/coupling | Contract tests and import governance before moves                                       |
| Renderer package owns product policy         | Backend lock-in             | Only move backend execution, not planning or interaction                                |
| Big-bang rename loses rollback path          | Slow recovery               | Archive old folders until parity window closes                                          |
| Plugin packages become placeholders          | Empty architecture noise    | Create plugin package only with real lifecycle and implementation                       |
| Apps import private paths during migration   | Future cutover breakage     | Public facade and app adapter contracts only                                            |

## 9. Immediate Repo Tasks

1. Write ADR for `_vnext` staging and rename-back cutover.
2. Generate current package import graph and classify boundary violations.
3. Define `@venus/runtime` public contract before moving runtime code.
4. Define renderer backend package contract before extracting backend code.
5. Prepare cutover checklist and rollback policy before any folder rename.
