# Developer API 参考（`engine.*`）

稳定性目标：核心生命周期与渲染控制 API 为 `stable`。
受众：业务应用与 adapter 开发者。

## createEngine(options)

级别：`developer`
稳定性：`stable`

签名：

```ts
createEngine(options: EngineCreateOptions): EngineHandle
```

参数：

| 名称                         | 类型                                                        | 必填 | 说明                   | 约束              |
| ---------------------------- | ----------------------------------------------------------- | ---- | ---------------------- | ----------------- |
| `options.backendPreference`  | `'auto' \| 'webgpu' \| 'webgl' \| 'canvas2d' \| 'headless'` | 否   | 后端偏好策略           | 默认 `'auto'`     |
| `options.diagnosticsEnabled` | `boolean`                                                   | 否   | 开启指标/追踪/抓帧能力 | 默认 `false`      |
| `options.qualityProfile`     | `'interactive' \| 'balanced' \| 'quality' \| 'headless'`    | 否   | 初始质量策略           | 默认 `'balanced'` |

返回：

- `EngineHandle`

错误：

- `E_BACKEND_UNAVAILABLE`
- `E_INVALID_ARGUMENT`

关联事件：

- `engine.lifecycle.ready`
- `engine.render.backendSwitched`

## 硬切 Runtime Bridge 对齐（2026-05-21）

`createEngine` 返回的 `EngineHandle` 已直接提供 runtime bridge 所需 P0 能力：

```ts
engine.setGraph(graph: EngineGraphInput): void
engine.updateGraph(patch: EngineGraphPatchInput): void
engine.render(): Promise<{ drawCount: number; visibleCount: number; frameMs: number }>
engine.setView(view: EngineViewInput): EngineViewSnapshot
engine.setOverlays(overlays: readonly unknown[]): void
engine.invalidate(input?: EngineInvalidateInput): void
engine.getDiagnostics(): EngineDiagnosticsSnapshot
```

硬切模式下不再保留迁移别名，请只使用 canonical API。

## engine.mount(target)

级别：`developer`
稳定性：`stable`

签名：

```ts
engine.mount(target: MountTarget): Promise<void>
```

参数：

| 名称             | 类型                                    | 必填     | 说明                      | 约束                            |
| ---------------- | --------------------------------------- | -------- | ------------------------- | ------------------------------- |
| `target.kind`    | `'canvas' \| 'offscreen' \| 'headless'` | 是       | 渲染会话的 surface 类型   | 必须与后端能力匹配              |
| `target.surface` | `HTMLCanvasElement \| OffscreenCanvas`  | 条件必填 | 浏览器会话的 surface 对象 | 当 `kind !== 'headless'` 时必填 |
| `target.size`    | `{ width: number; height: number }`     | 否       | 初始视口尺寸              | 正整数                          |

错误：

- `E_INVALID_ARGUMENT`
- `E_UNSUPPORTED_CAPABILITY`

## engine.setGraph(graph)

级别：`developer`
稳定性：`beta`

签名：

```ts
engine.setGraph(graph: EngineGraph): Promise<GraphSetResult>
```

参数：

| 名称    | 类型          | 必填 | 说明                      | 约束                 |
| ------- | ------------- | ---- | ------------------------- | -------------------- |
| `graph` | `EngineGraph` | 是   | 规范化 runtime 图全量输入 | 必须通过 schema 校验 |

返回：

- `GraphSetResult`，包含 `revision`、`nodeCount`、`warnings`

错误：

- `E_SCHEMA_VALIDATION_FAILED`

关联事件：

- `engine.document.beforeSetGraph`
- `engine.document.graphSet`

## engine.updateGraph(patch)

级别：`developer`
稳定性：`beta`

签名：

```ts
engine.updateGraph(patch: EngineGraphPatch): Promise<GraphPatchResult>
```

参数：

| 名称                 | 类型                     | 必填 | 说明                    | 约束                           |
| -------------------- | ------------------------ | ---- | ----------------------- | ------------------------------ |
| `patch.baseRevision` | `string`                 | 是   | patch 期望基线 revision | 必须匹配当前 revision 或可重放 |
| `patch.operations`   | `EnginePatchOperation[]` | 是   | 增删改操作集合          | 不可为空                       |

返回：

- `GraphPatchResult`，包含 `newRevision`、`appliedCount`、`conflicts`

错误：

- `E_SCHEMA_VALIDATION_FAILED`
- `E_OPERATION_TIMEOUT`

## engine.render()

级别：`developer`
稳定性：`stable`

签名：

```ts
engine.render(): Promise<FrameResult>
```

返回：

- `FrameResult`，包含 `frameId`、`cpuTimeMs`、`gpuTimeMs?`、`fallbackInfo`

错误：

- `E_BUDGET_EXCEEDED`
- `E_INTERNAL_INVARIANT_BROKEN`

关联事件：

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.render.frameFailed`

## engine.pick(point, options)

级别：`developer`
稳定性：`stable`

签名：

```ts
engine.pick(point: ScreenPoint, options?: PickOptions): Promise<PickHit[]>
```

参数：

| 名称            | 类型             | 必填 | 说明           | 约束             |
| --------------- | ---------------- | ---- | -------------- | ---------------- |
| `point.x`       | `number`         | 是   | 屏幕坐标 X     | 必须在视口范围内 |
| `point.y`       | `number`         | 是   | 屏幕坐标 Y     | 必须在视口范围内 |
| `options.mode`  | `'top' \| 'all'` | 否   | 命中聚合模式   | 默认 `'top'`     |
| `options.limit` | `number`         | 否   | 最大返回命中数 | 正整数           |

返回：

- 按稳定 score 顺序返回 `PickHit[]`

错误：

- `E_INVALID_ARGUMENT`

关联事件：

- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`

## engine.setOverlays(overlays)

级别：`developer`
稳定性：`stable`

签名：

```ts
engine.setOverlays(overlays: OverlayItem[]): Promise<OverlayApplyResult>
```

参数：

| 名称       | 类型            | 必填 | 说明             | 约束                                  |
| ---------- | --------------- | ---- | ---------------- | ------------------------------------- |
| `overlays` | `OverlayItem[]` | 是   | overlay 全量状态 | 每项必须包含 `id`、`kind`、`sourceId` |

返回：

- `OverlayApplyResult`，包含 `revision` 与 `acceptedCount`

错误：

- `E_SCHEMA_VALIDATION_FAILED`

## engine.captureImage(options)

级别：`developer`
稳定性：`beta`

签名：

```ts
engine.captureImage(options?: CaptureImageOptions): Promise<CaptureImageResult>
```

参数：

| 名称              | 类型                        | 必填 | 说明     | 约束                   |
| ----------------- | --------------------------- | ---- | -------- | ---------------------- |
| `options.format`  | `'png' \| 'jpeg' \| 'webp'` | 否   | 输出格式 | 默认 `'png'`           |
| `options.quality` | `number`                    | 否   | 压缩质量 | `0..1`，仅有损格式生效 |
| `options.region`  | `ScreenRect`                | 否   | 截图区域 | 必须位于视口内         |

错误：

- `E_UNSUPPORTED_CAPABILITY`
- `E_OPERATION_TIMEOUT`

## engine.on(event, listener)

级别：`developer`
稳定性：`stable`

签名：

```ts
engine.on(event: EngineEventType, listener: EngineEventListener): Unsubscribe
```

行为说明：

- listener 抛错会被隔离，并通过 diagnostics 上报。
- 高频事件可根据策略进行采样。
