# Runtime Backend API（`engine.runtime.backend.*`）

受众：后端探测、fallback 诊断与平台一致性验证流程。

## 范围

本页定义 Batch-3 首批冻结的 runtime backend foundation 接口。

## 接口

### engine.runtime.backend.listAvailable()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.listAvailable(): {
  available: readonly EngineBackendMode[];
}
```

错误码：

- `ENGINE_BACKEND_PROBE_FAILED`

确定性约束：

- 相同 probe 集合必须返回一致的 backend 顺序。

### engine.runtime.backend.select(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.select(input: {
  preference: EngineBackendMode | "auto";
}): {
  requested: EngineBackendMode | "auto";
  resolved: EngineBackendMode;
}
```

错误码：

- `ENGINE_BACKEND_UNAVAILABLE`

确定性约束：

- 相同 preference 与相同可用 backend 集合必须返回一致解析结果。

### engine.runtime.backend.getActive()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.getActive(): {
  active: EngineBackendMode;
}
```

错误码：

- `ENGINE_BACKEND_UNAVAILABLE`

确定性约束：

- 相同 runtime backend 状态必须返回一致 active backend。

### engine.runtime.backend.getFallbackTrace()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.getFallbackTrace(): {
  fallbackTrace: readonly {
    requested: EngineBackendMode;
    resolved: EngineBackendMode;
    reason: string | null;
  }[];
}
```

错误码：

- `ENGINE_BACKEND_PROBE_FAILED`

确定性约束：

- 相同选择输入必须返回一致顺序的 fallback trace。

### engine.runtime.backend.getCapabilities()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.getCapabilities(): {
  compute: boolean;
  readback: boolean;
}
```

错误码：

- `ENGINE_BACKEND_UNAVAILABLE`

确定性约束：

- 相同 active backend 必须返回一致 capability 开关集合。

### engine.runtime.backend.getLimits()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.getLimits(): {
  maxTextureSize: number;
  maxCommandsPerSubmit: number;
}
```

错误码：

- `ENGINE_BACKEND_UNAVAILABLE`

确定性约束：

- 相同 active backend 必须返回一致运行限额。

### engine.runtime.backend.probeHeadless()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.backend.probeHeadless(): {
  supported: boolean;
}
```

错误码：

- `ENGINE_BACKEND_PROBE_FAILED`

确定性约束：

- 相同 probe 集合必须返回一致 headless 支持结果。

## 关联契约

- `packages/engine/src/runtime/backend/backend.foundation.contract.ts`
- `packages/engine/src/backend/backendSelector.ts`
