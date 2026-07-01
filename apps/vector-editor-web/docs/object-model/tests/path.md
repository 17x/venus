# Path Object Test Document

## Object Type

`path`

## Model Contract

- Uses `PathDocumentNode`.
- Requires stable `id`, `name`, bounds, and `bezierPoints`.
- May keep `points` as a compatibility outline.

## Parser Coverage

- Parses `MOVE_TO`, `LINE_TO`, `CURVE_TO`, and `CLOSE` commands.
- Converts curve commands into bezier anchors and handles.
- Derives bounds from bezier extrema when explicit bounds are absent.

## Runtime Coverage

- Supports selection, transform, style updates, and history patches.
- Keeps path editing state outside the base document object.
- Preserves open or closed path semantics through geometry and adapter metadata.

## Render Adapter Coverage

- Maps to an engine `shape` node with `shape: 'path'`.
- Passes bezier points, fill, stroke, arrowheads, and clip metadata when present.

## Edge Cases

- Multiple subpaths should preserve command order.
- Closed paths should not create duplicate anchors unless required by compatibility.
- Degenerate curves should remain safe for bounds and hit-test calculations.
