# Runtime 治理 API 参考（`engine.extension.*`、`engine.scheduler.*`、`engine.cache.*`、`engine.policy.*`、`engine.security.*`）

Runtime 治理 API 提供非业务语义的运行治理能力，用于插件生命周期、调度、缓存、策略配置与安全边界控制。

级别：`developer`
稳定性：`beta`

## Hooks API（`engine.hooks.*`）

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

Hook listener 必须保证可重入安全，且不应直接改写 runtime 私有状态。

## Extension API（`engine.extension.*`）

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

### Extension 错误语义

- `ENGINE_EXTENSION_INVALID_PLUGIN`：plugin payload 不满足最小 id 契约。
- `ENGINE_EXTENSION_DUPLICATE_PLUGIN`：当前 registry 中已存在同名 plugin id。
- `ENGINE_EXTENSION_NOT_FOUND`：目标 plugin id 在当前 registry 中不存在。

## Scheduler API（`engine.scheduler.*`）

```ts
engine.scheduler.schedule(task: unknown, options: { priority?: "low" | "normal" | "high"; budgetMs?: number; queue?: string }): { taskId: string }
engine.scheduler.cancel(taskId: string): { cancelled: boolean }
engine.scheduler.flush(queue?: string): { flushed: number }
engine.scheduler.getQueueStats(): { pending: number; running: number; budgetMs: number }
```

调度契约必须保证同优先级任务的确定性顺序，并提供饥饿保护语义。

## Cache API（`engine.cache.*`）

```ts
engine.cache.get(namespace: string, key: string): unknown
engine.cache.set(namespace: string, key: string, value: unknown, policy?: { ttlMs?: number; pinned?: boolean }): void
engine.cache.invalidate(namespace: string, key?: string): void
engine.cache.invalidateByTag(tag: string): void
engine.cache.getStats(namespace: string): { hitCount: number; missCount: number; entryCount: number }
```

缓存失效策略必须与 dirty-domain 状态迁移保持对齐。

## Policy API（`engine.policy.*`）

```ts
engine.policy.setRenderPolicy(policy: Record<string, unknown>): void
engine.policy.setResourcePolicy(policy: Record<string, unknown>): void
engine.policy.setFallbackPolicy(policy: Record<string, unknown>): void
engine.policy.getEffectivePolicy(): Record<string, unknown>
```

策略变更必须可观测且可回放。

## Security API（`engine.security.*`）

```ts
engine.security.setTrustLevel(level: "low" | "standard" | "high"): void
engine.security.setResourceAccessPolicy(policy: Record<string, unknown>): void
engine.security.getAuditLog(options?: { limit?: number }): readonly Record<string, unknown>[]
```

安全入口必须对外部输入执行 schema 校验与配额限制。

## 治理错误语义

- `ENGINE_HOOKS_INVALID_LISTENER`：hook listener 回调缺失或无效。
- `ENGINE_SCHEDULER_INVALID_TASK`：调度任务 payload 不满足最小执行契约。
- `ENGINE_SCHEDULER_INVALID_QUEUE`：调度队列标识缺失或无效。
- `ENGINE_SCHEDULER_TASK_NOT_FOUND`：目标调度任务 id 不存在。
- `ENGINE_CACHE_INVALID_NAMESPACE`：缓存 namespace 缺失或无效。
- `ENGINE_CACHE_INVALID_KEY`：缓存 key 缺失或无效。
- `ENGINE_CACHE_INVALID_TAG`：缓存 tag 缺失或无效。
- `ENGINE_POLICY_INVALID_INPUT`：策略输入不满足当前策略 schema。
- `ENGINE_POLICY_CONFLICT`：策略输入与当前生效策略约束冲突。
- `ENGINE_SECURITY_INVALID_TRUST_LEVEL`：信任级别输入不在允许范围。
- `ENGINE_SECURITY_INVALID_POLICY`：安全策略输入无效。
- `ENGINE_SECURITY_QUOTA_EXCEEDED`：安全配额守卫拒绝当前请求。
