# Renderer 与 GPU 渲染管线

## 1. 域目标

renderer 将 scene 计划转换为稳定帧输出，并在策略约束下完成回退与缓存控制。

## 2. 模块族

1. 计划与实例化

- `renderer/plan`、`renderer/instances`、`renderer/shared`。

2. 回退分类与诊断

- `renderer/fallbackTaxonomy`。

3. tile 子系统

- `renderer/tileManager`、`renderer/tileScheduler`、`renderer/interactionPredictiveTiles`。

4. 管线契约

- `renderer/pipeline`、`renderer/types`。

5. WebGL 执行栈

- `renderer/webgl` 编排器及 capability 模块。
- `renderer/webglComposite` 复合路径。
- `renderer/webglInteractionPreview` snapshot 复用路径。

6. WebGPU/Canvas 路径

- `renderer/webgpu`、`renderer/canvas2d`。

7. 分层/相机/命中/缓存辅助

- `renderer/layers`、`renderer/camera`、`renderer/hit`、`renderer/cache`。

## 3. 高层渲染流程

1. 构建 plan 与 packet/instance 视图。
2. 选择 preview/tile/model-complete/packet 回退路径。
3. 在预算和压力约束下执行上传与 draw submit。
4. 执行 overlay pass 并输出统计和 fallback 原因。

## 4. 限制与治理

1. WebGL 编排器与 capability 模块保持解耦。
2. helper/resource 模块禁止反向依赖编排器。
3. 缓存复用必须校验一致性因素。
4. 非空场景下的空帧必须触发安全回退。

## 5. 当前稳定性聚焦

1. 所有分支都要防黑屏。
2. overscan 需在 tile 与候选提取链路保持一致。
3. snapshot 复用与交互卡顿需要平衡。
4. zoom 停止后必须尽快恢复 full 细节帧。
