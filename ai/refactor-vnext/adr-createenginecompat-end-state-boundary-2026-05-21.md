# ADR: createEngineCompat End-State Boundary

Status: Accepted
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Final retained scope and retirement boundary for `createEngineCompat`.
Related:

- `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
- `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`
- `packages/engine/src/api/createEngineCompat.ts`

## Context

`createEngineCompat` has been narrowed during H5/H6, but unresolved scope remained around how much compatibility behavior should persist after app bridge migration.

Without an explicit end-state boundary, compatibility shims can linger and keep policy duplicated.

## Decision

Define end-state boundary as a thin compatibility adapter with explicit retirement path:

- Retain temporarily:
  - method-shape translation for legacy callers,
  - deterministic capability-policy warnings,
  - diagnostics compatibility mapping.
- Retire:
  - behavior-owning shims and no-op fallbacks once app bridge is migrated to capability-aware runtime APIs.

Retirement trigger:

- When app bridge no longer depends on compatibility-only methods and equivalent capability-accessor runtime APIs are adopted.

## Rationale

1. Prevents compatibility layer from owning runtime policy long-term.
2. Keeps migration safety for existing callers during transition.
3. Enables measurable deprecation via existing shim-boundary tests and `AI-TEMP` markers.

## Consequences

Positive:

- Clear cut line for compatibility retirement.
- Reduced long-term maintenance burden in API layer.

Trade-offs:

- Requires coordinated app bridge migration window.
- Requires periodic review of remaining `AI-TEMP` markers.

## Implementation Constraints

1. Keep all temporary compatibility branches explicitly tagged with `AI-TEMP`.
2. Do not introduce new compatibility-owned behavior beyond translation/diagnostics during stabilization.
3. Remove shim branches in the same change that migrates the consuming app path.

## Validation Gates

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm --filter @venus/engine cr:check`

## Follow-up Actions

- Mark open decision #5 as resolved in the open-decision ledger.
- Convert remaining compatibility shims into dated removal tasks tied to app bridge migration milestones.
