# Vector2D Render Parity PR-Required Promotion Decision Record

Date: 2026-06-09
Status: not-enabled
Owner scope: Vector2D product-side CI/release readiness
Engine boundary: This decision record does not change Engine public API, backend contract, or 3D/product-neutral semantics.

## Decision Summary

The capture promotion check is not PR-required yet. The current PR workflow exposes `render-parity-capture-promotion-dry-run` as a non-blocking advisory handoff. Release owners must fill this record before changing branch protection or making any capture promotion check required.

## Required Check Candidate

- Candidate check name: `render-parity-capture-promotion-dry-run`
- Candidate mode today: advisory dry-run
- Candidate blocking status today: false
- Full browser capture release job required today: false

## Evidence Window

Fill before promotion:

- Evidence window start: TBD
- Evidence window end: TBD
- Manual capture release run count: TBD
- Consecutive ready release cycles: TBD
- Latest `promotionGateStatus`: TBD
- Latest `prRequiredRolloutRecommendation`: TBD
- Latest `passRatePercent`: TBD
- Latest `failCount`: TBD
- Latest `frameArtifactIssueCount`: TBD
- Latest `maxDurationMs`: TBD
- Stability report path: `apps/vector-editor-web/docs/product-requirements/render-parity-reports/capture-release-gate.stability.json`
- Evidence artifact workflow run URLs: TBD

## Owner Sign-Off

Fill before promotion:

- Release owner: TBD
- CI owner: TBD
- Rollback owner: TBD
- Engine boundary reviewer: TBD
- Approval date: TBD

## Branch Protection Change Record

Fill only if branch protection is changed outside the repository:

- Branch protection changed: no
- Changed at: TBD
- Changed by: TBD
- Required check name added: TBD
- Rollback procedure confirmed: TBD

## Promotion Preconditions

All items must be true before changing branch protection:

- Migration checklist criteria are satisfied.
- `prRequiredRolloutRecommendation` is `ready-for-pr-required` for at least 2 consecutive release cycles.
- PR dry-run summary reports `dryRunStatus: evaluated`.
- PR dry-run summary reports `blocking: false` before branch protection changes.
- Manual workflow has passed once with `enforce-capture-promotion-gate=true` after the evidence window is ready.
- Uploaded JSON/PNG evidence was inspected after the latest render/runtime change.
- No Engine public API, backend contract, or product-neutral docs were changed for this promotion.

## Rollback Owner Notes

Record rollback action here if the check is ever promoted and later reverted:

- Rollback date: TBD
- Rollback owner: TBD
- Triggering condition: TBD
- Required check removed: TBD
- Follow-up issue/PR: TBD

## Linked Documents

- `.ai-tasks/vector-editor/vector2d-render-parity-pr-required-migration-checklist-2026-06-09.md`
- `.ai-tasks/vector-editor/vector2d-consistency-execution-roadmap-2026-06-06.md`
- `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md`
- `.ai-tasks/engine/engine-requirements-simplified-and-gap-check-2026-06-01.md`

## Validation Commands

```sh
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/rendering/render-parity-capture-release-gate-stability.contract.test.ts src/testing/product-specs/rendering/render-parity-runtime-capture-replay-gate.contract.test.ts src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.scripts.contract.test.ts
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit --pretty false
git diff --check
```
