# Event API 参考（`engine.events.*` 与事件域）

Event API 提供类型化可观测信号与编排信号。

## 订阅接口

```ts
engine.events.on(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.off(type: EngineEventType, listener: EngineEventListener): void
engine.events.once(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.onMany(types: readonly EngineEventType[], listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.offAll(scope?: EventScope): void
engine.events.pause(type: EngineEventType): void
engine.events.resume(type: EngineEventType): void
engine.events.getListenerStats(): EventListenerStats
engine.events.getEventTypes(): readonly EngineEventType[]
```

```ts
interface EventSubscriptionOptions {
  scope?: "global" | "session" | "trace";
  sampleRate?: number;
  throttleMs?: number;
}

interface EventListenerStats {
  totalListeners: number;
  pausedTypes: readonly EngineEventType[];
  perType: Record<EngineEventType, number>;
}
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

type EngineEventPayload = EngineEvent["payload"];

const ENGINE_EVENT_SCHEMA_VERSION: number;
```

以上字段为所有事件类型的强制字段。

## 错误语义

- `ENGINE_EVENTS_INVALID_TYPE`：事件类型缺失或不在标准事件域契约内。
- `ENGINE_EVENTS_INVALID_LISTENER`：listener 缺失或不可调用。
- `ENGINE_EVENTS_LISTENER_FAILURE`：listener 回调抛错；引擎主流程必须继续并上报 diagnostics。

## 事件域

1. Lifecycle

- `engine.lifecycle.beforeMount`
- `engine.lifecycle.mounted`
- `engine.lifecycle.beforeUnmount`
- `engine.lifecycle.unmounted`
- `engine.lifecycle.ready`
- `engine.lifecycle.disposed`

2. Document

- `engine.document.graphSet`
- `engine.document.graphPatched`
- `engine.document.revisionChanged`

3. Query

- `engine.query.executed`
- `engine.query.empty`

4. View/Interaction

- `engine.view.changed`
- `engine.view.viewportResized`
- `engine.interaction.stateChanged`
- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`

5. Render

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.render.frameFailed`
- `engine.render.backendSwitched`

6. Resource/Streaming

- `engine.resource.loadProgress`
- `engine.resource.loadFailed`
- `engine.streaming.backpressure`

7. Diagnostics/Replay

- `engine.diagnostics.warning`
- `engine.diagnostics.traceReady`
- `engine.diagnostics.captureReady`
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
