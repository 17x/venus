# Runtime Backend API (`engine.runtime.backend.*`)

Audience: Backend probing, fallback diagnostics, and platform verification workflows.

## Scope

This page defines the first frozen runtime backend foundation endpoints for Batch-3.

## Endpoints

### engine.runtime.backend.listAvailable()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.listAvailable(): {
  available: readonly EngineBackendMode[];
}
```

Error Codes:

- `ENGINE_BACKEND_PROBE_FAILED`

Determinism:

- Same probe set must return identical backend ordering.

### engine.runtime.backend.select(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.select(input: {
  preference: EngineBackendMode | "auto";
}): {
  requested: EngineBackendMode | "auto";
  resolved: EngineBackendMode;
}
```

Error Codes:

- `ENGINE_BACKEND_UNAVAILABLE`

Determinism:

- Same preference and same available backend set must return identical resolution.

### engine.runtime.backend.getActive()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.getActive(): {
  active: EngineBackendMode;
}
```

Error Codes:

- `ENGINE_BACKEND_UNAVAILABLE`

Determinism:

- Same backend runtime state must return identical active backend mode.

### engine.runtime.backend.getFallbackTrace()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.getFallbackTrace(): {
  fallbackTrace: readonly {
    requested: EngineBackendMode;
    resolved: EngineBackendMode;
    reason: string | null;
  }[];
}
```

Error Codes:

- `ENGINE_BACKEND_PROBE_FAILED`

Determinism:

- Same selection inputs must return identical fallback trace ordering.

### engine.runtime.backend.getCapabilities()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.getCapabilities(): {
  compute: boolean;
  readback: boolean;
}
```

Error Codes:

- `ENGINE_BACKEND_UNAVAILABLE`

Determinism:

- Same active backend must return identical capability switches.

### engine.runtime.backend.getLimits()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.getLimits(): {
  maxTextureSize: number;
  maxCommandsPerSubmit: number;
}
```

Error Codes:

- `ENGINE_BACKEND_UNAVAILABLE`

Determinism:

- Same active backend must return identical operational limits.

### engine.runtime.backend.probeHeadless()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.backend.probeHeadless(): {
  supported: boolean;
}
```

Error Codes:

- `ENGINE_BACKEND_PROBE_FAILED`

Determinism:

- Same probe set must return identical headless support result.

## Related Contracts

- `packages/engine/src/runtime/backend/backend.foundation.contract.ts`
- `packages/engine/src/backend/backendSelector.ts`
