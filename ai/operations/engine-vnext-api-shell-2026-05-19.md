# Engine vNext API Shell Bootstrap (2026-05-19)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/engine/src/api/public-types.ts`
  - `packages/_vnext/engine/src/api/createEngine.ts`
  - `packages/_vnext/engine/src/backend/backend.ts`
  - `packages/_vnext/engine/src/backend/noopBackend.ts`
  - `packages/_vnext/engine/src/runtime/engineRuntime.ts`
  - `packages/_vnext/engine/src/testing/createTestSurface.ts`
  - `packages/_vnext/engine/src/index.ts`
  - `ai/refactor-vnext/package-apis/*`

Goal:

- Problem being solved:
  - Start real implementation for vNext engine structure with a minimal public facade.
  - Provide human-readable package API docs for current and planned package boundaries.

Change Type:

- Add / Modify / Remove
  - Add: vNext API contracts and no-op runtime shell.
  - Add: package-level public API documentation set.
  - Modify: vNext engine entry exports.

Impact:

- Affected modules:
  - New staging-only package API: `@venus/engine-vnext`.
  - New docs under `ai/refactor-vnext/package-apis`.

Cleanup:

- Old logic to remove:
  - None in this step.
  - No-op backend and staging fallback remain temporary until real backend execution migrates.

Tests:

- Tests to add/update:
  - Type check completed: `pnpm exec tsc -p packages/_vnext/engine/tsconfig.json --noEmit`.
  - Runtime unit tests still pending for lifecycle transitions.

---

## Completed

- [x] Added public vNext types for engine facade and stats snapshot.
- [x] Added backend selection contract and no-op backend implementation.
- [x] Added runtime shell lifecycle implementation.
- [x] Added staging test helper surface factory.
- [x] Switched vNext package entry to public API exports.
- [x] Added package API docs for:
  - `@venus/lib`
  - `@venus/editor-primitive`
  - `@venus/engine-vnext`
  - proposed `@venus/runtime`
  - proposed renderer packages
  - proposed platform packages
- [x] Migrated staged contract module: `src/api/createEngineContracts.ts`.
- [x] Migrated staged policy bootstrap module: `src/policy/createEnginePolicyBootstrap.ts`.
- [x] Migrated staged frame planning resolver: `src/render-planning/createEngineFrameResolver.ts`.
- [x] Wired migrated helpers into `src/api/createEngine.ts` and package entry exports.
- [x] Verified compile on vNext package: `pnpm exec tsc -p packages/_vnext/engine/tsconfig.json --noEmit`.
- [x] Migrated staged viewport facade semantics into `src/view/viewportFacade.ts`.
- [x] Migrated staged runtime strategy semantics into `src/render-runtime/strategy.ts`.
- [x] Migrated staged frame-budget broker semantics into `src/scheduler/frameBudgetBroker.ts`.
- [x] Added runtime orchestration bridge in `src/render-runtime/runtimeFrameController.ts`.
- [x] Wired runtime strategy and scheduler budget into `src/render-planning/createEngineFrameResolver.ts`.
- [x] Migrated legacy runtime-facade semantics into `src/render-runtime/runtimeFacade.ts`.
- [x] Wired runtime-facade driven orchestration in `src/api/createEngine.ts` with per-frame planning diagnostics.
- [x] Added lifecycle/orchestration regression test: `src/testing/createEngine.orchestration.test.ts`.
- [x] Added runtime decision-shape regression test: `src/testing/createEngineFrameResolver.runtime.test.ts`.
- [x] Added deterministic runtime-adapter test double: `src/testing/runtimeAdapterTestDouble.ts`.
- [x] Added runtime shell scheduling regression tests: `src/testing/engineRuntime.scheduling.test.ts`.
- [x] Added lifecycle E0 parity fixture: `src/testing/createEngine.lifecycle-parity.test.ts`.
- [x] Added scheduler pressure diagnostics contract (`signals`, `reason`) in `src/scheduler/frameBudgetBroker.ts`.
- [x] Added pressure diagnostics regression test: `src/testing/frameBudgetBroker.diagnostics.test.ts`.
- [x] Propagated pressure diagnostics into public stats snapshot (`lastFramePressureReason`, `lastFramePressureSignals`) via `src/api/createEngine.ts`.
- [x] Extended runtime frame stats contract with pressure diagnostics payload in `src/render-runtime/runtimeFacade.ts`.
- [x] Verified compile + targeted tests:
  - `pnpm exec tsc -p packages/_vnext/engine/tsconfig.json --noEmit`
  - `pnpm exec node --import tsx --test packages/_vnext/engine/src/testing/createEngine.orchestration.test.ts packages/_vnext/engine/src/testing/createEngineFrameResolver.runtime.test.ts packages/_vnext/engine/src/testing/engineRuntime.scheduling.test.ts packages/_vnext/engine/src/testing/createEngine.lifecycle-parity.test.ts packages/_vnext/engine/src/testing/frameBudgetBroker.diagnostics.test.ts`
- [x] Added workspace dev dependencies required by direct TS node tests: `tsx`, `@types/node`.

## Legacy Module Pull Candidates (from current engine)

These modules are recommended first for contract-preserving migration into `_vnext`:

1. `packages/engine/src/runtime/createEngine/createEngineContracts.ts`
   - Reuse shape and naming for create options/stats contracts where feasible.
2. `packages/engine/src/runtime/createEngine/createEnginePolicyBootstrap.ts`
   - Extract backend/policy selection logic after facade shell stabilizes.
3. `packages/engine/src/runtime/createEngine/createEngineFrameResolver.ts`
   - Migrate incrementally into `render-planning` and `render-runtime` layers.
4. `packages/engine/src/runtime/createEngine/createEngineRuntimeFacade.ts`
   - Use as compatibility reference for lifecycle/runtime facade methods.
5. `packages/engine/src/runtime/createEngine/createEngineViewportFacade.ts`
   - Migrate into vNext view/runtime contracts after viewport context layer exists.

## Next

- [x] Add lifecycle unit tests under `packages/_vnext/engine/src/testing`.
- [x] Add runtime adapter test doubles for frame scheduling edge cases.
- [x] Add E0 parity fixtures for create/start/pause/resume/stop/dispose behavior.
- [x] Begin extracting richer `createEngineFrameResolver` QoS/pressure strategy contracts into staged modules.
- [x] Wire `createEngineRuntimeFacade` into the top-level create-engine orchestration path.
