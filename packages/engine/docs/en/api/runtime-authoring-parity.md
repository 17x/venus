# Runtime Authoring Parity API

This API provides scenario-neutral graph snapshot, parity diff, and preview-token diagnostics for tools that maintain separate authoring and runtime graph views.

## Namespace

- `engine.runtime.authoring`

Stability: `experimental`

## Graph Snapshots

### `engine.runtime.authoring.createGraphSnapshot(input)`

Creates a normalized graph snapshot for either the `authoring` or `runtime` role.

```ts
const authoring = engine.runtime.authoring.createGraphSnapshot({
  graphId: "scene-preview",
  role: "authoring",
  revision: 1,
  nodes: [{ id: "mesh-a" }, { id: "light-a" }],
  materials: [{ id: "mat-a" }],
});
```

Snapshot output includes:

- `snapshotId`
- `graphId`
- `role`
- `revision`
- `nodeCount`
- `materialCount`
- sorted `nodeIds`
- sorted `materialIds`
- deterministic structural `signature`

The structural signature intentionally ignores role and revision. This lets tools compare authoring and runtime outputs for structural parity while still reporting `revisionDelta` separately.

## Parity Diff

### `engine.runtime.authoring.compareGraphSnapshots(input)`

Compares an authoring snapshot with a runtime snapshot. Each side may be either a snapshot id or an inline snapshot input.

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

Comparison output includes:

- `matching`
- `addedNodeIds`
- `removedNodeIds`
- `sharedNodeIds`
- `addedMaterialIds`
- `removedMaterialIds`
- `revisionDelta`

These diagnostics are generic. Apps should map scenario concepts such as selected objects, vehicles, roads, editor layers, or fixture records into neutral graph node/material ids before calling this API.

## Preview Tokens

### `engine.runtime.authoring.createPreviewToken(input)`

Creates a deterministic preview token for one snapshot and preview step.

```ts
const token = engine.runtime.authoring.createPreviewToken({
  scope: "interactive-preview",
  snapshot: authoring.snapshotId,
  stepIndex: 4,
});
```

The token carries `snapshotId`, `stepIndex`, and the snapshot structural signature so tools can correlate preview frames with authoring/runtime parity state.

## Diagnostics

### `engine.runtime.authoring.getDiagnostics()`

Returns current parity diagnostics:

- `snapshotCount`
- `lastComparisonId`
- `lastComparisonMatching`
- `previewTokenCount`

## Validation

Recommended contract tests:

```bash
pnpm -C packages/engine exec tsx --test src/testing/gameEditorRuntime.contract.test.ts
pnpm -C packages/engine exec tsx --test src/testing/runtimeCapabilityMap.contract.test.ts
```
