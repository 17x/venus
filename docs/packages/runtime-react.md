# `@venus/runtime/react`

Archived legacy note: runtime-react source and subpath were removed from active
runtime package exports. Keep this file only as migration-era context.

Package-scoped note for the React adapter layer over the Venus runtime stack.

## Stable Knowledge

- Owns React hook/store adapters for runtime and viewer controllers.
- Import path is `@venus/runtime/react`.
- Implementation now lives under `packages/runtime/src/react`.
- Depends on `@venus/runtime` (including `@venus/runtime/interaction` APIs);
  runtime-side packages must not depend back on React.

## Recent Updates

### 2026-04-11

- Consolidated into runtime submodule layout under
  `packages/runtime/src/react`.

### 2026-04-11

- Removed renderer/component surface from `@venus/runtime/react`
  (`renderer/*`, `CanvasViewport`, `CanvasSelectionOverlay`) to keep this
  layer focused on React runtime adapters only.

### 2026-04-11

- `useCanvasRuntime` now instantiates the editor-instance runtime path
  (`createCanvasEditorInstance`) instead of the bare controller so app hooks
  can pass runtime modules (`modules`) without rewriting app-level runtime
  orchestration.
- `CanvasViewport` no longer supports DOM preview transforms. Shared canvas
  surfaces now always use the pure canvas viewport path (`commit + redraw`)
  instead of wrapping renderer output in a CSS-transform preview layer.
- `Canvas2DRenderer` now keeps an overscanned viewport bitmap cache for the
  pure canvas interaction path. During interactive same-scale pan, the renderer
  can blit from that cached bitmap instead of re-drawing every visible shape on
  each frame. Cache diagnostics (`cacheHitCount`, `cacheMissCount`,
  `cacheMode`) are also exposed through `useCanvas2DRenderDiagnostics()`.
- `Canvas2DRenderer` still exposes a migration-era engine backend preference
  surface (`backend: 'canvas2d' | 'webgl'`), but the current engine direction
  is WebGL-primary. Treat Canvas2D here as legacy app-bridge and diagnostics
  infrastructure, not as a peer renderer target for new engine work.

### 2026-04-12

- Added `useDefaultCanvasRuntime(...)` in
  `packages/runtime/src/react/useDefaultCanvasRuntime.ts` to centralize
  editor-runtime boot wiring with default runtime preset modules.
- Vector editor runtime now consumes this shared hook instead of assembling
  default modules inside app-local hook code.
