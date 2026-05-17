# 约束、校验与小范围重构清单

## 1. 硬约束

1. 严格遵守模块单向依赖。
2. engine 保持机制层，不吸收产品语义。
3. 禁止 `any`，公共接口显式契约。
4. 影响行为的字面量必须提取为命名常量。

## 2. 校验命令

合并前必须通过：

1. `pnpm --filter @venus/engine test`
2. `pnpm --filter @venus/engine exec tsc --noEmit` 或等价 typecheck
3. `pnpm lint`

## 3. 跨模块重构检查项

1. 确认未引入反向依赖。
2. 变更 planning/shortlist 时保持 scene/store/index 不变量。
3. 保证 renderer 回退分支与 fallback taxonomy 对齐。
4. strategy/scheduler/budget/cache 改动必须补测试。
5. 渲染路径改动后重查 blank-frame 与 sharpen-SLA 诊断。

## 4. 当前一致性评估（2026-05）

1. 模块所有权图基本符合限制文档。
2. runtime/renderer 策略体系完整但学习成本高，本文档用于降低接入成本。
3. 最高运行风险仍在交互回退一致性（黑屏、边缘断层、停手清晰度恢复时序）。

## 5. 小范围重构建议

优先做低风险收敛：

1. 将分支特化回退逻辑沉入已有域模块，减少编排器复杂度。
2. 合并重复阈值常量，统一配置来源。
3. 在扩大算法改动前先补强诊断与守卫覆盖。
