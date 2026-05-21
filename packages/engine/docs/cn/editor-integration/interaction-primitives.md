# 交互原语手册

本页定义渲染器集成产品的官方交互原语。

## 范围

交互原语包含：

- picking
- overlay
- annotation
- transform preview

产品状态机仍应位于 engine core 之外。

## Picking API

### engine.pick(point, options)

```ts
engine.pick(point: ScreenPoint, options?: PickOptions): Promise<PickHit[]>
```

| 参数                       | 类型      | 必填   | 说明               | 约束             |
| -------------------------- | --------- | ------ | ------------------ | ---------------- | ---------- |
| `point.x`                  | `number`  | 是     | 屏幕空间 x 坐标    | 必须在视口范围内 |
| `point.y`                  | `number`  | 是     | 屏幕空间 y 坐标    | 必须在视口范围内 |
| `options.mode`             | `'top'    | 'all'` | 否                 | 结果聚合模式     | 默认 `top` |
| `options.limit`            | `number`  | 否     | 最大命中数         | 正整数           |
| `options.includeInvisible` | `boolean` | 否     | 是否包含不可见候选 | 默认 `false`     |

错误：

- `E_INVALID_ARGUMENT`
- `E_OPERATION_TIMEOUT`

关联事件：

- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`

### engine.pickRect(rect, options)

```ts
engine.pickRect(rect: ScreenRect, options?: PickAreaOptions): Promise<PickHit[]>
```

### engine.pickLasso(path, options)

```ts
engine.pickLasso(path: ScreenPoint[], options?: PickAreaOptions): Promise<PickHit[]>
```

## Overlay API

### engine.setOverlays(overlays)

```ts
engine.setOverlays(overlays: OverlayItem[]): Promise<OverlayApplyResult>
```

| 参数                  | 类型     | 必填 | 说明                                      |
| --------------------- | -------- | ---- | ----------------------------------------- |
| `overlays[].id`       | `string` | 是   | 稳定 overlay 标识                         |
| `overlays[].kind`     | `string` | 是   | overlay 类别（outline、handle、guide 等） |
| `overlays[].sourceId` | `string` | 是   | 来源实体标识                              |
| `overlays[].revision` | `string` | 否   | 生产侧 revision 标签                      |

### engine.updateOverlay(overlayId, patch)

```ts
engine.updateOverlay(overlayId: string, patch: OverlayPatch): Promise<void>
```

### engine.clearOverlays(scope)

```ts
engine.clearOverlays(scope?: OverlayScope): Promise<void>
```

## Annotation API

### engine.setAnnotations(annotations)

```ts
engine.setAnnotations(annotations: AnnotationItem[]): Promise<AnnotationApplyResult>
```

| 参数                    | 类型              | 必填             | 说明                 |
| ----------------------- | ----------------- | ---------------- | -------------------- | -------- |
| `annotations[].id`      | `string`          | 是               | 稳定 annotation 标识 |
| `annotations[].anchor`  | `WorldPoint       | ScreenPoint`     | 是                   | 注解锚点 |
| `annotations[].content` | `string           | RichTextPayload` | 是                   | 注解内容 |
| `annotations[].style`   | `AnnotationStyle` | 否               | 样式覆盖             |

## Transform Preview API

### engine.setTransformPreview(preview)

```ts
engine.setTransformPreview(preview: TransformPreviewPayload): Promise<void>
```

| 参数                | 类型             | 必填     | 说明         |
| ------------------- | ---------------- | -------- | ------------ | ------- | -------- | ------------ |
| `preview.entityIds` | `string[]`       | 是       | 预览目标实体 |
| `preview.operation` | `'translate'     | 'rotate' | 'scale'      | 'skew'` | 是       | 预览操作类型 |
| `preview.delta`     | `TransformDelta` | 是       | 变换增量     |
| `preview.space`     | `'world'         | 'local'  | 'screen'`    | 否      | 变换空间 |

### engine.clearTransformPreview()

```ts
engine.clearTransformPreview(): Promise<void>
```

## 集成规则

1. 交互状态必须作为显式输入，不允许隐式耦合 UI store。
2. overlay 与 annotation payload 必须标准化。
3. picking 结果必须稳定排序且可回放一致。
4. 交互失败必须输出带上下文的 diagnostics 信息。
