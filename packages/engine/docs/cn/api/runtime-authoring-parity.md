# Runtime Authoring Parity API

该 API 为同时维护 authoring graph 与 runtime graph 的工具提供语义中立的 graph snapshot、parity diff 与 preview-token diagnostics。

## 命名空间

- `engine.runtime.authoring`

稳定性：`experimental`

## Graph Snapshots

### `engine.runtime.authoring.createGraphSnapshot(input)`

为 `authoring` 或 `runtime` role 创建一个规范化 graph snapshot。

```ts
const authoring = engine.runtime.authoring.createGraphSnapshot({
  graphId: "scene-preview",
  role: "authoring",
  revision: 1,
  nodes: [{ id: "mesh-a" }, { id: "light-a" }],
  materials: [{ id: "mat-a" }],
});
```

Snapshot output 包含：

- `snapshotId`
- `graphId`
- `role`
- `revision`
- `nodeCount`
- `materialCount`
- 排序后的 `nodeIds`
- 排序后的 `materialIds`
- 确定性的结构 `signature`

结构 signature 会有意忽略 role 与 revision。这样工具可以比较 authoring 与 runtime 输出的结构一致性，同时通过 `revisionDelta` 单独报告版本差异。

## Parity Diff

### `engine.runtime.authoring.compareGraphSnapshots(input)`

比较一个 authoring snapshot 与一个 runtime snapshot。两侧都可以传 snapshot id，也可以传 inline snapshot input。

```ts
const comparison = engine.runtime.authoring.compareGraphSnapshots({
  authoring: authoring.snapshotId,
  runtime: engine.runtime.authoring.createGraphSnapshot({
    graphId: "scene-preview",
    role: "runtime",
    revision: 2,
    nodes: [{ id: "mesh-a" }, { id: "light-a" }],
    materials: [{ id: "mat-a" }],
  }).snapshotId,
});
```

Comparison output 包含：

- `matching`
- `addedNodeIds`
- `removedNodeIds`
- `sharedNodeIds`
- `addedMaterialIds`
- `removedMaterialIds`
- `revisionDelta`

这些 diagnostics 是通用的。App 应先把 selected objects、vehicles、roads、editor layers、fixture records 等场景概念映射成中立的 graph node/material ids，再调用该 API。

## Preview Tokens

### `engine.runtime.authoring.createPreviewToken(input)`

为一个 snapshot 和 preview step 创建确定性的 preview token。

```ts
const token = engine.runtime.authoring.createPreviewToken({
  scope: "interactive-preview",
  snapshot: authoring.snapshotId,
  stepIndex: 4,
});
```

Token 会携带 `snapshotId`、`stepIndex` 与 snapshot 结构 signature，便于工具把 preview frames 与 authoring/runtime parity state 对齐。

## Diagnostics

### `engine.runtime.authoring.getDiagnostics()`

返回当前 parity diagnostics：

- `snapshotCount`
- `lastComparisonId`
- `lastComparisonMatching`
- `previewTokenCount`

## Validation

推荐 contract tests：

```bash
pnpm -C packages/engine exec tsx --test src/testing/gameEditorRuntime.contract.test.ts
pnpm -C packages/engine exec tsx --test src/testing/runtimeCapabilityMap.contract.test.ts
```
