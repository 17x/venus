# CR: Headless Modular Runtime Contracts (2026-05-20)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/core/module/*`
  - `packages/engine/src/profiles/*`
  - `packages/engine/src/runtime/runtime-builder.ts`
  - `packages/engine/src/api/createEngine.ts`
  - `packages/engine/src/api/createEngineCompat.ts`
  - `packages/engine/src/api/createEngineCompatTypes.ts`
  - `packages/engine/src/api/public-types.ts`
  - `packages/engine/src/core/composition/composition-contracts.ts`
  - `packages/engine/src/protocol/runtime/runtime-port.ts`
  - `packages/engine/src/protocol/surface/surface-port.ts`
  - `packages/engine/src/protocol/surface/viewport-port.ts`
  - `packages/engine/src/protocol/backend/backend-port.ts`
  - `packages/engine/src/protocol/backend/backend-capabilities.ts`
  - `packages/engine/src/protocol/backend/backend-mode.ts`
  - `packages/engine/src/protocol/backend/backend-selection.ts`
  - `packages/engine/src/protocol/input/input-port.ts`
  - `packages/engine/src/protocol/resource/resource-port.ts`
  - `packages/engine/src/protocol/text/text-port.ts`
  - `packages/engine/src/protocol/diagnostics/diagnostics-port.ts`
  - `packages/engine/src/protocol/replay/replay-port.ts`
  - `packages/engine/src/testing/headlessModularRuntime.contract.test.ts`
  - `packages/engine/src/testing/backendSelectionProtocol.contract.test.ts`
  - `packages/engine/src/testing/importGraphBoundary.contract.test.mjs`
  - `packages/engine/src/testing/createEngineCompatShimBoundary.contract.test.mjs`
  - `packages/engine/src/testing/createEngineCompat.adapter.test.ts`
  - `packages/engine/src/testing/createEngine.orchestration.test.ts`
  - `ai/refactor-vnext/adr-capability-gated-api-shape-2026-05-21.md`
  - `ai/refactor-vnext/adr-platform-adapter-exposure-policy-2026-05-21.md`
  - `ai/refactor-vnext/adr-webgpu-webgl-ownership-model-2026-05-21.md`
  - `ai/refactor-vnext/adr-vector-editor-scenario-profile-ownership-2026-05-21.md`
  - `ai/refactor-vnext/adr-createenginecompat-end-state-boundary-2026-05-21.md`
  - `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
  - `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`
  - `ai/refactor-vnext/repo-refactor-management.md`
  - `ai/operations/engine-headless-modular-runtime-maintenance-batch-2026-05-21-100-tasks.md`
  - `packages/engine/src/index.ts`

Goal:

- Problem being solved:
  - Start the post-cutover headless modular runtime architecture with real contracts instead of folder-only structure.
  - Define module capabilities, dependency validation, profile manifests, and baseline profiles before runtime behavior is routed through profiles.
  - Keep `@venus/engine` as one package while making future core/protocol/adapter/profile boundaries testable.

Change Type:

- Add / Modify
  - Add module registry contracts and validation helpers.
  - Add profile manifest contracts, validator, and base/headless/browser/vector profile manifests.
  - Add a profile-backed runtime builder that exposes deterministic module activation and capability checks.
  - Route canonical `createEngine` through profile-backed runtime assembly metadata while preserving existing lifecycle behavior.
  - Route `createEngineCompat` fallback/no-op methods through profile-backed capability policy diagnostics while keeping return-shape compatibility.
  - Add vector composition layer contracts and make compat overlay nodes participate in composition diagnostics and canvas draw path.
  - Add explicit composition plane semantics (`base`, `active`, `overlay`) and route compat active-node state through composition diagnostics and draw path.
  - Add local hover hit-test semantics in compatibility runtime so hover composition state is no longer legacy-fallback-only.
  - Add compatibility scenario tests for hover semantics, offset/DPR transforms, low-scale zoom, dense-scene ordering, and overlay invalidation redraw behavior.
  - Retire compatibility runtime legacy opt-in path by removing runtime `@venus/engine-legacy` creation/delegation from `packages/engine/src/api/createEngineCompat.ts`.
  - Update runtime legacy-boundary guard inventory to an empty set in `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs`.
  - Migrate legacy parity tests to canonical export-vs-module stability tests and remove `@venus/engine-legacy` dependency from `packages/engine/package.json`.
  - Split backend selector registry/probe contract from backend runtime implementation by introducing `packages/engine/src/backend/backendSelector.ts` and updating `createEngine` to consume the dedicated selector module.
  - Add deterministic backend selector contract tests in `packages/engine/src/testing/backendSelector.contract.test.ts` to lock probe order and first-eligible resolution behavior.
  - Add backend adapter registry contract (`packages/engine/src/backend/backendAdapterRegistry.ts`) and route `createEngine` backend instantiation through adapter resolution.
  - Add fake backend adapter injection/fallback conformance tests in `packages/engine/src/testing/backendAdapterRegistry.contract.test.ts`.
  - Move Canvas2D/noop backend implementations into adapter ownership (`packages/engine/src/adapters/backend/*`) and retire superseded backend-owned implementation files.
  - Add WebGPU/WebGL adapter stubs and capability probe utilities under adapter ownership, and validate them with conformance coverage in `packages/engine/src/testing/webAdapter.conformance.test.ts`.
  - Move document-store access behind a core module contract by adding `packages/engine/src/core/document/document-module-contracts.ts` and `packages/engine/src/core/document/document-store-module.ts`, and route `createEngine` through that module.
  - Add document-store module parity coverage in `packages/engine/src/testing/documentStoreModule.contract.test.ts`.
  - Move compiler/world/view/scheduler access behind core module contracts (`packages/engine/src/core/compiler/*`, `packages/engine/src/core/world/*`, `packages/engine/src/core/view/*`, `packages/engine/src/core/scheduler/*`) and route runtime orchestration paths through those modules.
  - Add module parity conformance coverage in `packages/engine/src/testing/compilerModule.contract.test.ts`, `packages/engine/src/testing/runtimeWorldModule.contract.test.ts`, `packages/engine/src/testing/viewportModule.contract.test.ts`, and `packages/engine/src/testing/schedulerModule.contract.test.ts`.
  - Add core import-boundary coverage for moved modules in `packages/engine/src/testing/coreModuleBoundary.contract.test.mjs`.
  - Extend runtime profile contracts with scenario replay/diagnostics manifest metadata in `packages/engine/src/profiles/profile-contracts.ts` and validator rules in `packages/engine/src/profiles/profile-validator.ts`.
  - Add scenario runtime profiles for dense vector replay and headless replay in `packages/engine/src/profiles/scenario/*`.
  - Add scenario replay and diagnostics snapshot conformance coverage in `packages/engine/src/testing/scenarioProfiles.replay.test.ts`.
  - Define protocol contract files for runtime/surface/backend/input/resource/text/diagnostics/replay boundaries under `packages/engine/src/protocol/*`.
  - Route canonical backend-selection entry through `packages/engine/src/protocol/backend/backend-selection.ts` while preserving selector behavior and export compatibility.
  - Add selector parity coverage for protocol-backed backend selection in `packages/engine/src/testing/backendSelectionProtocol.contract.test.ts`.
  - Add import-graph boundary coverage for transitive core/adapters isolation in `packages/engine/src/testing/importGraphBoundary.contract.test.mjs`.
  - Add compatibility-shim boundary coverage to enforce explicit `AI-TEMP` markers and legacy-runtime import bans in `packages/engine/src/testing/createEngineCompatShimBoundary.contract.test.mjs`.
  - Accept capability-gated public API shape decision (single runtime handle with typed feature accessors) in `ai/refactor-vnext/adr-capability-gated-api-shape-2026-05-21.md`.
  - Accept platform adapter exposure policy decision (internal-first until extraction contract stability) in `ai/refactor-vnext/adr-platform-adapter-exposure-policy-2026-05-21.md`.
  - Accept WebGPU/WebGL ownership model decision (adapter-only execution ownership) in `ai/refactor-vnext/adr-webgpu-webgl-ownership-model-2026-05-21.md`.
  - Accept vector-editor scenario profile ownership decision (phased engine-to-app ownership) in `ai/refactor-vnext/adr-vector-editor-scenario-profile-ownership-2026-05-21.md`.
  - Accept `createEngineCompat` end-state boundary decision (thin translation/diagnostics facade with explicit retirement trigger) in `ai/refactor-vnext/adr-createenginecompat-end-state-boundary-2026-05-21.md`.
  - Synchronize post-closeout governance artifacts (`engine-headless-modular-runtime-management`, open-decision snapshot, repo-level management) and add a numbered maintenance execution ledger (`ai/operations/engine-headless-modular-runtime-maintenance-batch-2026-05-21-100-tasks.md`).
  - Add conformance tests for dependency validation, duplicate detection, backend priority metadata, and missing capability behavior.
  - Export contracts from the canonical engine entry point.

Impact:

- Affected modules:
  - Engine architecture contracts and public staged exports.
  - No rendering behavior change in this slice.
  - No app integration change in this slice.

Cleanup:

- Old logic to remove:
  - Compatibility bridge runtime behavior will be moved behind profile/capability policy in later slices.
  - Core module relocations now route runtime call sites through core contracts; legacy direct-call paths can be retired incrementally in follow-up cleanup slices.

Tests:

- Tests to add/update:
  - `pnpm --filter @venus/engine test`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm --filter @venus/engine cr:check`
