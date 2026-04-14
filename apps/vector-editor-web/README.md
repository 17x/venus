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
-> `runtime/worker` + `shared-memory`
-> `engine` (Canvas2D via `runtime-react` renderer)

Key points:

- The app is a UI shell (toolbar, header, panels, menu).
- High-frequency scene mutation runs in worker.
- Scene hot data lives in SAB and is read by renderer/runtime.
- `CanvasViewport` is a React adapter; gesture and zoom logic are extracted into shared modules.

## Important Files

- App entry:
  - [src/App.tsx](./apps/vector-editor-web/src/App.tsx)
- Runtime orchestration:
  - [src/hooks/useEditorRuntime.ts](./apps/vector-editor-web/src/hooks/useEditorRuntime.ts)
- Main frame:
  - [src/components/editorFrame/EditorFrame.tsx](./apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- File/document adapter:
  - [src/adapters/fileDocument.ts](./apps/vector-editor-web/src/adapters/fileDocument.ts)

## Performance Debugging

For large-scene debugging, use `apps/playground` first:

```sh
pnpm --dir apps/playground dev
```

Renderer diagnostics currently expose:

- draw count
- visible shape count
- draw duration
- render diagnostics from `Canvas2DRenderer`

## Notes

- This app currently prioritizes runtime migration stability over final product polish.
- Default mock document lives at `src/contexts/appContext/mockFile.ts` and now includes a denser mixed-shape baseline:
  grouped rectangles, rounded-corner variants, arc ellipse angles, multiple bezier paths, arrowhead line segments, and two clipped image assets. Use it for quick manual checks of selection, transform, layer order, clip-path, and style persistence flows.
