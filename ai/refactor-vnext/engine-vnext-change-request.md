# Engine vNext Change Request

Status: Proposed
Date: 2026-05-19
Scope: First engine vNext task set, covering baseline capture and runtime shell design
Related:

- `ai/draft.md`
- `ai/refactor-vnext/engine-refactor-management.md`
- `ai/refactor-vnext/adr-vnext-staging-and-cutover.md`

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/engine` staging root
  - Future canonical target: `packages/engine`
  - Public facade candidates: `src/api`, `src/index.ts`
  - Runtime shell candidates: `src/runtime`, `src/backend`, `src/testing`

Goal:

- Problem being solved:
  - Build a new engine version without destabilizing current `packages/engine`.
  - Establish a contract-first runtime shell before implementing document/compiler/extraction/render execution internals.
  - Preserve current public behavior expectations through parity scenarios and diagnostics before destructive replacement.

Change Type:

- Add / Modify / Remove:
  - Add vNext staging documentation and future staging root.
  - Add engine public facade contracts before implementation.
  - Add no-op/headless test backend before WebGL/WebGPU backends.
  - Remove `_vnext` naming only during final rename-back cutover.

Impact:

- Affected modules:
  - `packages/engine` remains stable during E0/E1.
  - `packages/_vnext/engine` will hold the next implementation once created.
  - `apps/vector-editor-web` should not import vNext directly until adapter/parity tests are ready.
  - Repo workspace config should not include incomplete vNext packages by default.

Cleanup:

- Old logic to remove:
  - No old engine logic is removed in E0/E1.
  - Hybrid WebGPU fallback, renderer/runtime coupling, and direct scene-render traversal are cleanup targets for later phases.
  - Any temporary adapter must include `AI-TEMP` with a removal condition.

Tests:

- Tests to add/update:
  - Public API lifecycle tests.
  - No-op/headless backend instantiation and disposal tests.
  - Diagnostics snapshot tests for backend selection and lifecycle state.
  - Parity scenario definitions for current engine behavior.

## 1. Scope Definition

This first task set does not implement the full engine rewrite. It establishes the controlled entry point for the rewrite.

In scope:

- vNext staging contract.
- Public API facade definition.
- Runtime shell lifecycle definition.
- No-op/headless backend for deterministic tests.
- Baseline parity scenario list.
- Initial test matrix.

Out of scope:

- Moving current engine code into vNext.
- Extracting renderer packages.
- Implementing full Document/Compiler/ECS layers.
- Implementing WebGPU native rendering.
- Changing app integration to vNext.
- Renaming vNext back to canonical engine.

## 2. Type Definition Plan

Initial public contracts should be defined before behavior:

- `EngineBackendMode`: `auto | webgpu | webgl | canvas2d | headless`.
- `EngineLifecycleState`: `created | running | paused | stopped | disposed`.
- `EngineCreateOptions`: canvas/surface adapter, backend, runtime adapter, diagnostics options.
- `EngineRuntimeAdapter`: frame request, clock, optional worker/platform hooks.
- `EngineHandle`: lifecycle methods and stats access.
- `EngineStatsSnapshot`: lifecycle state, backend selection, frame counters, diagnostics flags.
- `BackendSelectionResult`: requested backend, resolved backend, fallback reason, native eligibility.
- `TestEngineSurface`: deterministic surface contract for headless/no-op backend tests.

All TypeScript declarations must include declaration-level and field-level semantic comments when implemented.

## 3. Public Facade Target

Initial facade shape:

```txt
createEngine(options)
  -> EngineHandle

EngineHandle
  - start()
  - stop()
  - pause()
  - resume()
  - dispose()
  - resize(width, height)
  - captureFrame()
  - getStats()
  - getBackendInfo()
```

The facade should be backend-independent. Apps must not care whether execution resolves to WebGPU, WebGL, Canvas2D, or headless.

## 4. Baseline Parity Scenarios

Capture before replacing canonical engine behavior:

1. Lifecycle smoke:
   - create, start, pause, resume, stop, dispose.
2. Resize smoke:
   - create, resize, read stats.
3. Empty scene render:
   - create, render one frame, diagnostics show backend path.
4. Vector dense scene:
   - load many shapes, pan/zoom, verify no blank frame.
5. 3D spatial path:
   - ray/frustum resolver diagnostics remain visible.
6. WebGPU fallback path:
   - fake/unsupported WebGPU resolves with explicit fallback reason.
7. Diagnostics compatibility:
   - existing app bridge can consume stats shape or adapter normalization.

## 5. Initial Implementation Order

1. Create `packages/_vnext/engine` only when the first TypeScript contract files are ready.
2. Add package metadata only if the package is intentionally integrated into tooling.
3. Add public type contracts and comments.
4. Add no-op/headless backend implementation.
5. Add lifecycle shell.
6. Add stats snapshot and backend selection diagnostics.
7. Add tests.
8. Compare facade against current `packages/engine` usage.

## 6. Validation Gates for E0/E1

Narrow gates after vNext package exists:

```txt
pnpm --filter <vnext-engine-package-name> test
pnpm --filter <vnext-engine-package-name> exec tsc --noEmit
```

Final gates before app integration:

```txt
pnpm typecheck
pnpm lint
pnpm test
pnpm governance:check
pnpm governance:file-shape
```

If vNext is not added to workspace yet, use explicit local TypeScript/test commands documented in the task note.

## 7. Cutover Preconditions

Do not rename vNext back to `packages/engine` until:

- Public facade parity is documented.
- App bridge integration path is tested.
- Backend fallback diagnostics are stable.
- Core render path has a tested backend implementation.
- CHANGE REQUEST cleanup items are either complete or tagged with removal conditions.
- Full validation gates pass.

## 8. Open Questions

- Should vNext package be named temporarily, or stay outside workspace until the shell is complete?
- Which current engine integration tests become mandatory parity tests before rename-back?
- Should the first vNext shell support only headless/no-op backend, or also a minimal Canvas2D smoke backend?
- How much of current diagnostics payload must be byte-compatible versus adapter-normalized?

## 9. Next Action Items

- [ ] Create current engine public API usage inventory.
- [ ] Create diagnostics field inventory for current engine stats.
- [ ] Decide whether to integrate `packages/_vnext/engine` into workspace during E1.
- [ ] Draft initial TypeScript contracts for vNext facade.
- [ ] Add no-op/headless backend tests.
