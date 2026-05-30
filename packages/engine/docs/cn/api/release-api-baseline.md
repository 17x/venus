# 发布 API 基线

状态：Release candidate baseline。
范围：ENG-002。

本文定义 `@venus/engine` 第一个商用发布候选的文档基线。推荐的集成入口是 `createEngine(options)`，随后使用稳定 handle 命名空间：`engine.*`、`engine.runtime.*`、`engine.capability.*`、`engine.events.*`。

## 稳定消费者接口

- `createEngine(options)` 创建 engine handle。
- `engine.resize(width, height)` 使用数字宽高调整 surface。
- `engine.getView()` 返回当前视图状态。
- `engine.runtime.*` 负责 graph/document 编译与提交 API。
- `engine.capability.*` 负责可选运行时能力。
- `engine.events.*` 负责生命周期、诊断、渲染、回放、查询与资源事件。

## Internal-Adjacent 接口

来自 `backend`、`kernel`、`platform`、`orchestration`、`optimization` 的 layer-root 宽导出为了兼容性暂时保留，但不是推荐的 app consumer API。`createEngineProductAdapterBoundaryModule` 与 `createEnginePublicApiSurfaceModule` 这类治理 helper 属于发布治理接口，不是常规运行时集成 API。

## 消费者规则

应用必须只使用 package public exports。产品语义必须留在 app adapter 中，不能进入 engine API 名称。
