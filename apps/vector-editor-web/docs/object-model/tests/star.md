# Star Object Test Document

## Object Type

`star`

## Model Contract

- Uses `StarDocumentNode`.
- Requires stable `id`, `name`, bounds, and `points`.
- Stores generated star vertices rather than generator parameters.

## Parser Coverage

- Parses runtime nodes with `shapeType: star`.
- Reads vector points and path-derived bounds.
- Preserves source feature metadata for diagnostics.

## Runtime Coverage

- Supports selection, transform, style updates, and history patches.
- Keeps vertex order stable for deterministic rendering.
- Leaves star generator controls to product-specific tooling.

## Render Adapter Coverage

- Maps to an engine polygon/path representation.
- Passes fill and stroke channels when present.

## Edge Cases

- Degenerate star points should remain document-safe.
- Imports without generator metadata should still render from points.
- Runtime should not infer star parameters from points unless a dedicated feature is added.
