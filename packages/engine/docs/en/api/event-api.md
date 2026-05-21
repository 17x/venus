# Event API Reference (`engine.events.*` and domain events)

Event API provides typed observability and orchestration signals.

## Subscription API

```ts
engine.events.on(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.off(type: EngineEventType, listener: EngineEventListener): void
engine.events.once(type: EngineEventType, listener: EngineEventListener, options?: EventSubscriptionOptions): Unsubscribe
engine.events.offAll(scope?: EventScope): void
```

## Event Envelope

```ts
interface EngineEvent<TPayload = unknown> {
  type: EngineEventType;
  timestamp: number;
  engineId: string;
  revision: string;
  payload: TPayload;
}
```

Required fields are mandatory for all event types.

## Event Domains

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

## Ordering and Determinism

- For deterministic workflows (timeline/simulation/replay), event ordering is part of contract behavior.
- Equivalent inputs must produce equivalent event order in equivalent backend profiles.

## Listener Isolation

- Listener exceptions never break engine core flow.
- Listener exceptions are surfaced through diagnostics events.

## High-Frequency Event Policy

Events such as frame/metrics can be sampled or throttled by policy.
Subscription options should include expected frequency class where applicable.
