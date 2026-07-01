# Vector2D Render Parity PR-Required Migration Checklist

Date: 2026-06-09
Owner scope: Vector2D product-side CI/release readiness
Engine boundary: This checklist does not change Engine public API, backend contract, or 3D/product-neutral semantics.

## Goal

Promote the capture-backed render parity evidence flow from advisory/manual observation to PR-required status only after release owners have enough stability evidence that the browser-capture path is reliable, fast enough, and actionable.

## Current State

- PRs run the lightweight replay strict gate as a blocking check.
- Manual `workflow_dispatch` runs the full capture replay release gate and uploads JSON/PNG evidence.
- Manual workflow can optionally enforce `report:render-parity-capture-release-gate-stability:gate` through `enforce-capture-promotion-gate`.
- PRs expose `render-parity-capture-promotion-dry-run` as a non-blocking advisory job.
- Stability reports emit `promotionGateStatus`, `prRequiredRolloutRecommendation`, and `prRequiredRolloutReasons`.

## Migration Criteria

A release owner may propose making capture promotion PR-required only when all criteria below are true:

- At least 5 manual capture release runs exist in `capture-release-gate.stability.json`.
- `prRequiredRolloutRecommendation` is `ready-for-pr-required` for at least 2 consecutive release cycles.
- `passRatePercent` is 100 across the observed window.
- `failCount` is 0 across the observed window.
- `frameArtifactIssueCount` is 0 across the observed window.
- `maxDurationMs` is <= 90000 in the observed window.
- The non-blocking PR dry-run summary is visible on PRs and has no persistent `observation-missing` warnings.
- Release owners have inspected uploaded JSON/PNG evidence for at least one successful manual run after the latest rendering/runtime change.
- Any failure code observed during the window has an owner and a documented resolution before promotion.

## Owner Checklist

Before enabling PR-required status:

- Run manual `Render Parity Strict Gate` workflow with `enforce-capture-promotion-gate=false` until the stability report has at least 5 runs.
- Run the same workflow with `enforce-capture-promotion-gate=true` at least once after the report is ready.
- Confirm `promotionGateStatus` is `pass`.
- Confirm `prRequiredRolloutRecommendation` is `ready-for-pr-required`.
- Confirm PR dry-run summary reports `dryRunStatus: evaluated`.
- Confirm PR dry-run summary reports `blocking: false` before branch protection changes.
- Confirm no product semantics were added to Engine API or Engine docs as part of this rollout.
- Update `.ai-tasks/vector-editor/vector2d-consistency-execution-roadmap-2026-06-06.md` with the promotion decision.
- Update `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md` with final validation evidence.
- If branch protection is changed outside the repository, record the exact date, required check name, and owner in this checklist.
- Fill `.ai-tasks/vector-editor/vector2d-render-parity-pr-required-promotion-decision-record-2026-06-09.md`
  before changing branch protection.

## Rollback Criteria

After promotion, revert capture promotion from PR-required to advisory/manual if any condition below occurs:

- Two consecutive PRs fail only because of infrastructure/browser-capture instability.
- `maxDurationMs` exceeds 120000 for two consecutive release cycles.
- `frameArtifactIssueCount` becomes greater than 0 without a same-day owner.
- The dry-run or required check produces missing evidence after a workflow or path refactor.
- A release owner determines the check blocks unrelated product work without actionable diagnostics.

## Required Check Candidate

Recommended check name when branch protection is updated:

`render-parity-capture-promotion-dry-run`

Do not make the full browser capture release job PR-required until there is a separate decision to accept its runtime and flake profile. The dry-run job is the first branch-protection handoff candidate because it is lightweight and non-browser-based.

## Decision Record

Promotion status and final owner sign-off must be tracked in:

`.ai-tasks/vector-editor/vector2d-render-parity-pr-required-promotion-decision-record-2026-06-09.md`

## Validation Commands

Use these before changing branch protection:

```sh
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/rendering/render-parity-capture-release-gate-stability.contract.test.ts src/testing/product-specs/rendering/render-parity-runtime-capture-replay-gate.contract.test.ts src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.scripts.contract.test.ts
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit --pretty false
git diff --check
```
