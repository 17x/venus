# Developer API Reference (`engine.*`)

Stability target: `stable` for core lifecycle and rendering control APIs.
Audience: Application and adapter developers.

## createEngine(options)

Level: `developer`
Stability: `stable`

Signature:

```ts
createEngine(options: EngineCreateOptions): EngineHandle
```

Parameters:

| Name                         | Type                                                        | Required | Description                          | Constraints              |
| ---------------------------- | ----------------------------------------------------------- | -------- | ------------------------------------ | ------------------------ |
| `options.backendPreference`  | `'auto' \| 'webgpu' \| 'webgl' \| 'canvas2d' \| 'headless'` | No       | Preferred backend selection strategy | Defaults to `'auto'`     |
| `options.diagnosticsEnabled` | `boolean`                                                   | No       | Enables metrics/trace/capture hooks  | Defaults to `false`      |
| `options.qualityProfile`     | `'interactive' \| 'balanced' \| 'quality' \| 'headless'`    | No       | Initial quality policy               | Defaults to `'balanced'` |

Returns:

- `EngineHandle`

Errors:

- `E_BACKEND_UNAVAILABLE`
- `E_INVALID_ARGUMENT`

Related events:

- `engine.lifecycle.ready`
- `engine.render.backendSwitched`

## Hard-Cut Runtime Bridge Parity (2026-05-21)

The `EngineHandle` returned by `createEngine` now exposes the runtime bridge P0 surface directly:

```ts
engine.setGraph(graph: EngineGraphInput): void
engine.updateGraph(patch: EngineGraphPatchInput): void
engine.render(): Promise<{ drawCount: number; visibleCount: number; frameMs: number }>
engine.setView(view: EngineViewInput): EngineViewSnapshot
engine.setOverlays(overlays: readonly unknown[]): void
engine.invalidate(input?: EngineInvalidateInput): void
engine.getDiagnostics(): EngineDiagnosticsSnapshot
```

Migration aliases were removed in hard-cut mode. Use canonical APIs only.

## engine.mount(target)

Level: `developer`
Stability: `stable`

Signature:

```ts
engine.mount(target: MountTarget): Promise<void>
```

Parameters:

| Name             | Type                                    | Required    | Description                                   | Constraints                            |
| ---------------- | --------------------------------------- | ----------- | --------------------------------------------- | -------------------------------------- |
| `target.kind`    | `'canvas' \| 'offscreen' \| 'headless'` | Yes         | Surface type for rendering session            | Must match active backend capabilities |
| `target.surface` | `HTMLCanvasElement \| OffscreenCanvas`  | Conditional | Surface reference for browser-backed sessions | Required when `kind !== 'headless'`    |
| `target.size`    | `{ width: number; height: number }`     | No          | Initial viewport size                         | Positive integers                      |

Errors:

- `E_INVALID_ARGUMENT`
- `E_UNSUPPORTED_CAPABILITY`

## engine.setGraph(graph)

Level: `developer`
Stability: `beta`

Signature:

```ts
engine.setGraph(graph: EngineGraph): Promise<GraphSetResult>
```

Parameters:

| Name    | Type          | Required | Description                   | Constraints                 |
| ------- | ------------- | -------- | ----------------------------- | --------------------------- |
| `graph` | `EngineGraph` | Yes      | Full normalized runtime graph | Must pass schema validation |

Returns:

- `GraphSetResult` with `revision`, `nodeCount`, `warnings`

Errors:

- `E_SCHEMA_VALIDATION_FAILED`

Related events:

- `engine.document.beforeSetGraph`
- `engine.document.graphSet`

## engine.updateGraph(patch)

Level: `developer`
Stability: `beta`

Signature:

```ts
engine.updateGraph(patch: EngineGraphPatch): Promise<GraphPatchResult>
```

Parameters:

| Name                 | Type                     | Required | Description                  | Constraints                                  |
| -------------------- | ------------------------ | -------- | ---------------------------- | -------------------------------------------- |
| `patch.baseRevision` | `string`                 | Yes      | Revision expected by patch   | Must match current revision or be rebaseable |
| `patch.operations`   | `EnginePatchOperation[]` | Yes      | Add/update/remove operations | Non-empty                                    |

Returns:

- `GraphPatchResult` with `newRevision`, `appliedCount`, `conflicts`

Errors:

- `E_SCHEMA_VALIDATION_FAILED`
- `E_OPERATION_TIMEOUT`

## engine.render()

Level: `developer`
Stability: `stable`

Signature:

```ts
engine.render(): Promise<FrameResult>
```

Returns:

- `FrameResult` containing `frameId`, `cpuTimeMs`, `gpuTimeMs?`, `fallbackInfo`

Errors:

- `E_BUDGET_EXCEEDED`
- `E_INTERNAL_INVARIANT_BROKEN`

Related events:

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.render.frameFailed`

## engine.pick(point, options)

Level: `developer`
Stability: `stable`

Signature:

```ts
engine.pick(point: ScreenPoint, options?: PickOptions): Promise<PickHit[]>
```

Parameters:

| Name            | Type             | Required | Description               | Constraints         |
| --------------- | ---------------- | -------- | ------------------------- | ------------------- |
| `point.x`       | `number`         | Yes      | Screen-space X coordinate | In viewport bounds  |
| `point.y`       | `number`         | Yes      | Screen-space Y coordinate | In viewport bounds  |
| `options.mode`  | `'top' \| 'all'` | No       | Hit aggregation mode      | Defaults to `'top'` |
| `options.limit` | `number`         | No       | Max hit count             | Positive integer    |

Returns:

- Ordered `PickHit[]` by stable score order

Errors:

- `E_INVALID_ARGUMENT`

Related events:

- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`

## engine.setOverlays(overlays)

Level: `developer`
Stability: `stable`

Signature:

```ts
engine.setOverlays(overlays: OverlayItem[]): Promise<OverlayApplyResult>
```

Parameters:

| Name       | Type            | Required | Description                | Constraints                                 |
| ---------- | --------------- | -------- | -------------------------- | ------------------------------------------- |
| `overlays` | `OverlayItem[]` | Yes      | Full overlay state payload | Each item requires `id`, `kind`, `sourceId` |

Returns:

- `OverlayApplyResult` with `revision` and `acceptedCount`

Errors:

- `E_SCHEMA_VALIDATION_FAILED`

## engine.captureImage(options)

Level: `developer`
Stability: `beta`

Signature:

```ts
engine.captureImage(options?: CaptureImageOptions): Promise<CaptureImageResult>
```

Parameters:

| Name              | Type                        | Required | Description         | Constraints                    |
| ----------------- | --------------------------- | -------- | ------------------- | ------------------------------ |
| `options.format`  | `'png' \| 'jpeg' \| 'webp'` | No       | Output image format | Defaults to `'png'`            |
| `options.quality` | `number`                    | No       | Compression quality | `0..1`, only for lossy formats |
| `options.region`  | `ScreenRect`                | No       | Crop region         | Must be inside viewport        |

Errors:

- `E_UNSUPPORTED_CAPABILITY`
- `E_OPERATION_TIMEOUT`

## engine.on(event, listener)

Level: `developer`
Stability: `stable`

Signature:

```ts
engine.on(event: EngineEventType, listener: EngineEventListener): Unsubscribe
```

Behavior:

- Listener exceptions are isolated and reported through diagnostics.
- High-frequency event categories may be sampled by policy.
