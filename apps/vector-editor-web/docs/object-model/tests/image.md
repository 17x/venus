# Image Object Test Document

## Object Type

`image`

## Model Contract

- Uses `ImageDocumentNode`.
- Requires stable `id`, `name`, bounds, and `assetId`.
- May define `assetUrl`, `clipPathId`, and `clipRule`.

## Parser Coverage

- Parses runtime `IMAGE` features into `assetId`.
- Parses runtime `CLIP` features into document clip metadata.
- Preserves source metadata, transform, rotation, and flip metadata.

## Runtime Coverage

- Supports selection, transform, crop/mask metadata updates, style-compatible shadow updates, and history patches.
- Keeps asset loading outside the document object.
- Keeps mask group semantics in product/runtime logic.

## Render Adapter Coverage

- Maps to an engine `image` node.
- Resolves `assetId` through the engine resource loader.
- Emits clip metadata when the adapter can map it to engine clip primitives.

## Edge Cases

- Missing assets should render a deterministic placeholder or warning state.
- Clip source removal must clear or repair `clipPathId`.
- Image bounds remain document-owned even when natural image size is known.
