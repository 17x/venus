# Engine 测试系统

## 范围

本文件定义 engine 内部测试系统基线。

策略：

- Engine 测试门禁不得依赖外部应用环境检查。
- `@venus/vector-editor-web` typecheck 不再作为 engine 测试守卫。
- Engine 测试编排由 `packages/engine/ai/engine-test-system-manifest-2026-05-23.json` 驱动。

## 必需测试类型

1. Unit Test
2. Regression Test
3. Rendering Snapshot Test
4. Performance Benchmark
5. Interaction Test
6. Stress Test
7. Visual Regression Test
8. E2E Test
9. Fuzz Test
10. Deterministic Test

## 场景覆盖基线

场景编号 S1-S13 在清单中均有映射，每个场景必须覆盖一个或多个必需测试类型。

## 验证

执行：

- `pnpm --filter @venus/engine typecheck`
- `pnpm --filter @venus/engine test`
- `pnpm --filter @venus/engine run cr:check`

Engine 内部守卫测试：

- `node --import tsx --test src/testing/engineTestSystemCoverage.contract.test.mjs`
