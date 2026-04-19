# Vector Doc Separation Migration Plan

This file tracks recommended migration actions to separate monorepo-global docs from vector-specific docs.

## Classification Rules

1. Keep global docs global when they define cross-app or cross-package contracts.
2. Move docs to `docs/product/vector/` when content is actionable only for vector product work.
3. Split mixed docs: keep architecture principles globally, move vector execution details into vector docs.

## Recommended Actions

| Source Doc                                             | Current Classification                              | Action           | Target / Note                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/vector-editor-architecture.md`                   | mixed (architecture + vector implementation detail) | split            | Keep cross-layer contracts in `docs/architecture/*`; move vector product execution sections into a new vector doc.                               |
| `docs/apps-vector.md`                                  | vector-focused app doc                              | move             | Move to `docs/product/vector/apps-vector.md` and leave a short pointer in original location if needed.                                           |
| `docs/core/current-work.md`                            | mixed active tracker                                | split            | Keep monorepo queue globally; add vector-only execution stream under `docs/product/vector/current-work-vector.md`.                               |
| `docs/core/matrix-migration-checklist.md`              | mostly vector/runtime integration                   | copy-then-narrow | Create vector-oriented derivative checklist in `docs/product/vector/matrix-migration-vector-checklist.md`; keep global invariant source in core. |
| `docs/core/matrix-regression-scenarios.md`             | mixed shared + vector usage                         | split            | Keep shared invariant scenarios in core; add vector runbook in vector folder.                                                                    |
| `docs/product/figma-mapping.md`                        | product-level but multi-surface                     | split            | Keep cross-product mapping policy in place; create vector-specific mapping conventions in `docs/product/vector/figma-mapping-vector.md`.         |
| `docs/task/drafts/tri-block-vector-engine-dev-plan.md` | vector initiative plan                              | move             | Move under `docs/product/vector/plans/` for product-owned execution history.                                                                     |

## Suggested New Vector Docs

1. `docs/product/vector/current-work-vector.md`
2. `docs/product/vector/apps-vector.md`
3. `docs/product/vector/figma-mapping-vector.md`
4. `docs/product/vector/matrix-migration-vector-checklist.md`
5. `docs/product/vector/matrix-regression-vector-runbook.md`
6. `docs/product/vector/plans/tri-block-vector-engine-dev-plan.md`

## Migration Order

1. Create vector equivalents for mixed docs.
2. Backfill links from global docs to vector docs.
3. Remove duplicated vector-specific details from global docs after equivalence check.
4. Keep a one-line trace in global docs for discoverability.

## Definition Of Done

1. Global docs no longer contain vector-only operational detail blocks.
2. Vector product docs contain all actionable vector implementation guidance.
3. Navigation from `docs/index.md` and `docs/product/vector/index.md` resolves to the new locations.
4. No duplicate conflicting guidance remains between global and vector docs.
