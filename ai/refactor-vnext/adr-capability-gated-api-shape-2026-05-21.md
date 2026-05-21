# ADR: Capability-Gated Public API Shape

Status: Accepted
Date: 2026-05-21
Owner: Engine architecture migration
Scope: `@venus/engine` public facade evolution for capability-gated APIs.
Related:

- `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
- `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`
- `packages/engine/src/api/createEngine.ts`
- `packages/engine/src/api/createEngineCompat.ts`

## Context

The current engine migration introduced profile-driven capability contracts and deterministic missing-capability behavior. The remaining open decision is how public APIs should expose capability-gated features:

- Option A: multiple separate typed handles
- Option B: one runtime handle with typed feature accessors

Keeping both patterns active would increase migration complexity for app bridge callers and prolong compatibility shims.

## Decision

Adopt one runtime handle with typed feature accessors as the canonical capability-gated public API shape.

API shape rule:

- Keep one stable top-level runtime handle returned by `createEngine(...)`.
- Expose optional capabilities through typed accessors scoped by feature domain.
- Preserve strict/dev/compat capability policy behavior from profile runtime contracts.

## Rationale

1. Keeps caller migration incremental:

- Existing handle-based call chains can adopt feature accessors without switching handle identity.

2. Reduces compatibility bridge surface area:

- `createEngineCompat` can delegate toward one handle model rather than mirroring multiple parallel handles.

3. Aligns with profile-runtime capability contracts:

- Accessor availability can map directly to runtime capability checks and deterministic warnings/errors.

4. Avoids long-lived dual API modes:

- Multiple top-level handles would likely force adapter code to maintain two orchestration paths.

## Consequences

Positive:

- Stable public handle identity across capability rollout.
- Cleaner deprecation path for compatibility shims.
- Better fit for strict/dev missing-capability policy gating.

Trade-offs:

- Requires careful accessor typing strategy to avoid weakly typed optional access.
- Requires clear accessor naming and ownership conventions.

## Implementation Constraints

1. No public API should bypass capability policy checks.
2. Accessor APIs must remain deterministic under strict/dev/compat modes.
3. Any temporary compat fallback must keep `AI-TEMP` annotations.
4. Do not introduce separate top-level runtime handles for feature domains.

## Validation Gates

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm --filter @venus/engine cr:check`

## Follow-up Actions

- Update API design notes in `ai/refactor-vnext/engine-headless-modular-runtime-management.md` open-decision section to reference this ADR.
- Mark decision #1 as resolved in `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`.
- Keep the remaining open decisions unchanged until their assigned windows.
