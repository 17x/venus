# Group Object Test Document

## Object Type

`group`

## Model Contract

- Uses `GroupDocumentNode`.
- Requires stable `id`, `name`, bounds, and ordered `childIds`.
- Owns hierarchy only; product group isolation rules live outside the model type.

## Parser Coverage

- Parses runtime nodes with `shapeType: group` or `nodeKind: group`.
- Flattens nested runtime children into document objects.
- Keeps source node type, node kind, and feature kinds in `schema`.

## Runtime Coverage

- Synchronizes child parent pointers during group, ungroup, insert, remove, and reorder operations.
- Recomputes bounds from child object extents.
- Supports cross-parent regroup without assigning an arbitrary source parent.

## Render Adapter Coverage

- Emits nested engine children or flattened nodes with composed transforms.
- Keeps product-only group semantics outside the engine scene.

## Edge Cases

- Empty groups keep explicit bounds.
- Removed children must be removed from `childIds`.
- Cross-parent regroup must update all source containers.
