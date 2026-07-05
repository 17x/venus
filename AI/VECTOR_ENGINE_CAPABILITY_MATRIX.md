# Vector / Engine Capability Matrix

**Date:** 2026-07-03
**Status:** P0 active matrix for `VECTOR_ENGINE_CAPABILITY_ALIGNMENT_TASK.md`

本文档记录当前 Vector 与 Engine 的真实能力差距。后续实现任务优先以本矩阵为
核对清单。

## 1. Source Files

Vector 侧主要来源：

- `apps/vector-editor-web/src/runtime/model/documentModel.ts`
- `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts`
- `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx`
- `apps/vector-editor-web/src/product/useEditorRuntime/useEditorRuntime.ts`
- `apps/vector-editor-web/src/runtime/primitive/overlayControl/`
- `apps/vector-editor-web/src/runtime/hittest/hitTestAdapter.ts`
- `apps/vector-editor-web/src/views/layerPanel/`

Engine 侧主要来源：

- `packages/engine/src/runtime/venus/Venus.ts`
- `packages/engine/src/runtime/venus/modules/`
- `packages/engine/src/scene/types/types.ts`
- `packages/engine/src/core/render.ts`
- `packages/engine/src/core/compose.ts`
- `packages/engine/src/core/cache/geometryCache.ts`
- `packages/engine/src/scene/spatial/`

## 2. Document Model Matrix

| Vector field/type | Engine current state | Target owner | Action |
| --- | --- | --- | --- |
| `frame` | Venus public model accepts bounds-owned `frame` and normalizes it to render `group` + background rect. Internal background can remap hit results to the public frame id. Vector adapter/renderer have an opt-in tree snapshot mode that emits frame as group + background, while default production mode remains flat. | Engine | Engine public model, hit remap, nested patch, opt-in adapter tree mode, renderer prop wiring, and localStorage QA flag complete; next validate visual parity before switching defaults. |
| `group` | Exists; bounds derive from children | Engine | Keep group source data id/children only; bounds remain derived/cache. |
| `rectangle` | Maps to engine `rect` | Engine | Align names or document alias strategy. |
| `ellipse` | Exists; has `ellipseGeometry` and arc fields | Engine | Keep, ensure Vector adapter uses structured fields consistently. |
| `polygon` | Exists | Engine | Keep, add parity tests for world/local point conversion. |
| `star` | Engine public model accepts `star` and normalizes to polygon render geometry | Engine | First-class public model alias complete; native parametric star model remains optional future work. |
| `lineSegment` | Engine has `line` with `points` anchors | Engine | Treat as alias; add document-model alias tests. |
| `path` | Exists with points/bezier/anchorPoints | Engine | Prefer anchorPoints/bezierPoints; add anchor editing hit-test parity. |
| `text` + `textRuns` | Exists as `text` + `runs`; SVG export now serializes run-level `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`, fill, and stroke overrides into tspans. | Engine | Adapter parity tests for style fields are in place; next deepen text layout/editing metrics. |
| `image` + `assetId/assetUrl` | Engine image uses `assetId`, preserves `assetUrl`, and exposes `inspectImageResources()` diagnostics against the host loader. | Engine | Engine resource diagnostics complete; Vector still needs explicit asset URL map/import path as the default host loader policy. |
| `parentId` | Venus public model is nested children, scene nodes can be nested | Engine | Add tree index service or parent lookup API as engine-owned. |
| `childIds` | Engine render scene stores nested children | Engine | Layer API should operate parent-local ordered ids. |
| `clipPathId/clipRule` | Engine has `clip.clipNodeId`, inline `clipShape`, `rule`, and clipped group hit pruning through `respectClip`. | Engine | Clip graph validation and clip-container hit/SVG parity are covered; node-level `clipNodeId` render/hit/export parity remains pending. |
| `fill/stroke/shadow` | Engine has deprecated flat fields and structured config | Engine | Vector adapter now emits structured `fillConfig` / `strokeConfig` while keeping flat compatibility fields. |
| `rotation` | Top-level Venus field | Engine | Keep top-level. |
| `flipX/flipY` | Vector model has fields; Engine public model does not fully own them | Engine with limits | Decide supported node types; image/text likely direct, shapes should prefer geometry/path rewrite. |

## 3. API Surface Matrix

| Capability | Current Engine API | Target API | Action |
| --- | --- | --- | --- |
| Hit test | `engine.hitTest(...)`, `engine.hitTestAll(...)` with `respectClip` policy | Same root-level API | Result details, locked filtering, and clip-container hit pruning are covered; continue clipNodeId parity and hidden-node policy. |
| Selection state | `select`, `deselect`, `selectAll`, `clearSelection`, `isSelected`, `getSelection`, `setSelection` | Root-level API | Basic root API complete; next add richer selection metadata. |
| Marquee selection | `querySelectionInRect`, `selectInRect` basic bounds implementation | Root-level API | Basic document/screen rect support complete; next replace candidate source with spatial/cache broad phase. |
| Layer order | `getLayerIndex`, `getLayerOrder`, `moveLayer`, `moveBefore`, `moveAfter`, `bringForward`, `sendBackward`, `bringToFront`, `sendToBack` | Root-level API installed by default `base` module | Basic ordering API is now owned by base module and exposed flat on Venus; next add patch/revision return shape. |
| Export | `exportPNG`, `exportJPEG`, `exportSVG`, `exportNode`, `exportSelection`; legacy `toPNG`, `toJPEG`, `toSVG` aliases | Root-level scene/node/selection export | SVG node/selection export complete; next add scoped raster export and clip parity. |
| Clip validation | `validateClipGraph`, `resolveClipDependencies` | Root-level clip graph validation API | Missing/self/cycle/rule/inline checks complete; clip-container hit and SVG parity covered; clipNodeId render/hit/export parity pending. |
| Camera | `fitBounds`, `zoomTo`, `panBy`, `project`, `unproject` | Root-level API | Keep. Optional animate integration only for smooth transitions. |
| History | `undo`, `redo`, `canUndo`, `canRedo`, `clearHistory` | Root-level API | Keep optional. Move toward patch-based history. |
| Geometry/math package helpers | `resolveNodeTransform`, affine helpers, bezier bounds/extrema, path closure, polyline close, rect-to-polyline | Package-level `@venus/engine` entrypoints, not `venus.*` root APIs | Core helpers now exported and used by Vector adapters/overlay; next migrate remaining duplicate geometry only after tests prove parity. |

