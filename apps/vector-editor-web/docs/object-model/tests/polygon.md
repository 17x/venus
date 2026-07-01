# Polygon Object Test Document

## Object Type

`polygon`

## Model Contract

- Uses `PolygonDocumentNode`.
- Requires stable `id`, `name`, bounds, and `points`.
- Treats points as world-space polygon vertices.

## Parser Coverage

- Parses runtime vector paths into `points`.
- Uses path-derived bounds when explicit width and height metadata are absent.
- Preserves fill, stroke, shadow, transform, and source metadata.

## Runtime Coverage

- Supports selection, transform, style updates, and history patches.
- Maintains point order because order defines polygon winding and visual shape.
- Keeps polygon-specific point editing outside the base object contract.

## Render Adapter Coverage

- Maps to an engine `shape` node with `shape: 'polygon'`.
- Passes points and closure state according to adapter policy.

## Edge Cases

- Fewer than three points should degrade predictably in rendering and hit-testing.
- Closed path imports should not duplicate the first point unless required by compatibility.
- Bounds should be derived from normalized point extents.
