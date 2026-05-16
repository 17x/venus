# Engine Settings and Policy Guide (T0026)

## Profile Example

```ts
import {
  createEngineRuntimePolicy,
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
} from "@venus/engine";

const capability = resolveEngineDeviceCapabilityProfile({
  gpuTier: "mid",
  memoryTier: "mid",
  workerTier: "mid",
  webgpuSupported: false,
});

const preset = resolveEngineDefaultPreset("editor", capability);

const policy = createEngineRuntimePolicy(
  "editor",
  preset,
  resolveEngineGraphicsSettings({ renderScale: 1 }),
  resolveEnginePerformanceSettings({ frameTimeBudgetMs: 16 }),
  resolveEngineRuntimeSettings({ retainedRendering: true }),
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
  capability,
);
```

## Capability Example

- low-tier capability auto clamps expensive presets.
- high-tier capability may unlock higher static render scale.

## Fallback Example

- policy snapshots can be replayed with `policy:replay` tooling to confirm deterministic decision traces.
