# Text Object Test Document

## Object Type

`text`

## Model Contract

- Uses `TextDocumentNode`.
- Requires stable `id`, `name`, bounds, and `text`.
- May define `textRuns` for rich-text styling.

## Parser Coverage

- Parses runtime `TEXT` features into plain text and run styles.
- Reads font family, font size, font weight, color, letter spacing, line height, and text shadow data.
- Preserves source metadata in `schema`.

## Runtime Coverage

- Supports selection, transform, text edits, style updates, and history patches.
- Keeps run ranges aligned to the plain text payload.
- Leaves text layout measurement to runtime/render adapters.

## Render Adapter Coverage

- Maps to an engine `text` node.
- Emits plain text fast-path and rich-text runs when present.

## Edge Cases

- Empty text remains a valid editable object.
- Run ranges outside text length should be normalized or rejected by edit commands.
- Text color should come from `textRuns` when rich text is present.
