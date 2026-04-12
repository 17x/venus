# `@venus/file-format`

Package-scoped notes for persisted scene semantics, migrations, and runtime
scene parsing/adaptation.

## Stable Knowledge

- Treat this package as the source of truth for persisted scene/document
  semantics.
- Runtime/editor structures should adapt to file-format semantics rather than
  competing with them.

## Recent Updates

### 2026-04-12

- Refactored `@venus/file-format/base` document model definitions to a JSON-first
  runtime contract path under `base/src/types.ts`.
- `base/src` no longer depends on `base/migrations/*` for exported types or
  parser adapters. `parseRuntimeScene` and transform adapters now import local
  JSON runtime types directly.
- Removed legacy FlatBuffer artifacts from active base protocol maintenance:
  `packages/file-format/base/migrations` and `packages/file-format/*/schemas`
  were deleted as part of the JSON model transition.
- Further slimmed `@venus/file-format` to base-only protocol ownership:
  root package exports now expose only `./base`, and the legacy
  `mindmap/streamline` submodules were removed from the package surface.
- `base/src/types.ts` now centers on the v5 JSON runtime scene contract
  (`RuntimeSceneV5`/`RuntimeSceneLatest`) with compatibility aliases for active
  app imports, and legacy parser fallback to `node.features` was removed.
- Updated package READMEs to describe JSON protocol ownership instead of
  versioned `.fbs` schema ownership.
- Cleaned `document-core` model comments to remove explicit file-format-layer
  wording and keep node metadata semantics adapter-agnostic.

### 2026-04-09

- Runtime scene parsing/export now preserves explicit `CLOSE` commands for
  vector paths so closed path fill behavior survives import/export cycles.

- Runtime scene group-bound derivation now uses the shared `document-core`
  normalized box helper, keeping file-format-to-runtime group fallback bounds
  aligned with the active transform migration path.

- Added transform metadata compatibility flow for Phase-5 matrix migration.
  Runtime scene parsing resolves transform fields from metadata + node matrix,
  while vector export serializes canonical transform metadata keys
  (`x/y/width/height/rotation/flipX/flipY`) through shared adapter logic.

- `apps/vector-editor-web` file export serializes canonical transform metadata
  (`x/y/width/height/rotation/flipX/flipY`) through shared adapter helpers to
  keep parse/write compatibility on one boundary.
