# 3D 优先运行时与 2D 显式启用

状态：Release contract。
范围：ENG-003。

`@venus/engine` 默认是 3D-first。消费者可以通过显式 adapter path 投影 2D 文档，但默认 engine 创建流程不能依赖 Canvas2D 产品运行时或 vector-editor 语义。

## 默认规则

- 默认 runtime profile 是通用且具备 3D 能力的。
- 2D 渲染、vector 编辑、Canvas2D fallback 都必须是显式启用或降级 backend path。
- vector、SVG、CAD、BIM、medical、video 等产品词汇必须留在 app adapter 和 core engine contract 之外的示例文档中。

## 允许的 2D 接口

2D payload 只能出现在被批准的 opt-in surface 中，例如显式 Canvas2D draw payload contract。它不能成为 `CreateEngineOptions` 的必填字段。

## 验证

发布验证必须保留 contract tests，证明默认 `createEngine` 不暴露强制 Canvas2D hook wiring，且 top-level 2D exports 仍然只来自显式批准项。
