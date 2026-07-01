# Ellipse Object Test Document

## Object Type

`ellipse`

## Model Contract

- Uses `EllipseDocumentNode`.
- Requires stable `id`, `name`, and bounds.
- May define `ellipseStartAngle` and `ellipseEndAngle` for arc rendering.

## Parser Coverage

- Parses runtime nodes with `shapeType: ellipse` or `nodeKind: ellipse`.
- Reads arc metadata, style channels, transform, rotation, and flip metadata.
- Preserves source feature metadata in `schema`.

## Runtime Coverage

- Supports selection, transform, style updates, and history patches.
- Keeps arc values in degrees.
- Leaves arc-specific editing handles to runtime/product interaction code.

## Render Adapter Coverage

- Maps to an engine `shape` node with `shape: 'ellipse'`.
- Passes arc angles only when present.

## Edge Cases

- Full ellipses omit arc angles.
- Equal width and height should render as a circle.
- Arc hit-testing should follow engine geometry tolerance, not app-only bounding boxes.
