# M1 核心链路回归清单（T9）

目标：

1. 固化 10 条关键链路回归脚本。
2. 每次迭代可重复执行。
3. 回归结论可追踪（R1-R10 编号）。

## 一键执行

```bash
pnpm regression:m1-core
```

## 回归链路清单（10 条）

1. R1 pointer 生命周期状态机
   - `src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
2. R2 编辑模式切换守卫
   - `src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
3. R3 命中优先级策略
   - `src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
4. R4 选择过滤策略
   - `src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
5. R5 pointer-up 预览/提交一致性
   - `src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts`
6. R6 吸附策略稳定性
   - `src/product/runtime/__tests__/runtimeSnappingPolicyBehavior.test.ts`
7. R7 交互诊断字段与完整率口径
   - `src/product/runtime/__tests__/runtimeInteractionDiagnosticPolicy.test.ts`
8. R8 样式控制拖拽解析一致性
   - `src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
9. R9 输入归一化事件链路
   - `src/runtime/events/index/index.test.ts`
10. R10 变换旋转会话行为

- `src/runtime/interaction/transformSessionRotation.test.ts`

## 结果规范

1. 脚本输出按 `[PASS]/[FAIL] + 编号 + 名称` 格式打印。
2. 末尾输出聚合摘要：`M1 core regression summary: x/10 passed`。
3. 任一失败时进程退出码非 0，便于 CI/本地 gate 统一接入。
