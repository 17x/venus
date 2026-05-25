# Runtime Document API（`engine.runtime.document.*`）

受众：foundation/runtime contract 实现者与确定性回放工具链。

## 范围

本页定义 runtime document foundation 冻结接口，供 runtime adapter 与确定性回放工具链使用。

## 接口

### engine.runtime.document.createSnapshot(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.createSnapshot(input: {
  revision: number;
  nodes: EngineDocumentSnapshot["nodes"];
}): EngineDocumentSnapshot
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `revision` + 相同 `nodes` 必须生成一致快照对象。

### engine.runtime.document.validateSnapshot(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.validateSnapshot(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  valid: boolean;
  issues: readonly string[];
}
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `snapshot` 必须产生一致的 `valid` 与 `issues` 输出。

### engine.runtime.document.getRevision()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.getRevision(): number
```

输出：

- 当前 runtime document 状态对应的单调 revision。

确定性约束：

- 同一 document 状态必须返回相同 revision。

### engine.runtime.document.getSchemaVersion()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.getSchemaVersion(): number
```

输出：

- runtime document schema 版本号。

确定性约束：

- 同一 runtime 构建必须返回相同 schemaVersion。

### engine.runtime.document.applyChangeSet(changeSet)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.applyChangeSet(input: {
  changeSet: EngineDocumentChangeSet;
  baseRevision?: number;
  schemaVersion?: number;
}): {
  nextRevision: number;
  appliedOps: number;
  warnings: readonly string[];
}
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`
- `ENGINE_DOCUMENT_REVISION_CONFLICT`

确定性约束：

- 相同 `changeSet` + 相同 `baseRevision` + 相同 `schemaVersion` 必须产生一致输出。

### engine.runtime.document.preflightApplyChangeSet(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.preflightApplyChangeSet(input: {
  changeSet: EngineDocumentChangeSet;
  baseRevision?: number;
  schemaVersion?: number;
  linearizedEnvelope?: EngineDocumentLinearizedDeltaEnvelope;
  decodedFramePayload?: EngineDecodedFramePayloadDescriptor;
  decodedFrameTimelineAlignment?: EngineRuntimeDocumentDecodedFrameTimelineAlignmentInput;
}): {
  valid: boolean;
  issues: readonly string[];
  warningCodes: readonly string[];
  predictedNextRevision: number | null;
}
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`
- `ENGINE_DOCUMENT_REVISION_CONFLICT`

确定性约束：

- 相同 `input` + 相同 runtime revision/schema 状态，必须产生一致 `valid`、有序 `issues`、有序 `warningCodes` 与 `predictedNextRevision`。

状态变更语义：

- `preflightApplyChangeSet` 不得修改 runtime document revision 或 world 状态。

### engine.runtime.document.diffSnapshots(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.diffSnapshots(input: {
  base: EngineDocumentSnapshot;
  target: EngineDocumentSnapshot;
}): {
  addedNodeIds: readonly string[];
  removedNodeIds: readonly string[];
  updatedNodeIds: readonly string[];
}
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `base` + 相同 `target` 必须产生一致且已排序的节点差异 id 列表。

### engine.runtime.document.rebaseChangeSet(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.rebaseChangeSet(input: {
  baseRevision: number;
  changeSet: EngineDocumentChangeSet;
}): EngineDocumentChangeSet
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `baseRevision` + 相同 `changeSet` 必须产生一致的 rebase 输出。

### engine.runtime.document.serializeSnapshot(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.serializeSnapshot(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  payload: string;
}
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `snapshot` 必须产生相同序列化 payload。

### engine.runtime.document.deserializeSnapshot(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.document.deserializeSnapshot(input: {
  payload: string;
}): EngineDocumentSnapshot
```

错误码：

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

确定性约束：

- 相同 `payload` 必须反序列化为一致快照对象。

## 关联契约

- `packages/engine/src/runtime/document/document.foundation.contract.ts`
- `packages/engine/src/document/document-contracts.ts`

## Warning Code 基线目录

- Runtime warning code 常量来源：
  - `packages/engine/src/kernel/document/document-warning-codes.ts`
- Requirement 基线映射来源：
  - `packages/engine/src/kernel/document/document-warning-codes.ts`（`ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS`）
- Requirement 规格参考：
  - `.ai-tasks/engine/playground-s1-s13-requirements-2026-05-24.md`（第 14 节）
