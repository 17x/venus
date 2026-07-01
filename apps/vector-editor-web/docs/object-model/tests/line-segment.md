# Line Segment Object Test Document

## Object Type

`lineSegment`

## Model Contract

- Uses `LineSegmentDocumentNode`.
- Requires stable `id`, `name`, bounds, and `points`.
- May define `strokeStartArrowhead` and `strokeEndArrowhead`.

## Parser Coverage

- Parses runtime line/vector commands into ordered endpoint points.
- Reads stroke width, stroke color, arrowhead metadata, transform, rotation, and flip metadata.
- Preserves source metadata in `schema`.

## Runtime Coverage

- Supports selection, transform, endpoint movement, style updates, and history patches.
- Keeps open-line behavior distinct from closed polygon behavior.
- Uses stroke tolerance for hit-testing.

## Render Adapter Coverage

- Maps to an engine `shape` node with `shape: 'line'`.
- Passes endpoint points and arrowhead metadata when present.

## Edge Cases

- Single-point or zero-length lines remain safe and selectable by tolerance.
- Missing stroke should use adapter/runtime defaults or render as non-visible.
- Arrowheads should not affect persisted endpoint coordinates.
