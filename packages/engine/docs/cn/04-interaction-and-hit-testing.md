# 交互与命中测试

## 1. 域目标

interaction 提供机制算法：viewport 变化、吸附、变换、命中 refine。

## 2. 核心模块

1. `interaction/viewport`、`interaction/viewportPan`、`interaction/zoom`

- viewport 数学、平移与缩放会话。

2. `interaction/hitTest`、`interaction/hitTolerance`

- 命中 refine 与容差策略。

3. `interaction/shapeTransform`

- 图形变换与会话辅助。

4. `interaction/snapping`

- 几何吸附原语。

5. `interaction/geometryPayload`

- overlay/交互可视化几何负载。

6. `interaction/lodProfile`、`interaction/lodConfig`、`interaction/lodTypes`、`interaction/visibilityLod`

- 交互阶段质量退化与 LOD 配置。

7. `interaction/overlayCanvas`

- 机制级 overlay 绘制契约，不是产品 UI 状态机。

## 3. 与 runtime/renderer 关系

1. runtime 根据交互阶段决策 strategy 与预算。
2. renderer 基于 runtime 上下文执行质量路径。
3. interaction 不负责调度策略与后端选择。

## 4. 约束点

1. zoom 停止后清晰帧恢复依赖 settling 策略与 renderer full 路径补帧。
2. 高速 pan/zoom 必须保证 anchor 与矩阵计算稳定。
3. 命中容差策略应保持声明式，不吸收产品语义。

## 5. 测试重点

1. viewport 回归测试（pan/zoom 不变量）。
2. 几何命中边界案例（细线、变换、裁剪）。
3. 交互 LOD 在压力与极端缩放下的过渡。
