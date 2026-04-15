# Plan 2: Vector Capability Buildout (Execution Plan)

## Purpose

This file is an execution plan only.

- Keep durable architecture rules in `docs/architecture/*`
- Keep product requirements in `docs/product/*`
- Keep AI collaboration rules in `docs/ai/*`
- Keep decisions in `04_DECISIONS.md` and `docs/decisions/*`

## Confirmed Baseline

- Runtime chain remains:
  `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` ->
  `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`
- Layering policy remains:
  product behavior in app layer, runtime policy in runtime family,
  mechanism in engine.
- Current delivery focus remains vector capability completion.

## Workstreams

### W1 Runtime Structuring

- Continue decomposing runtime monolith paths
- Keep tool lifecycle, editing mode, command routing explicit
- Preserve public API stability where possible

### W2 Engine/Hit-Test Capability

- Continue multi-hit capability path
- Keep runtime as adaptation layer from engine candidates to product semantics

### W3 Product Capability Completion

- Continue vector capability priority:
  connector -> boolean
- Keep tool/shortcut/menu/property behavior aligned through shared command entry

### W4 Consistency And Regression

- Ensure history strategy consistency for new commands
- Track regression checks for selection, transform, hit-test, snapping, mask behavior

## Delivery Gates

### Architecture Gate

- No runtime/engine/app boundary violations
- No product policy pushed into engine
- No framework UI concerns pushed into framework-agnostic runtime core

### Product Gate

- Core workflows remain usable in `apps/vector-editor-web`
- Diagnostics behavior remains verifiable in `apps/playground`

### History Gate

- New commit-level features have clear history strategy
- Undo/redo behavior does not break selection/object consistency

### Engineering Gate

- No new type issues introduced by this workstream
- Validation scope is explicitly reported per batch

## Out Of Scope For This Plan File

The following details should not be expanded here:

- full PRD narrative
- full architecture narrative
- reusable prompt library content
- ADR-level rationale details

Route those updates to their canonical docs.

## Update Protocol

When this plan changes:

1. Update execution deltas in `06_TODO.md`
2. Update phase/blocker/next-step in `STATE.md`
3. If decisions changed, update `04_DECISIONS.md` and `docs/decisions/*`
4. If architecture boundaries changed, update `docs/architecture/*`
5. Add timeline summary in `05_CHANGELOG.md` only for meaningful changes
