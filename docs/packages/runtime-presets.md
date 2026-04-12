# `@venus/runtime/presets`

Package-scoped note for opinionated default runtime behavior packs.

## Stable Knowledge

- Logical import path: `@venus/runtime/presets`.
- Implementation now lives under `packages/runtime/src/presets`.
- Owns default selection/snapping presets and other out-of-box behavior
  bundles.
- Keep policy here rather than pushing it into `@venus/runtime`.

## Recent Updates

### 2026-04-11

- Consolidated into runtime submodule layout under
  `packages/runtime/src/presets`.
- Added easing policy helpers in
  `packages/runtime/src/presets/easing.ts`:
  preset resolvers now support named easing plus `cubic-bezier` tuples, and
  `createPresetAnimationController` wraps engine animation control with preset
  policy defaults.

### 2026-04-11

- Extended runtime policy presets with modular `history` and `protocol`
  modules in `packages/runtime/src/presets/history.ts` and
  `packages/runtime/src/presets/protocol.ts`.
- Added subpath exports so consumers can import only needed policy modules
  (`/selection`, `/snapping`, `/history`, `/protocol`) instead of always using
  one bundled entry.
- Added `createDefaultRuntimeModules(...)` as a composable default bundle API
  while preserving `createDefaultEditorModules(...)` as compatibility alias.

### 2026-04-12

- Added shared runtime-to-engine scene mapping helpers in
  `packages/runtime/src/presets/engineSceneAdapter.ts`:
  `createEngineSceneFromRuntimeSnapshot(...)` and
  `buildDocumentImageAssetUrlMap(...)`.
- Vector and playground canvas adapters now consume the same preset adapter
  path, reducing duplicated document->engine conversion logic and keeping shape
  geometry/style/transform mapping behavior aligned.
- Updated workspace alias/path wiring for `@venus/runtime/presets/*` to point
  at `packages/runtime/src/presets/*` (removed stale `presets/presets/*`
  references).
- Extended the shared scene adapter mapping to carry more document-model
  render semantics into engine nodes:
  rectangle corner radius, ellipse arc angles, line/path arrowheads, shape
  shadow style, text-run style payloads, and image clip rule forwarding.
