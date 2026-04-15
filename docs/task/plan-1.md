# Plan 1: Layering Foundation (Execution Plan)

## Purpose

This file tracks execution-level work only.

- Durable architecture rules -> `docs/architecture/*`
- Product requirement details -> `docs/product/*`
- AI workflow and capture rules -> `docs/ai/*`
- Confirmed decisions -> `04_DECISIONS.md` and `docs/decisions/*`

## Scope

Plan 1 focuses on establishing and preserving the three-layer foundation:

`vector -> runtime -> engine`

## Execution Tracks

### T1 Boundary Guardrails

- Keep product behavior in app layer
- Keep reusable policy and command routing in runtime layer
- Keep rendering/query mechanism in engine layer

### T2 Runtime Surface Stability

- Preserve stable runtime-facing APIs for app integration
- Prevent framework UI coupling from leaking into framework-agnostic runtime

### T3 Product Integration Discipline

- Keep product entrypoints (toolbar/menu/shortcut/panel) unified through
  runtime command paths
- Avoid app-local bypasses that mutate engine internals directly

### T4 Verification Discipline

- Keep architecture-sensitive changes verified in both active app surfaces
- Report validation scope and gaps explicitly

## Exit Criteria

- No architecture boundary violations introduced by this plan batch
- Runtime chain remains intact and documented
- Integration behavior is verifiable on both `vector-editor-web` and `playground`

## Update Protocol

When this plan changes:

1. Sync concise status delta to `STATE.md`
2. Sync execution delta to `06_TODO.md`
3. If decisions changed, update `04_DECISIONS.md` and ADR docs
4. If architecture boundaries changed, update `docs/architecture/*`
5. Log meaningful timeline updates in `05_CHANGELOG.md`
