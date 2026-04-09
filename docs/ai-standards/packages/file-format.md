# `@venus/file-format`

Package-scoped notes for persisted scene semantics, migrations, and runtime
scene parsing/adaptation.

## Stable Knowledge

- Treat this package as the source of truth for persisted scene/document
  semantics.
- Runtime/editor structures should adapt to file-format semantics rather than
  competing with them.

## Recent Updates

### 2026-04-09

- Runtime scene parsing/export now preserves explicit `CLOSE` commands for
  vector paths so closed path fill behavior survives import/export cycles.

- Runtime scene group-bound derivation now uses the shared `document-core`
  normalized box helper, keeping file-format-to-runtime group fallback bounds
  aligned with the active transform migration path.

- Added transform compatibility adapters in
  `base/src/transformAdapters.ts` for Phase-5 matrix migration:
  `resolveLegacyShapeTransformFromFileFormat`,
  `resolveMatrixFirstTransformFromFileFormat`, and
  `createFileFormatTransformMetadataEntries`. Runtime scene parsing now resolves
  transform fields through this shared adapter path.

- `apps/vector-editor-web` file export now serializes transform metadata
  (`x/y/width/height/rotation/flipX/flipY`) through
  `createMatrixFirstNodeTransform` + `createFileFormatTransformMetadataEntries`
  instead of app-local manual key assembly, keeping parse/write compatibility on
  one adapter boundary.
