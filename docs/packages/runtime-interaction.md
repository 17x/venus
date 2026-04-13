# `@venus/runtime/interaction`

Package-scoped note for shared editor interaction algorithms.

## Stable Knowledge

- Logical import path: `@venus/runtime/interaction`.
- Implementation now lives under `packages/runtime/src/interaction`.
- Owns shared editor-interaction policy and app/runtime-facing adapters.
  Core mechanism helpers (for example marquee/handle/snapping primitives) may
  live in `@venus/engine` and be wrapped here for compatibility.
- Keep product-specific tool behavior in app layers and keep framework glue in
  app-local runtime bridge files.

## Recent Updates

### 2026-04-11

- Consolidated into runtime submodule layout under
  `packages/runtime/src/interaction`.

### 2026-04-11

- Snapping coarse-candidate lookup now uses engine-owned spatial index APIs
  (`createEngineSpatialIndex(...)` from `@venus/engine`) instead of the old
  standalone `@venus/spatial-index` package.
- Marquee, selection-handle, and move-snapping core algorithms now delegate to
  `@venus/engine` interaction APIs. `runtime-interaction` keeps
  editor/runtime-facing compatibility wrappers (for example matrix-aware
  guideline projection) so existing app imports continue to work while engine
  becomes the single mechanism owner.
- Viewport gesture collection/dispatch (`bindViewportGestures(...)`) now lives
  in `runtime-interaction` (`interaction/viewportGestures.ts`) and uses
  engine-owned matrix projection (`applyMatrixToPoint`) while delegating
  viewport state transitions and zoom wheel session core to engine-owned
  viewport/zoom mechanisms.
- Viewport scroll/middle-button pan delta math now also delegates to
  engine-owned helpers (`interaction/viewportPan.ts` via
  `accumulateEngineWheelPanOffset(...)` /
  `accumulateEnginePointerPanOffset(...)`). `runtime-interaction` keeps only
  DOM event binding + commit scheduling policy.
- Added shared zoom-sense preset policy in
  `interaction/zoomPresets.ts` (`RUNTIME_ZOOM_PRESETS` +
  `resolveRuntimeZoomPresetScale(...)`) so app command-level zoom stepping can
  stay aligned between vector and playground instead of drifting per-app.
- The same zoom preset policy now also governs wheel-zoom feel in
  `interaction/viewportGestures.ts`: mouse-wheel zoom snaps to the shared
  preset ladder, while trackpad zoom remains continuous.
- `bindViewportGestures(...)` now batches pan deltas into animation-frame
  viewport commits (`commit-each-frame`) so shared canvas surfaces stay on the
  pure redraw path without any CSS transform preview layer.
