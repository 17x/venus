# 基础模块

## 1. 目标

基础模块提供可复用原语，必须保持对 renderer/runtime 策略无反向依赖。

## 2. 模块拆解

1. `math`

- 矩阵、向量、维度与投影契约。

2. `geometry`

- 几何和边界计算原语。

3. `time`

- 时钟抽象，支持可测试、可复现的调度。

4. `utils`

- 通用基础工具与断言。

5. `types`

- 跨模块复用的数据契约片段。

6. `transform`

- 变换组合与适配原语。

7. `camera`

- 相机姿态与投影契约。

8. `material` 与 `lighting`

- 材质与光照描述契约。

9. `resource` 与 `assets`

- 资源加载与资产支撑原语。

10. `platform`

- 环境能力归一化与宿主抽象。

11. `animation`

- 机制级动画控制器与缓动函数。

## 3. 关联关系

1. scene 依赖 math/geometry/time 执行 bounds 与索引更新。
2. interaction 依赖 math/transform/camera 完成交互数学。
3. renderer 依赖基础契约，但不应把策略逻辑反向下沉到基础层。
4. runtime 应通过域接口消费基础能力，不绕过所有权边界。

## 4. 限制

1. 基础模块禁止依赖 renderer/runtime/worker。
2. 基础类型中禁止混入产品语义字段。
3. 影响行为的阈值常量必须命名、可追溯。

## 5. 校验重点

1. 检查是否引入反向依赖。
2. 几何相关改动需回归 hit-test 与渲染测试。
3. 对外导出契约变更必须显式说明。
