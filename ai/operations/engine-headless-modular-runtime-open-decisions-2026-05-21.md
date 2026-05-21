# Engine Headless Modular Runtime Open Decisions Snapshot

Status: Executed snapshot (all listed decisions resolved)
Date: 2026-05-21
Scope: Residual architecture decisions after H0-H8 completion.
Source: `ai/refactor-vnext/engine-headless-modular-runtime-management.md`

Execution state note:

- This snapshot is closed as of 2026-05-21.
- Re-open only by appending a new dated execution block when unresolved decisions are introduced.
- Numbered maintenance bundle executed: `ai/operations/engine-headless-modular-runtime-maintenance-batch-2026-05-21-100-tasks.md`.

## Decision Set

1. Capability-gated public API shape

- Decision: choose between separate typed handles and one runtime handle with typed feature accessors.
- Current risk: mixed API shape could increase migration cost for app bridge callers.
- Trigger to execute: before exposing any new public capability-gated facade from `packages/engine/src/api`.
- Resolution: accepted on 2026-05-21 via `ai/refactor-vnext/adr-capability-gated-api-shape-2026-05-21.md`; canonical shape is one runtime handle with typed feature accessors.

2. Platform adapter exposure policy

- Decision: keep browser/electron/node profile adapters internal or publish as package public API.
- Current risk: early exposure can freeze unstable adapter contracts.
- Trigger to execute: before split cutover branch creates external platform packages.
- Resolution: accepted on 2026-05-21 via `ai/refactor-vnext/adr-platform-adapter-exposure-policy-2026-05-21.md`; policy is internal-first until extraction contracts are stable.

3. WebGPU/WebGL ownership model

- Decision: represent GPU backends as adapter-only ownership or dual module+adapter ownership.
- Current risk: dual ownership can create policy duplication between runtime and adapter layers.
- Trigger to execute: before renderer package extraction starts in repo-level cutover plan.
- Resolution: accepted on 2026-05-21 via `ai/refactor-vnext/adr-webgpu-webgl-ownership-model-2026-05-21.md`; ownership model is adapter-only execution with engine-owned policy/orchestration.

4. Vector-editor scenario profile ownership

- Decision: keep vector-editor scenario profile inside engine or move to app-level profile package after split.
- Current risk: wrong ownership can cause app policy leakage into engine profile contracts.
- Trigger to execute: before first app-specific profile package is staged.
- Resolution: accepted on 2026-05-21 via `ai/refactor-vnext/adr-vector-editor-scenario-profile-ownership-2026-05-21.md`; ownership is phased (engine during stabilization, app-level after split readiness).

5. `createEngineCompat` end-state boundary

- Decision: define final retained scope for compatibility facade after app bridge moves to capability-aware runtime APIs.
- Current risk: compatibility shim can remain longer than needed without an explicit cut line.
- Trigger to execute: before declaring track-level done under section 15 acceptance criteria.
- Resolution: accepted on 2026-05-21 via `ai/refactor-vnext/adr-createenginecompat-end-state-boundary-2026-05-21.md`; end-state is thin translation/diagnostics facade with explicit shim retirement trigger.

## Execution Recommendation

Assigned execution ledger (2026-05-21):

1. Capability-gated public API shape

- Owner: Engine architecture migration
- Window: 2026-05-22 to 2026-05-27
- Artifact: ADR addendum under `ai/refactor-vnext/` + CR note update in `packages/engine/docs/industrial-refactor/change-requests/cr-headless-modular-runtime-contracts-2026-05-20.md`
- Validation gates: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @venus/engine cr:check`
- Status: Completed on 2026-05-21 (ahead of window) with ADR acceptance recorded.

2. Platform adapter exposure policy

- Owner: Engine architecture migration
- Window: 2026-05-27 to 2026-05-31
- Artifact: repo-level decision update in `ai/refactor-vnext/repo-refactor-management.md` + ADR note under `ai/refactor-vnext/`
- Validation gates: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`
- Status: Completed on 2026-05-21 (ahead of window) with ADR acceptance recorded.

3. WebGPU/WebGL ownership model

- Owner: Engine architecture migration
- Window: 2026-05-27 to 2026-05-31
- Artifact: architecture decision section in `ai/refactor-vnext/engine-headless-modular-runtime-management.md` + CR change log update
- Validation gates: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @venus/engine cr:check`
- Status: Completed on 2026-05-21 (ahead of window) with ADR acceptance recorded.

4. Vector-editor scenario profile ownership

- Owner: Engine architecture migration
- Window: 2026-06-01 to 2026-06-04
- Artifact: scenario ownership decision note in `ai/refactor-vnext/engine-headless-modular-runtime-management.md` + repo plan alignment in `ai/refactor-vnext/repo-refactor-management.md`
- Validation gates: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`
- Status: Completed on 2026-05-21 (ahead of window) with ADR acceptance recorded.

5. `createEngineCompat` end-state boundary

- Owner: Engine architecture migration
- Window: 2026-06-01 to 2026-06-07
- Artifact: compatibility retirement CR follow-up note in `packages/engine/docs/industrial-refactor/change-requests/cr-headless-modular-runtime-contracts-2026-05-20.md`
- Validation gates: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm --filter @venus/engine cr:check`
- Status: Completed on 2026-05-21 (ahead of window) with ADR acceptance recorded.

Maintenance rule:

- Keep this file as the canonical open-decision ledger and update status/results in the same change when any decision is resolved.
- If new unresolved decisions appear, append them as a new dated execution block instead of rewriting completed entries.

Next execution trigger template:

1. Add unresolved decision row with owner, risk, trigger, and target artifact.
2. Add dated execution block with validation gates and status field.
3. Update management queue and CR artifact in the same change.
