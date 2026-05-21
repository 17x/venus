# ADR: Platform Adapter Exposure Policy

Status: Accepted
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Exposure boundary for browser/electron/node adapters during engine split readiness and cutover.
Related:

- `ai/refactor-vnext/repo-refactor-management.md`
- `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
- `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`

## Context

`@venus/engine` now has protocol boundaries and adapter ownership separation. A remaining decision is whether browser/electron/node adapters should be public API before package split extraction.

Premature exposure would freeze unstable adapter contracts and force long-lived compatibility wrappers during split cutover.

## Decision

Keep browser/electron/node adapters internal until renderer/platform package extraction cutover reaches contract-stable phase.

Exposure rule:

- Do not publish platform adapter implementation symbols from `@venus/engine` public exports before split cutover.
- Keep adapter contracts internal to protocol/adapters boundaries during stabilization windows.
- Expose platform adapters only after extraction packages have stable contracts and pass parity gates.

## Rationale

1. Preserves contract agility while split boundaries are still evolving.
2. Avoids external coupling to pre-cutover adapter details.
3. Reduces compatibility debt during renderer/platform package rename-back.
4. Keeps engine public API centered on runtime capability contracts, not host implementation symbols.

## Consequences

Positive:

- Lower public surface volatility.
- Cleaner extraction path to `platform-*` packages.
- Fewer migration shims in app bridges.

Trade-offs:

- Internal consumers must use engine runtime configuration surfaces rather than direct adapter imports.
- Adapter docs need explicit internal-only labeling until cutover.

## Implementation Constraints

1. Do not export browser/electron/node adapter implementation files from `packages/engine/src/index.ts`.
2. Keep host behavior injection through runtime options/protocol contracts only.
3. Re-evaluate exposure only when split-readiness metrics are green and extraction package contracts are validated.

## Validation Gates

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Follow-up Actions

- Mark open decision #2 as resolved in the open-decision ledger.
- Keep platform extraction tasks in repo plan aligned with internal-first adapter policy.
- Revisit exposure once `platform-*` packages pass cutover parity gates.
