# Runtime Command API（`engine.runtime.command.*`）

受众：runtime command 管线集成者与后端提交工具链。

## 范围

本页定义 Batch-3 首批冻结的 runtime command foundation 接口。

## 接口

### engine.runtime.command.createEncoder(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.createEncoder(input: {
  profile: string;
}): {
  encoderId: string;
}
```

错误码：

- `ENGINE_COMMAND_INVALID_PLAN`

确定性约束：

- 相同 profile 且相同调用顺序必须生成一致 encoder id 序列。

### engine.runtime.command.encode(plan)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.encode(plan): {
  bufferId: string;
  commands: readonly EngineEncodedCommand[];
  commandCount: number;
}
```

错误码：

- `ENGINE_COMMAND_INVALID_PLAN`

确定性约束：

- 相同 render plan 必须生成一致的命令顺序与 `commandCount`。

### engine.runtime.command.validate(buffer)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.validate(buffer): {
  valid: boolean;
  validationIssues: readonly string[];
}
```

错误码：

- `ENGINE_COMMAND_VALIDATION_FAILED`

确定性约束：

- 相同 command buffer 必须生成一致顺序的 validation issues。

### engine.runtime.command.optimize(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.optimize(input: {
  commands: readonly EngineEncodedCommand[];
  profile: "balanced" | "latency" | "throughput";
}): {
  commands: readonly EngineEncodedCommand[];
  commandCount: number;
}
```

错误码：

- `ENGINE_COMMAND_INVALID_PLAN`

确定性约束：

- 相同命令输入与 profile 必须得到一致优化顺序。

### engine.runtime.command.inspect(buffer)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.inspect(buffer): {
  valid: boolean;
  summary: string;
}
```

错误码：

- `ENGINE_COMMAND_VALIDATION_FAILED`

确定性约束：

- 相同 command buffer 必须生成一致 inspect 摘要。

### engine.runtime.command.replay(buffer)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.command.replay(buffer): {
  replayedCount: number;
}
```

错误码：

- `ENGINE_COMMAND_VALIDATION_FAILED`

确定性约束：

- 相同 command buffer 必须生成一致 replay count 输出。

## 关联契约

- `packages/engine/src/runtime/command/command-buffer.foundation.contract.ts`
- `packages/engine/src/command-buffer/commandEncoder/commandEncoder.contract.ts`
