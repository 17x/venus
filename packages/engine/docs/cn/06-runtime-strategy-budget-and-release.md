# Runtime 策略、预算与发布契约

## 1. 域目标

runtime 是编排中心，把 scene + interaction + renderer 组合成稳定可观测的帧行为。

## 2. 核心区域

1. `runtime/createEngine`

- 引擎组装入口与生命周期控制。

2. `runtime/createEngineLoop`

- 循环驱动与 render 触发语义。

3. `runtime/renderScheduler`

- 请求合并与策略调度。

4. `runtime/strategy`

- 阶段识别、收敛策略、退化梯度、QoS 决策。

5. `runtime/budget`

- 压力采样、GPU 上传代理、worker 预算代理。

6. `runtime/policy`

- profile/scaler/scenario/camera/cache 等策略包。

7. `runtime/diagnostics`

- deterministic、blank-frame、sharpen-SLA、memory/cache、regression 诊断。

8. `runtime/release`

- phase gate、readiness、runbook、rollout 等发布治理契约。

9. `runtime/bridge`

- runtime 与 renderer 分层桥接兼容。

## 3. Strategy 到 Render 契约

1. runtime 解析 phase 与 budget。
2. 将上下文写入 renderer frame context。
3. renderer 返回 stats 与 fallback taxonomy。
4. runtime 更新诊断结果与发布门禁信号。

## 4. 运行限制

1. runtime 负责编排，不重写 renderer 内部算法。
2. policy 模块保持确定性与契约化。
3. release 契约是治理检查，不直接持有 draw path。

## 5. 与 settings 的关系

`settings/*` 提供默认 bundle 与迁移兼容能力，覆盖：

1. graphics/performance 基线。
2. preset/profile 选择。
3. runtime budget 与 diagnostics 默认值。

runtime 应消费归一化后的 settings 快照，避免散落策略字面量。
