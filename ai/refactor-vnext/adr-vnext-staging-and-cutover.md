# ADR: vNext Staging and Rename-Back Cutover

Status: Proposed
Date: 2026-05-19
Owner: Repository governance
Scope: Repo-level destructive refactor staging and cutover
Related:

- `ai/refactor.md`
- `ai/refactor-vnext/repo-refactor-management.md`
- `ai/refactor-vnext/engine-refactor-management.md`

## Context

The Venus refactor is intentionally large and destructive. The target architecture changes package boundaries, runtime ownership, renderer/backend placement, platform abstraction, and engine internals.

Applying these changes directly to canonical folders would force every intermediate commit to keep the current product fully working while core ownership is being rewritten. That creates high regression risk and encourages compatibility branches that become permanent.

The repository currently uses this workspace shape:

```txt
packages:
  - "apps/*"
  - "packages/*"
  - "docs/*"
```

A nested staging path such as `packages/_vnext/engine` is not automatically included as a workspace package by `packages/*`. This gives us a safe staging area for incomplete packages.

## Decision

Use `_vnext` staging roots for destructive refactor work:

```txt
packages/_vnext/
apps/_vnext/
ai/refactor-vnext/
```

Build new package/app versions under `_vnext` until their contracts, tests, and integration paths are ready. When a vNext package is validated, rename it back to the canonical package/app path during a controlled cutover.

Final canonical folders must not retain `_vnext`, `v2`, `new`, `temp`, or migration-oriented names.

## Rules

1. Keep canonical packages stable until their vNext replacement has parity tests.
2. Do not add nested `_vnext` packages to the workspace until explicit integration is needed.
3. If workspace integration is needed, use temporary package names and document removal conditions.
4. Do not move code before the target public contract exists.
5. Do not create placeholder packages or empty architecture folders.
6. Do not duplicate long-lived implementations in canonical paths.
7. Archive old canonical folders outside active workspace during cutover.
8. Remove migration adapters after the rollback window closes.
9. Every temporary runtime/code fallback must include `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`.
10. Every destructive move must include a CHANGE REQUEST before implementation.

## Staging Layout

Recommended repo staging:

```txt
packages/_vnext/runtime/
packages/_vnext/engine/
packages/_vnext/renderer-canvas2d/
packages/_vnext/renderer-webgl/
packages/_vnext/renderer-webgpu/
packages/_vnext/platform-browser/
packages/_vnext/platform-node/
apps/_vnext/vector-editor-web/
```

Create only paths that contain real contracts or implementation. Do not create every future package in advance.

## Cutover Sequence

1. Freeze writes to the old canonical package/app.
2. Run parity checks against old canonical behavior.
3. Run vNext package-level tests and integration tests.
4. Move old canonical folder to a non-workspace archive path.
5. Rename vNext folder to the canonical path.
6. Update package name, exports, tsconfig references, workspace entries, and imports.
7. Run full repo gates.
8. Fix all blocking failures before adding new feature work.
9. Keep archive available for rollback until the cutover window closes.
10. Delete archive and migration adapters after parity is confirmed.

## Rollback Strategy

Rollback is folder-level:

1. Move the failed canonical folder back to a quarantine path.
2. Restore archived canonical folder to its original path.
3. Restore workspace/package references if changed.
4. Run typecheck and target smoke tests.
5. Record the failed cutover reason in `ai/refactor-vnext/` before retrying.

## Validation Gates

Minimum gates before cutover:

```txt
pnpm governance:check
pnpm governance:file-shape
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Engine-specific cutover must also pass:

```txt
pnpm --filter @venus/engine test
pnpm --filter @venus/engine cr:check
pnpm --filter @venus/engine debug:guard
```

## Consequences

Positive:

- Enables destructive architecture work without repeatedly breaking canonical app paths.
- Preserves rollback safety during large folder moves.
- Keeps temporary naming out of the final package topology.
- Forces contract-first migration instead of speculative package scaffolding.

Negative:

- Requires duplicate staging/cutover discipline.
- Requires explicit parity tests before rename-back.
- Requires care to avoid workspace accidentally picking up incomplete packages.

## Open Questions

- Should `packages/_vnext/*` ever become workspace packages before cutover, or should integration always happen through explicit harness scripts?
- Where should old canonical folders be archived during cutover: `ai/archive/`, root `archive/`, or an external branch-only backup?
- Which parity scenario is mandatory for the first engine cutover: vector editor only, or vector + 3D + WebGPU fallback?

## Initial Action Items

- [ ] Create package ownership inventory for current `apps/*` and `packages/*`.
- [ ] Define engine vNext CHANGE REQUEST and parity matrix.
- [ ] Define runtime package public contract before extracting platform/runtime code.
- [ ] Define renderer backend contract before moving backend execution code.
- [ ] Decide archive location before the first rename-back cutover.
