# Runtime Dirty API（`engine.runtime.dirty.*`）

受众：runtime 调度与增量编译集成开发者。

## 范围

本页定义 Batch-1 首批冻结的 runtime dirty foundation 接口。

## 接口

### engine.runtime.dirty.getState()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.getState(): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

确定性约束：

- 同一 dirty state 必须返回相同顺序的 `pendingDomains`。

### engine.runtime.dirty.mark(domain, token)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.mark(input: {
  domain: EngineDirtyDomain;
  token: string;
}): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

错误码：

- `ENGINE_DIRTY_INVALID_DOMAIN`

确定性约束：

- 相同 mark 序列必须产生一致的 pending domain 排序。

### engine.runtime.dirty.markBatch(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.markBatch(input: {
  domains: readonly EngineDirtyDomain[];
  token: string;
}): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

错误码：

- `ENGINE_DIRTY_INVALID_DOMAIN`

确定性约束：

- 相同 batch 序列必须产生一致 pending domain 顺序。

### engine.runtime.dirty.getPendingDomains()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.getPendingDomains(): readonly EngineDirtyDomain[]
```

确定性约束：

- 相同 dirty state 必须返回一致 pending domain 顺序。

### engine.runtime.dirty.flush(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.flush(input: {
  domains: readonly EngineDirtyDomain[];
}): {
  flushedCount: number;
  state: {
    pendingDomains: readonly EngineDirtyDomain[];
    lastMarkedAt: number;
  };
}
```

错误码：

- `ENGINE_DIRTY_INVALID_DOMAIN`

确定性约束：

- 相同 dirty state 与相同 flush domains 必须返回一致 flush 后状态。

### engine.runtime.dirty.reset()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.dirty.reset(): {
  reset: boolean;
}
```

确定性约束：

- 同样调用必须把 dirty state 重置为一致空状态。

## 关联契约

- `packages/engine/src/runtime/dirty/dirty.foundation.contract.ts`
- `packages/engine/src/dirty/dirtyPropagation/dirtyPropagation.contract.ts`
