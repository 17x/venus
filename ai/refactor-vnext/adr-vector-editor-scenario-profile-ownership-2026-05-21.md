# ADR: Vector-Editor Scenario Profile Ownership

Status: Accepted
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Ownership boundary for vector-editor scenario profile before and after package split.
Related:

- `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
- `ai/refactor-vnext/repo-refactor-management.md`
- `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`

## Context

The vector-editor scenario profile currently lives in engine migration artifacts and supports parity/regression coverage. The unresolved decision is whether to keep it in engine long-term or move to app-level profile ownership after split.

Keeping app-specific policy in engine indefinitely risks product-policy leakage into core engine contracts.

## Decision

Use phased ownership:

- Pre-split/stabilization phase: keep vector-editor scenario profile in engine for parity and regression continuity.
- Post-split/app-profile phase: migrate vector-editor scenario profile to app-level profile ownership once app profile package boundaries are available and stable.

## Rationale

1. Preserves current parity coverage without disruptive moves during stabilization.
2. Prevents long-term app-policy accumulation inside engine package.
3. Aligns with package topology where apps own product policy and profile assembly details.

## Consequences

Positive:

- Stable short-term regression coverage.
- Clear long-term policy boundary between engine and app packages.

Trade-offs:

- Requires one planned migration step after app-level profile package is ready.
- Needs explicit parity gates during ownership transfer.

## Implementation Constraints

1. Do not move profile ownership before app-level profile package contracts exist.
2. When moving, keep scenario replay parity tests green across ownership transition.
3. Keep module capability contracts engine-owned even if scenario profile ownership moves.

## Validation Gates

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`

## Follow-up Actions

- Mark open decision #4 as resolved in the open-decision ledger.
- Add migration step to repo plan for post-split app-profile transfer window.
