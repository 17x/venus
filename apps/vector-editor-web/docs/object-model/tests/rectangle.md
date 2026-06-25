# Rectangle Object Test Document

## Object Type

`rectangle`

## Model Contract

- Uses `RectangleDocumentNode`.
- Requires stable `id`, `name`, and bounds.
- May use `cornerRadius` or `cornerRadii`; per-corner radii take precedence in adapters.

## Parser Coverage

- Parses runtime nodes with `shapeType: rectangle` or compatible fallback nodes.
- Reads fill, stroke, shadow, corner radius, transform, rotation, and flip metadata.
- Defaults unknown shape metadata to rectangle for compatibility.

## Runtime Coverage

- Supports selection, transform, style updates, history patches, and hit-test routing.
- Preserves non-negative width and height after transform normalization.
- Keeps style changes independent from hierarchy patches.

## Render Adapter Coverage

- Maps to an engine `shape` node with `shape: 'rect'`.
- Passes corner radius, fill, stroke, shadow, transform, and clip metadata when present.

## Edge Cases

- Zero-size rectangles remain selectable according to runtime tolerance policy.
- Mixed uniform and per-corner radii must render deterministically.
- Missing fill or stroke means the corresponding channel is disabled or adapter-defaulted.
