# Current Work

## 2026-04-28

- Expanded `@venus/editor-primitive` into full module layout:
  - `pointer`, `keyboard`, `tool`, `operation`, `hover`
  - `overlay`, `cursor`, `viewport`, `capture`, `runtime`
- Added `node:test` coverage under `packages/editor-primitive/src/**` for each module.
- Extracted shared zoom preset policy into `@venus/editor-primitive/viewport` and switched vector local interaction bridge to consume the package export.
- Switched vector runtime-local cursor resize rotation mapping to reuse `@venus/editor-primitive/cursor` helper.

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
  - `pnpm --filter @venus/lib typecheck:test`
  - `pnpm --filter @venus/lib test`
  - `pnpm --filter @venus/engine test`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
