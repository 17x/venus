# Runtime Plan API

Status: beta
Level: foundation

## Endpoints

1. `engine.runtime.plan.createFramePlan(request)`
2. `engine.runtime.plan.createVisibilityPlan(request)`
3. `engine.runtime.plan.createLodPlan(request)`
4. `engine.runtime.plan.createRoiPlan(request)`
5. `engine.runtime.plan.createBudgetPlan(request)`
6. `engine.runtime.plan.inspect(plan)`

## Error Codes

1. `ENGINE_PLAN_INVALID_REQUEST`
2. `ENGINE_PLAN_INSPECT_INVALID`

## Determinism

For identical inputs and runtime frame state, plan outputs are deterministic.
