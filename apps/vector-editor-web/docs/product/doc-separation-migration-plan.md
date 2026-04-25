# Vector Doc Separation Migration Plan

This file tracks recommended migration actions to separate monorepo-global
docs from vector-specific docs.

## Classification Rules

1. Keep global docs global when they define cross-app or cross-package
   contracts.
2. Move docs next to `apps/vector-editor-web` when content is actionable only
   for vector product work.
3. Split mixed docs: keep architecture principles globally, move vector
   execution details into vector docs.

## Recommended Actions

| Source Doc                                             | Current Classification                              | Action           | Target / Note                                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/vector-editor-architecture.md`                   | mixed (architecture + vector implementation detail) | completed        | Moved out of global `docs/`; vector-specific guidance now lives in `apps/vector-editor-web/docs/architecture.md`.                                        |
| `docs/apps-vector.md`                                  | vector-focused app doc                              | completed        | Replaced by app-local vector documentation under `apps/vector-editor-web/docs/architecture.md` and `apps/vector-editor-web/README.md`.                  |
| `docs/core/current-work.md`                            | mixed active tracker                                | split            | Keep monorepo queue globally; add vector-only execution stream under `apps/vector-editor-web/docs/product/current-work-vector.md`.                       |
| `docs/core/matrix-migration-checklist.md`              | mostly vector/runtime integration                   | copy-then-narrow | Create vector-oriented derivative checklist in `apps/vector-editor-web/docs/product/matrix-migration-vector-checklist.md`; keep global invariant source. |
| `docs/core/matrix-regression-scenarios.md`             | mixed shared + vector usage                         | split            | Keep shared invariant scenarios in core; add vector runbook in app-local product docs.                                                                    |
| `docs/product/figma-mapping.md`                        | product-level but multi-surface                     | split            | Keep cross-product mapping policy in place; create vector-specific mapping conventions in app-local product docs.                                         |
| `docs/task/drafts/tri-block-vector-engine-dev-plan.md` | vector initiative plan                              | move             | Move under `apps/vector-editor-web/docs/product/plans/` for product-owned execution history.                                                             |

## Suggested New Vector Docs

1. `apps/vector-editor-web/docs/architecture.md`
2. `apps/vector-editor-web/docs/product/current-work-vector.md`
3. `apps/vector-editor-web/docs/product/figma-mapping-vector.md`
4. `apps/vector-editor-web/docs/product/matrix-migration-vector-checklist.md`
5. `apps/vector-editor-web/docs/product/matrix-regression-vector-runbook.md`
6. `apps/vector-editor-web/docs/product/plans/tri-block-vector-engine-dev-plan.md`

## Migration Order

1. Create vector equivalents for mixed docs.
2. Backfill links from global docs to vector docs.
3. Remove duplicated vector-specific details from global docs after equivalence
   check.
4. Keep navigation-only traces in global docs for discoverability.

## Definition Of Done

1. Global docs no longer contain vector-only operational detail blocks.
2. Vector product docs contain all actionable vector implementation guidance.
3. Navigation from `docs/index.md` and
   `apps/vector-editor-web/docs/product/index.md` resolves to the new
   locations.
4. No duplicate conflicting guidance remains between global and vector docs.