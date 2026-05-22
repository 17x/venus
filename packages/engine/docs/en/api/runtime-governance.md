# Runtime Governance API Reference (`engine.extension.*`, `engine.scheduler.*`, `engine.cache.*`, `engine.policy.*`, `engine.security.*`)

Runtime governance APIs provide non-domain orchestration controls for extension lifecycle, scheduling, caching, policy configuration, and security boundaries.

Level: `developer`
Stability: `beta`

## Hooks API (`engine.hooks.*`)

```ts
engine.hooks.beforeCompile(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.afterCompile(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.beforeRenderPlan(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.afterRenderPlan(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.beforeSubmit(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.afterSubmit(listener: (payload: { stage: string; timestamp: number; engineId: string; revision: string; context?: unknown }) => void, options?: { scope?: "global" | "session" | "trace" }): { dispose: () => void }
engine.hooks.offAll(scope?: "global" | "session" | "trace"): void
engine.hooks.getStats(): { totalListeners: number; perStage: Record<string, number> }
```

Hook listeners must remain reentrant-safe and should avoid mutating runtime-private state directly.

## Extension API (`engine.extension.*`)

```ts
engine.extension.register(plugin: ExtensionPlugin): { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }
engine.extension.unregister(pluginId: string): { removed: boolean }
engine.extension.list(): readonly { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }[]
engine.extension.getState(pluginId: string): { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }
```

```ts
interface ExtensionPlugin {
  id: string;
  name?: string;
  version?: string;
}
```

### Extension Error Semantics

- `ENGINE_EXTENSION_INVALID_PLUGIN`: plugin payload is missing required id contract.
- `ENGINE_EXTENSION_DUPLICATE_PLUGIN`: plugin id already exists in current registry.
- `ENGINE_EXTENSION_NOT_FOUND`: target plugin id does not exist in current registry.

## Scheduler API (`engine.scheduler.*`)

```ts
engine.scheduler.schedule(task: unknown, options: { priority?: "low" | "normal" | "high"; budgetMs?: number; queue?: string }): { taskId: string }
engine.scheduler.cancel(taskId: string): { cancelled: boolean }
engine.scheduler.flush(queue?: string): { flushed: number }
engine.scheduler.getQueueStats(): { pending: number; running: number; budgetMs: number }
```

Scheduler contract must preserve deterministic ordering for equal-priority tasks and include starvation-protection behavior.

## Cache API (`engine.cache.*`)

```ts
engine.cache.get(namespace: string, key: string): unknown
engine.cache.set(namespace: string, key: string, value: unknown, policy?: { ttlMs?: number; pinned?: boolean }): void
engine.cache.invalidate(namespace: string, key?: string): void
engine.cache.invalidateByTag(tag: string): void
engine.cache.getStats(namespace: string): { hitCount: number; missCount: number; entryCount: number }
```

Cache invalidation must remain aligned with dirty-domain transitions.

## Policy API (`engine.policy.*`)

```ts
engine.policy.setRenderPolicy(policy: Record<string, unknown>): void
engine.policy.setResourcePolicy(policy: Record<string, unknown>): void
engine.policy.setFallbackPolicy(policy: Record<string, unknown>): void
engine.policy.getEffectivePolicy(): Record<string, unknown>
```

Policy updates must be observable and replay-compatible.

## Security API (`engine.security.*`)

```ts
engine.security.setTrustLevel(level: "low" | "standard" | "high"): void
engine.security.setResourceAccessPolicy(policy: Record<string, unknown>): void
engine.security.getAuditLog(options?: { limit?: number }): readonly Record<string, unknown>[]
```

Security entrypoints must enforce schema validation and quota constraints for external inputs.

## Governance Error Semantics

- `ENGINE_HOOKS_INVALID_LISTENER`: hook listener callback is missing or invalid.
- `ENGINE_SCHEDULER_INVALID_TASK`: scheduler task payload is missing required execution contract.
- `ENGINE_SCHEDULER_INVALID_QUEUE`: scheduler queue token is missing or invalid.
- `ENGINE_SCHEDULER_TASK_NOT_FOUND`: target scheduler task id does not exist.
- `ENGINE_CACHE_INVALID_NAMESPACE`: cache namespace is missing or invalid.
- `ENGINE_CACHE_INVALID_KEY`: cache key is missing or invalid.
- `ENGINE_CACHE_INVALID_TAG`: cache tag is missing or invalid.
- `ENGINE_POLICY_INVALID_INPUT`: policy payload is invalid for current policy schema.
- `ENGINE_POLICY_CONFLICT`: policy payload conflicts with active policy constraints.
- `ENGINE_SECURITY_INVALID_TRUST_LEVEL`: trust-level input is outside accepted values.
- `ENGINE_SECURITY_INVALID_POLICY`: security policy payload is invalid.
- `ENGINE_SECURITY_QUOTA_EXCEEDED`: security quota guard blocks requested operation.
