# Runtime Command API (`engine.runtime.command.*`)

Audience: Runtime command pipeline integrators and backend submission tooling.

## Scope

This page defines the first frozen runtime command foundation endpoints for Batch-3.

## Endpoints

### engine.runtime.command.createEncoder(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.createEncoder(input: {
  profile: string;
}): {
  encoderId: string;
}
```

Error Codes:

- `ENGINE_COMMAND_INVALID_PLAN`

Determinism:

- Same profile and same call order must produce identical encoder-id sequence.

### engine.runtime.command.encode(plan)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.encode(plan): {
  bufferId: string;
  commands: readonly EngineEncodedCommand[];
  commandCount: number;
}
```

Error Codes:

- `ENGINE_COMMAND_INVALID_PLAN`

Determinism:

- Same render plan must yield identical command ordering and `commandCount`.

### engine.runtime.command.validate(buffer)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.validate(buffer): {
  valid: boolean;
  validationIssues: readonly string[];
}
```

Error Codes:

- `ENGINE_COMMAND_VALIDATION_FAILED`

Determinism:

- Same command buffer must yield identical validation issue ordering.

### engine.runtime.command.optimize(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.optimize(input: {
  commands: readonly EngineEncodedCommand[];
  profile: "balanced" | "latency" | "throughput";
}): {
  commands: readonly EngineEncodedCommand[];
  commandCount: number;
}
```

Error Codes:

- `ENGINE_COMMAND_INVALID_PLAN`

Determinism:

- Same command input and profile must produce identical optimized ordering.

### engine.runtime.command.inspect(buffer)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.inspect(buffer): {
  valid: boolean;
  summary: string;
}
```

Error Codes:

- `ENGINE_COMMAND_VALIDATION_FAILED`

Determinism:

- Same command buffer must produce identical inspect summary.

### engine.runtime.command.replay(buffer)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.command.replay(buffer): {
  replayedCount: number;
}
```

Error Codes:

- `ENGINE_COMMAND_VALIDATION_FAILED`

Determinism:

- Same command buffer must produce identical replay-count output.

## Related Contracts

- `packages/engine/src/runtime/command/command-buffer.foundation.contract.ts`
- `packages/engine/src/command-buffer/commandEncoder/commandEncoder.contract.ts`
