# Current Work

## 2026-04-28

- Expanded `@venus/editor-primitive` into full module layout:
  - `pointer`, `keyboard`, `tool`, `operation`, `hover`
  - `overlay`, `cursor`, `viewport`, `capture`, `runtime`
- Added `node:test` coverage under `packages/editor-primitive/src/**` for each module.
- Extracted shared zoom preset policy into `@venus/editor-primitive/viewport` and switched vector local interaction bridge to consume the package export.
- Switched vector runtime-local cursor resize rotation mapping to reuse `@venus/editor-primitive/cursor` helper.
- Updated `@vector/runtime/interaction` bridge to re-export `@venus/editor-primitive` first, then vector-local adapters from `editor/runtime-local/interaction`.
- Removed duplicated zoom exports from vector-local interaction barrel to keep one package-owned zoom contract.
- Added explicit vector app workspace dependency on `@venus/editor-primitive`.
- Added `@venus/editor-primitive` package scripts for `typecheck`, `lint`, and `build`, then expanded package README API examples.
- Expanded `@venus/editor-primitive` contract coverage from module helpers to an explicit interaction pipeline skeleton:
  - added new modules `shortcut`, `gesture`, `target`, `command`, `selection`, and `policy`
  - added `tool`-level `ToolHandler` contract + dispatch helper
  - added explicit `OperationPhase` lifecycle contract (`idle/pending/active/committing/cancelled/completed`)
  - added runtime-level `runInteractionPipeline(...)` orchestration contract
- Continued `@venus/editor-primitive` M1-M3 alignment with `docs/task/repo-abstract/repo-abstract-03.md`:
  - added `runtime` contracts: `InteractionRuntimeState`, `InteractionResult`, `InteractionTrace`, and `dispatchInteractionEvent(...)`
  - added `pointer` contract: `NormalizedPointerEvent`
  - added `target` multi-hit stack primitives: `TargetStack`, `pickPrimaryTarget`, `pickNextTarget`
  - added `shortcut` IME/text-edit guard: `shouldHandleEditorShortcut(...)`
- Added deterministic `node:test` coverage for the new runtime/target/pointer/shortcut contracts.
- Continued `@venus/editor-primitive` M2-M3 contract hardening for normalized runtime events:
  - added `input/ModifierState` test coverage and keyboard/wheel normalized contract tests
  - added `viewport/ViewportIntent` contract tests for pan/zoom/fit/none branches
  - expanded `runtime/dispatchInteractionEvent` tests for warning paths (`ignored-non-primary-pointer`) and lifecycle interrupt cancel routing (`blur`)
  - exported `ViewportIntent` from `runtime/index.ts` for one-surface runtime contract imports
- Fixed engine cross-environment frame/timer handle typing so workspace typecheck passes with Node timer types enabled:
  - updated `packages/engine/src/renderer/initialRender.ts` timer handle fields to use runtime `setTimeout` return-handle typing
  - updated `packages/engine/src/time/index.ts` `EngineFrameHandle` to support timeout handles and guarded `cancelAnimationFrame` with numeric-handle narrowing
- Verification for this expansion slice:
  - `pnpm --filter @venus/editor-primitive typecheck`
  - `pnpm --filter @venus/editor-primitive lint`
  - `pnpm --filter @venus/editor-primitive test`
  - `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`

## 2026-04-27

- Bootstrapped `@venus/lib` as the shared low-level package and implemented module slices for:
  - `math`, `geometry`, `ids`, `events`, `lifecycle`, `scheduler`
  - `patch`, `collections`, `logger`, `worker`, `serialization`, `assert`
- Added `node:test` coverage under `packages/lib/src/**` for each module.
- Extracted shared utilities from existing package/app code:
  - `packages/engine/src/math/matrix.ts` -> `@venus/lib/math`
  - `packages/engine/src/worker/capabilities.ts` -> `@venus/lib/worker`
  - `packages/engine/src/runtime/renderScheduler.ts` now delegates to `@venus/lib/scheduler`
  - `packages/engine/src/interaction/viewport.ts` -> `@venus/lib/viewport`
  - `packages/engine/src/interaction/viewportPan.ts` -> `@venus/lib/viewport`
  - `packages/engine/src/interaction/zoom.ts` -> `@venus/lib/viewport`
  - `apps/vector-editor-web/src/model/nid.ts` -> `@venus/lib/ids`
  - `apps/vector-editor-web/src/editor/runtime-local/worker/scope/patchBatch.ts` now reuses `@venus/lib/patch`
- Completed third extraction batch for transform geometry primitives:
  - `packages/lib/src/math/affineMatrix.ts` now owns shared 2D affine matrix helpers.
  - `packages/lib/src/geometry/rotatedBounds.ts` now owns rotated bounds hit-testing.
  - `packages/engine/src/interaction/shapeTransform.ts` now delegates shared affine/bounds primitives to `@venus/lib` while preserving engine API compatibility.
  - `packages/engine/src/interaction/hitTest.ts` now consumes normalized bounds helpers directly from `@venus/lib/geometry`
- Updated package documentation for ownership scope and module boundaries.

## Notes

- Verification currently passes for:
 - `pnpm --filter @venus/editor-primitive typecheck`
 - `pnpm --filter @venus/editor-primitive lint`
 - `pnpm --filter @venus/editor-primitive test`
 - `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
 - `pnpm typecheck`
 - `pnpm lint`
 - `pnpm build`
 - `pnpm test`
  - `pnpm --filter @venus/lib typecheck:test`
  - `pnpm --filter @venus/lib test`
  - `pnpm --filter @venus/engine test`

- Additional note:
  - `pnpm --filter @venus/vector-editor-web lint` still fails in pre-existing `ui-style-guard` checks unrelated to this migration slice.

