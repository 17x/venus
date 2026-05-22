# Repo Baseline Freeze Inventory (R0)

Date: 2026-05-21
Scope: `ai/refactor-vnext/repo-refactor-management.md` Phase R0 checklist

## 1. Package Ownership Inventory

Apps:

1. `apps/flowchart`
2. `apps/mindmap-editor`
3. `apps/playground`
4. `apps/streamline-editor`
5. `apps/vector-editor-web`
6. `apps/whiteboard`

Packages:

1. `packages/_vnext`
2. `packages/editor-primitive`
3. `packages/engine`
4. `packages/engine-legacy`
5. `packages/lib`

Ownership baseline (from monorepo governance):

1. App layer: product UI/composition and app adapters.
2. `@venus/editor-primitive`: editor interaction primitives only.
3. `@venus/engine`: runtime/API facade and engine internal execution.
4. `@venus/lib`: shared foundational utilities.

## 2. Future DAG Violation Scan (R0 snapshot)

Checked patterns:

1. package code importing `apps/*`
2. non-engine packages importing `@venus/engine/src/*` private paths
3. `packages/editor-primitive` importing `@venus/engine`

Result:

1. No matches found for the three violation classes above.

## 3. Stable Modules During vNext Build

Freeze candidates:

1. `docs/MONOREPO_RESPONSIBILITY_STANDARD.md` (governance DAG source of truth)
2. `packages/lib` public utility surface
3. `packages/engine/src/core` public contract semantics
4. `packages/editor-primitive` package boundary (must not depend on engine)
5. `apps/vector-editor-web` app assembly boundary and adapter wiring

## 4. Cutover Branch Policy and Rollback Location

Policy:

1. Keep active work on vNext staging paths; avoid destructive rename operations before parity gate passes.
2. Use non-interactive validation gates before each cutover wave: typecheck/test/cr-check.
3. Freeze writes to old package folders once cutover wave starts.

Rollback location:

1. Move old folders to `archive/refactor-cutover-YYYY-MM-DD/` as rollback snapshot authority.

## 5. ADR Linkage (R0)

1. Staging and rename-back cutover ADR exists:
   - `ai/refactor-vnext/adr-vnext-staging-and-cutover.md`
