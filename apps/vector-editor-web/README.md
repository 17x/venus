# `@venus/vector-editor-web`

`vector-editor-web` is the product-facing editor app in the Venus monorepo.

## Run

From repo root:

```sh
pnpm --dir apps/vector-editor-web dev
```

Build:

```sh
pnpm --dir apps/vector-editor-web build
```

Type-check:

```sh
pnpm --dir apps/vector-editor-web exec tsc --noEmit
```

## Architecture in This App

Current runtime path:

`useEditorRuntime`
-> `runtime` + `runtime-interaction` + `runtime-react`
-> `editor-worker` + `shared-memory`
-> `renderer-skia`

Key points:

- The app is a UI shell (toolbar, header, panels, menu).
- High-frequency scene mutation runs in worker.
- Scene hot data lives in SAB and is read by renderer/runtime.
- `CanvasViewport` is a React adapter; gesture and zoom logic are extracted into shared modules.

## Important Files

- App entry:
  - [src/App.tsx](/Users/yahone/projects/venus/apps/vector-editor-web/src/App.tsx)
- Runtime orchestration:
  - [src/hooks/useEditorRuntime.ts](/Users/yahone/projects/venus/apps/vector-editor-web/src/hooks/useEditorRuntime.ts)
- Main frame:
  - [src/components/editorFrame/EditorFrame.tsx](/Users/yahone/projects/venus/apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- File/document adapter:
  - [src/adapters/fileDocument.ts](/Users/yahone/projects/venus/apps/vector-editor-web/src/adapters/fileDocument.ts)

## Performance Debugging

For large-scene debugging, use `apps/runtime-playground` first:

```sh
pnpm --dir apps/runtime-playground dev
```

Renderer diagnostics currently expose:

- tile counts / cache hits / misses
- rebuilt tile count
- draw and record costs
- slow-frame console logs with `[renderer-skia]` prefix

## Notes

- This app currently prioritizes runtime migration stability over final product polish.
- `canvaskit-wasm` chunk is large by design and may trigger size warnings in build output.
- Default mock document lives at `src/contexts/appContext/mockFile.ts` and now includes a denser mixed-shape baseline:
  grouped rectangles, rounded-corner variants, arc ellipse angles, multiple bezier paths, arrowhead line segments, and two clipped image assets. Use it for quick manual checks of selection, transform, layer order, clip-path, and style persistence flows.
