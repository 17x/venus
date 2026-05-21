# Engine vNext Document/Compiler Bootstrap (2026-05-20)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/engine/src/document/document-contracts.ts`
  - `packages/_vnext/engine/src/document/document-store.ts`
  - `packages/_vnext/engine/src/compiler/incrementalCompiler.ts`
  - `packages/_vnext/engine/src/testing/documentCompiler.replay.test.ts`
  - `packages/_vnext/engine/src/index.ts`

Goal:

- Problem being solved:
  - Start E2 with explicit document/runtime boundary contracts.
  - Add deterministic change-set apply + compiler invalidation output that can be replay-tested.

Change Type:

- Add / Modify / Remove
  - Add: document contracts, store, and incremental compiler skeleton.
  - Add: deterministic replay test for repeated change-set application.
  - Modify: package entrypoint exports for E2 modules.

Impact:

- Affected modules:
  - `@venus/engine-vnext` staged API surface (`document` and `compiler` slices).
  - Testing coverage under `src/testing` for E2 determinism baseline.

Cleanup:

- Old logic to remove:
  - None in this bootstrap step.
  - This step introduces no adapter fallback branches.

Tests:

- Tests to add/update:
  - Add deterministic replay test for repeated change-set sequences.
  - Validate package typecheck and targeted node tests.

---

## Completed

- [x] Added staged document contracts in `packages/_vnext/engine/src/document/document-contracts.ts`.
- [x] Added deterministic document snapshot/change-set store in `packages/_vnext/engine/src/document/document-store.ts`.
- [x] Added staged incremental compiler invalidation output in `packages/_vnext/engine/src/compiler/incrementalCompiler.ts`.
- [x] Added deterministic replay coverage in `packages/_vnext/engine/src/testing/documentCompiler.replay.test.ts`.
- [x] Exported E2 document/compiler APIs from `packages/_vnext/engine/src/index.ts`.
- [x] Wired document/compiler outputs into top-level orchestration diagnostics in `packages/_vnext/engine/src/api/createEngine.ts`.
- [x] Added staged E3/E4 modules:
  - `packages/_vnext/engine/src/ecs/runtimeWorld.ts`
  - `packages/_vnext/engine/src/spatial/spatialIndex.ts`
  - `packages/_vnext/engine/src/picking/pickingPipeline.ts`
  - `packages/_vnext/engine/src/render-execution/stagedExecutionChain.ts`
- [x] Added staged execution integration regression in `packages/_vnext/engine/src/testing/stagedExecutionChain.integration.test.ts`.
- [x] Verified compile + targeted tests:
  - `pnpm exec tsc -p packages/_vnext/engine/tsconfig.json --noEmit`
  - `pnpm exec node --import tsx --test packages/_vnext/engine/src/testing/createEngine.orchestration.test.ts packages/_vnext/engine/src/testing/createEngineFrameResolver.runtime.test.ts packages/_vnext/engine/src/testing/engineRuntime.scheduling.test.ts packages/_vnext/engine/src/testing/createEngine.lifecycle-parity.test.ts packages/_vnext/engine/src/testing/frameBudgetBroker.diagnostics.test.ts packages/_vnext/engine/src/testing/documentCompiler.replay.test.ts packages/_vnext/engine/src/testing/stagedExecutionChain.integration.test.ts`

## Gate Snapshot (2026-05-20)

- `pnpm typecheck`: pass
- `pnpm test`: pass
- `pnpm build`: pass
- `pnpm lint`: fail (existing `packages/engine/src/renderer/webgpu/webgpu.ts` JSDoc `@param` errors)
- `cd packages/_vnext/engine && pnpm exec tsc --noEmit`: pass

## Next

- [ ] Add document transaction helper (batch metadata + deterministic ordering checks).
- [ ] Add compiler category-level diagnostics reason strings for traceability.
- [ ] Connect document/compiler output into staged createEngine orchestration path.
- [x] Connect document/compiler output into staged createEngine orchestration path.