Public API rule: no `engine.module.method` shape. Modules are installation units and docs categories;
runtime calls stay root-level.

## 4. Render Pipeline Matrix

| Concept | Vector current state | Engine current state | Action |
| --- | --- | --- | --- |
| Base | Vector syncs snapshots and dirty bounds into engine | Engine has base/layered render paths and cache pieces; default base module owns layer-order API, parent-local nested removal, group selection normalization, and single-node `reparent`; tree structure operation rules are fixed in `packages/engine/docs/en/architecture/tree-structure-operations.md`. | Continue moving base/active/overlay controls under base while keeping flat root APIs; next implement cross-parent group and multi-parent layer transactions in engine. |
| Overlay | Vector owns overlay styling/adapters and consumes engine `selectionOverlay` / `hoverOverlay` geometry payload fields for primary outlines | Engine has overlay renderer primitives, public polyline helpers, geometry payload overlays, and root `getSelectionOverlay` / `getHoverOverlay` style-free geometry APIs | Continue migrating detail outlines, transform handles, and anchor handles behind engine-owned overlay APIs. |
| Active | Vector resolves active node ids for live edits | Engine has active renderer pieces | Add root-level active-set API or internal interaction bridge. |
| Screen culling | Vector expects engine acceleration | Engine has spatial/culling infrastructure | Wire selection/hit-test rect queries to spatial/cache. |
| Geometry cache | Vector still computes some bounds/path payloads | Engine has AABB-oriented cache, path payload helpers | Expand cache tiers and invalidate from document patches. |
| Nested scene patch | Engine can now replace/remove existing nested render nodes, insert/reparent via `upsertParentId`/`upsertIndex`, and rebuild indexes for nested mutations. | Engine | Good internal base capability; next expose structure operations through render/layer module APIs rather than standalone diff helpers. |
| Local/world adapter coordinates | Vector adapter emits world-space node geometry. Opt-in tree mode preserves that geometry but attaches parent-local transforms, proving `parentWorld * childLocal = childWorld`; flat/tree world-bounds parity is covered for frame leaves. Renderer scene sync can opt into tree mode and uses parent-aware incremental patches for leaf updates plus complete-subtree upserts for group/frame updates. Structure-dirty tree scenes still full load. | Vector to Engine migration | Initial tree snapshot and non-structure patch path complete; next run browser visual parity and continue filling render/base APIs. |
| Hit target remap | Internal render nodes can expose `hitTargetId` so hit-test returns the public document id | Engine | Use for frame backgrounds, clip helpers, and future overlay proxy nodes. |
| Tiles/LOD | Engine has tile/LOD modules | Engine | Keep in render base; Vector only configures and validates. |

## 5. Vector Upgrade / Downgrade Matrix

| Area | Vector should upgrade to | Vector should downgrade/remove |
| --- | --- | --- |
| Model | Engine model consumer plus product extensions | Independent common document contract |
| Selection | UI command wrapper around engine selection APIs | Geometry filtering and marquee candidate ownership |
| Layers | Panel/shortcut shell over engine layer APIs | Direct child order mutation logic |
| Hit-test | Uses engine detailed hit result | Local geometry classifier |
| Overlay | Product styling over engine overlay model | Core overlay bounds/anchor model builder |
| Export | File/download UI around engine export APIs | Scene traversal and render/export core |
| Tests | Fixture source for engine regression tests | App-only coverage of generic engine behavior |

## 6. First Implementation Slices

1. Stabilize root export API names: `exportPNG`, `exportJPEG`, `exportSVG`. Done.
2. Add model parity tests for Vector node types vs engine model types. Baseline Vector adapter parity test done; `star` is engine-owned, `frame` is engine-owned in Venus but still render-adapter downgraded in Vector.
3. Add `getSelection` / `setSelection` root APIs. Done.
4. Add `querySelectionInRect` / `selectInRect` using spatial broad phase and geometry cache. Basic root API done; spatial/cache acceleration pending.
5. Add layer order APIs that return patch/revision data. Basic `getLayerOrder` / `moveBefore` / `moveAfter` complete; patch/revision return pending.
6. Add `exportNode` / `exportSelection`. SVG scoped export done; scoped raster export pending.
7. Add clip graph validation and use it from render, hit-test, and export tests. Root validation API, clip-container hit pruning, and SVG clip serialization are done; clipNodeId render/hit/export parity remains pending.
8. Add nested scene patch replacement/removal/insert/reparent. Existing nested nodes can now be updated without being appended to root, and new/moved nodes can target a parent via `upsertParentId` / `upsertIndex`.
