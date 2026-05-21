# Interaction Primitives

This page defines official interaction primitives for renderer-integrated products.

## Scope

Interaction primitives include:

- picking
- overlay
- annotation
- transform preview

Product state machines remain outside engine core.

## Picking APIs

### engine.pick(point, options)

```ts
engine.pick(point: ScreenPoint, options?: PickOptions): Promise<PickHit[]>
```

| Parameter                  | Type      | Required | Description                    | Constraints                |
| -------------------------- | --------- | -------- | ------------------------------ | -------------------------- | ------------- |
| `point.x`                  | `number`  | Yes      | Screen-space x coordinate      | Must be in viewport bounds |
| `point.y`                  | `number`  | Yes      | Screen-space y coordinate      | Must be in viewport bounds |
| `options.mode`             | `'top'    | 'all'`   | No                             | Result aggregation mode    | Default `top` |
| `options.limit`            | `number`  | No       | Max hit count                  | Positive integer           |
| `options.includeInvisible` | `boolean` | No       | Include non-visible candidates | Default `false`            |

Errors:

- `E_INVALID_ARGUMENT`
- `E_OPERATION_TIMEOUT`

Related events:

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

## Overlay APIs

### engine.setOverlays(overlays)

```ts
engine.setOverlays(overlays: OverlayItem[]): Promise<OverlayApplyResult>
```

| Parameter             | Type     | Required | Description                                     |
| --------------------- | -------- | -------- | ----------------------------------------------- |
| `overlays[].id`       | `string` | Yes      | Stable overlay identifier                       |
| `overlays[].kind`     | `string` | Yes      | Overlay category (outline, handle, guide, etc.) |
| `overlays[].sourceId` | `string` | Yes      | Source entity identity                          |
| `overlays[].revision` | `string` | No       | Producer revision tag                           |

### engine.updateOverlay(overlayId, patch)

```ts
engine.updateOverlay(overlayId: string, patch: OverlayPatch): Promise<void>
```

### engine.clearOverlays(scope)

```ts
engine.clearOverlays(scope?: OverlayScope): Promise<void>
```

## Annotation APIs

### engine.setAnnotations(annotations)

```ts
engine.setAnnotations(annotations: AnnotationItem[]): Promise<AnnotationApplyResult>
```

| Parameter               | Type              | Required         | Description              |
| ----------------------- | ----------------- | ---------------- | ------------------------ | ------------------ |
| `annotations[].id`      | `string`          | Yes              | Stable annotation id     |
| `annotations[].anchor`  | `WorldPoint       | ScreenPoint`     | Yes                      | Annotation anchor  |
| `annotations[].content` | `string           | RichTextPayload` | Yes                      | Annotation payload |
| `annotations[].style`   | `AnnotationStyle` | No               | Rendering style override |

## Transform Preview APIs

### engine.setTransformPreview(preview)

```ts
engine.setTransformPreview(preview: TransformPreviewPayload): Promise<void>
```

| Parameter           | Type             | Required | Description             |
| ------------------- | ---------------- | -------- | ----------------------- | ------- | --------------- | ---------------------- |
| `preview.entityIds` | `string[]`       | Yes      | Preview target entities |
| `preview.operation` | `'translate'     | 'rotate' | 'scale'                 | 'skew'` | Yes             | Preview operation kind |
| `preview.delta`     | `TransformDelta` | Yes      | Delta transform payload |
| `preview.space`     | `'world'         | 'local'  | 'screen'`               | No      | Transform space |

### engine.clearTransformPreview()

```ts
engine.clearTransformPreview(): Promise<void>
```

## Integration Rules

1. Interaction state must be explicit input; no hidden UI store coupling.
2. Overlay and annotation payloads must be normalized.
3. Picking results must be stable-ordered and replay-consistent.
4. All interaction operations must emit diagnostics context on failure.
