# Event API 参考（`engine.events.*` 与事件域）

Event API 提供类型化可观测信号与编排信号。

## 订阅接口

```ts
engine.events.on(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.off(type: EngineEventType, listener: EngineEventListener): void
engine.events.once(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.offAll(scope?: EventScope): void
```

## 事件包络

```ts
interface EngineEvent<TPayload = unknown> {
  type: EngineEventType;
  timestamp: number;
  engineId: string;
  revision: string;
  payload: TPayload;
}
```

以上字段为所有事件类型的强制字段。

## 事件域

1. Lifecycle

- `engine.lifecycle.ready`
- `engine.lifecycle.disposed`

2. Document

- `engine.document.graphSet`
- `engine.document.graphPatched`
- `engine.document.revisionChanged`

3. View/Interaction

- `engine.view.changed`
- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`

4. Render

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.render.frameFailed`
- `engine.render.backendSwitched`

5. Resource/Streaming

- `engine.resource.loadProgress`
- `engine.resource.loadFailed`
- `engine.streaming.backpressure`

6. Diagnostics/Replay

- `engine.diagnostics.warning`
- `engine.diagnostics.error`
- `engine.replay.started`
- `engine.replay.completed`
- `engine.replay.failed`

## 顺序与确定性

- 对 timeline/simulation/replay 等确定性流程，事件顺序属于契约语义。
- 在等价输入与等价后端 profile 下，事件顺序必须保持一致。

## Listener 隔离

- listener 抛错不得中断引擎主流程。
- listener 异常通过 diagnostics 事件上报。

## 高频事件策略

frame/metrics 等高频事件可被采样或节流。
如适用，订阅参数应声明频率级别偏好。
