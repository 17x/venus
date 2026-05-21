# Capability API 参考（`engine.capability.*`）

Capability API 是产品场景组合所依赖的唯一“场景无关能力面”。

## 范围说明

本页采用分阶段口径：

1. `已实现`：当前已在 `EngineHandle.capability` 暴露的接口。
2. `规划能力包`：Full Surface 清单中的路线锚点。

级别：`advanced`
稳定性：`beta`

## 已实现接口

### engine.capability.spatial.query(query)

```ts
engine.capability.spatial.query(query: EngineQueryBoundsInput): EngineQueryResult
```

输入契约：

- `query.x`
- `query.y`
- `query.width`
- `query.height`

确定性：

- 在相同图状态与相同查询边界下，`nodeIds` 顺序保持稳定。

### engine.capability.picking.pick(point, options)

```ts
engine.capability.picking.pick(point: EnginePickPointInput, options?: EnginePickOptions): EnginePickResult
```

输出契约：

- 返回有序 `hits` 列表（`id`、`rank`），按优先级由高到低。

### engine.capability.picking.raycast(ray, options)

```ts
engine.capability.picking.raycast(ray: EngineRayInput, options?: EngineRaycastOptions): EngineRaycastHit | null
```

Ray 输入字段：

- `originX`、`originY`、`originZ`
- `directionX`、`directionY`、`directionZ`

### engine.capability.diagnostics.getSummary()

```ts
engine.capability.diagnostics.getSummary(): EngineDiagnosticsSnapshot
```

该摘要与 `engine.getDiagnostics()` 的公共诊断结构保持一致。

### engine.capability.replay.createToken(scope)

```ts
engine.capability.replay.createToken(scope: string): EngineRuntimeReplayTokenOutput
```

### engine.capability.replay.validateToken(token)

```ts
engine.capability.replay.validateToken(token: string): { valid: boolean }
```

### engine.capability.replay.run(token)

```ts
engine.capability.replay.run(token: string): EngineRuntimeReplayOutput
```

### engine.capability.replay.export(token)

```ts
engine.capability.replay.export(token: string): { token: string; accepted: boolean }
```

## 规划能力包（路线锚点）

以下能力包已在 Full Surface 规划中定义，当前作为路线锚点持续跟踪：

- geometry
- view
- overlay/annotation
- timeline
- simulation
- resource/streaming
- render/composition
- gpu
- backend/session
- field
- geo
- media
- collaboration

代表性路线锚点示例：

- `engine.capability.geometry.setModel(model)`
- `engine.capability.view.setCamera(camera)`
- `engine.capability.render.renderFrame(request)`
- `engine.capability.replay.run(token)`

## Capability API 治理规则

1. 能力包命名固定且语义中立。
2. 禁止在公共 API 名称中引入产品名词。
3. 新增能力接口必须同步 EN/CN 文档与 contract 测试。
