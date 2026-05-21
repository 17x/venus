# 架构与边界

## 目标

构建 state-driven、API-first、renderer-decoupled 的 runtime 系统。

## 标准数据流

`document -> compiler -> runtime world -> render plan -> command buffer -> backend submit`

禁止从上游层反向依赖产品/领域状态。

## 边界规则

1. engine core 不承载产品 command/history/undo/redo/collaboration 状态仓。
2. 产品语义在 app/domain adapter 中完成转换。
3. engine 仅消费规范化 graph/change set 与 view/interaction 请求。

## 后端模型

后端包括：

- WebGPU
- WebGL
- Canvas2D
- Headless

应用层不应分支依赖后端实现细节。
行为差异通过 capability probe 与 diagnostics 暴露。

## 确定性子系统

必须保证确定性的域：

- timeline
- simulation step
- replay
- 等价 plan 的命令序

## 可靠性设计

- dirty 传播与编译调度是显式状态。
- fallback 行为可通过事件与诊断观测。
- frame capture 与 replay 是一等能力。
