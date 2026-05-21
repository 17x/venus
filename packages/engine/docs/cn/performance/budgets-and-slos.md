# 预算与 SLO

本页定义集成与回归门禁的基础性能契约。

## 预算域

1. 帧预算（`frameBudgetMs`）
2. 空间查询预算（`queryBudgetMs`）
3. 上传预算（`uploadBudgetMs`）
4. 编译预算（`compileBudgetMs`）

## 建议默认目标

- 交互帧：<= 16.7 ms（60 FPS 目标）
- 平衡帧：<= 33.3 ms
- picking 查询 p95：<= 4.0 ms（视口内）
- 命令编码 p95：<= 3.0 ms

## 预算相关 API

- `engine.setFrameBudget(budget)`
- `engine.capability.render.setFrameBudget(budget)`
- `engine.runtime.createRenderPlan({ frameBudgetMs })`

## SLO 报告要求

每次回归报告应包含：

- 帧时长和查询时长的 p50/p95/p99
- 后端 profile
- 场景规模描述
- 是否发生 fallback

## 门禁策略

出现以下任一条件视为性能门禁失败：

- p95 帧时长超过阈值并回退失败
- 查询延迟连续两轮超预算
- fallback 比率超过基线容忍区间
