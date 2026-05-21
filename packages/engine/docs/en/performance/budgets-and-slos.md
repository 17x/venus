# Budgets and SLOs

This page defines baseline performance contracts for integration and regression gates.

## Budget Domains

1. Frame budget (`frameBudgetMs`)
2. Spatial query budget (`queryBudgetMs`)
3. Upload budget (`uploadBudgetMs`)
4. Compile budget (`compileBudgetMs`)

## Suggested Default Targets

- Interactive frame: <= 16.7 ms (60 FPS target)
- Balanced frame: <= 33.3 ms
- Picking query p95: <= 4.0 ms (viewport-local)
- Command encoding p95: <= 3.0 ms

## Budget API Touchpoints

- `engine.setFrameBudget(budget)`
- `engine.capability.render.setFrameBudget(budget)`
- `engine.runtime.createRenderPlan({ frameBudgetMs })`

## SLO Reporting

Each regression report should include:

- p50/p95/p99 for frame and query time
- backend profile
- scene scale descriptors
- whether fallback occurred

## Gate Policy

A change fails performance gate when:

- p95 frame time regresses above configured threshold
- query latency exceeds budget for two consecutive runs
- fallback rate increases above baseline allowance
