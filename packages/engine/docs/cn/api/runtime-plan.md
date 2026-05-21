# Runtime Plan API

状态：beta
层级：foundation

## 接口

1. `engine.runtime.plan.createFramePlan(request)`
2. `engine.runtime.plan.createVisibilityPlan(request)`
3. `engine.runtime.plan.createLodPlan(request)`
4. `engine.runtime.plan.createRoiPlan(request)`
5. `engine.runtime.plan.createBudgetPlan(request)`
6. `engine.runtime.plan.inspect(plan)`

## 错误码

1. `ENGINE_PLAN_INVALID_REQUEST`
2. `ENGINE_PLAN_INSPECT_INVALID`

## 确定性

在相同输入与相同 runtime 帧状态下，plan 输出保持确定性。
