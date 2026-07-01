# Frame Object Test Document

## Object Type

`frame`

## Model Contract

- Uses `FrameDocumentNode`.
- Requires stable `id`, `name`, bounds, and ordered `childIds`.
- Uses `parentId: null` for top-level frames or another container id for nested frames.

## Parser Coverage

- Parses runtime nodes with `shapeType: frame` or `nodeKind: frame`.
- Preserves child order from runtime children.
- Preserves source metadata in `schema`.

## Runtime Coverage

- Keeps `childIds` and child `parentId` pointers synchronized.
- Derives bounds from descendants when normalized group/frame bounds are recomputed.
- Participates in sibling reorder and parent-change patches.

## Render Adapter Coverage

- Emits an engine group-like node or container boundary according to adapter policy.
- Does not persist engine scene data back into the document object.

## Edge Cases

- Empty frames keep explicit bounds.
- Missing child lists are backfilled from child `parentId` pointers.
- Hidden or locked frame behavior remains product/runtime policy, not engine policy.
