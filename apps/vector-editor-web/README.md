# `@venus/vector-editor-web`

`vector-editor-web` is the product-facing editor app in the Venus monorepo.

## Local Docs

- Product architecture and app-only integration notes live in
  `./docs/architecture.md`.
- Keep vector-specific documentation in this app directory instead of under
  global `docs/`.

## Run

From repo root:

```sh
pnpm --filter @venus/vector-editor-web dev
```

Build:

```sh
pnpm --filter @venus/vector-editor-web build
```

Type-check:

```sh
pnpm --filter @venus/vector-editor-web exec tsc --noEmit -p tsconfig.app.json
```

## Architecture in This App

Current runtime path:

`useEditorRuntime`
-> app-local runtime bridge (`@vector/runtime*` aliases)
-> `@venus/editor-primitive` interaction primitives
-> `@venus/engine`

Key points:

- The app is a UI shell (toolbar, header, panels, menu).
- Product-specific semantics stay in app-local `src/editor/**`.
- Shared interaction contracts are consumed through `src/runtime/interaction/index.ts`.
- `CanvasViewport` is a React adapter; gesture/zoom policy can be shared through `@venus/editor-primitive`.
- Product-specific documentation and adoption notes live with this app.

## Important Files

- App entry:
  - [src/App.tsx](./src/App.tsx)
- Runtime orchestration:
  - [src/editor/hooks/useEditorRuntime.ts](./src/editor/hooks/useEditorRuntime.ts)
  - [src/editor/hooks/useCanvasRuntimeBridge.ts](./src/editor/hooks/useCanvasRuntimeBridge.ts)
- Main frame:
  - [src/components/editorFrame/EditorFrame.tsx](./src/components/editorFrame/EditorFrame.tsx)
- File/document adapter:
  - [src/editor/adapters/fileDocument.ts](./src/editor/adapters/fileDocument.ts)

## Startup Troubleshooting

If the app does not start, run this sequence from repo root:

```sh
pnpm install
pnpm --filter @venus/vector-editor-web exec tsc --noEmit -p tsconfig.app.json
pnpm --filter @venus/vector-editor-web dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Quick checks:

- Verify Node and pnpm versions (`node -v`, `pnpm -v`).
- Verify package links (`pnpm --filter @venus/vector-editor-web list @venus/lib @venus/editor-primitive @venus/engine`).
- If port 5173 is occupied, pass another port via `-- --port <port> --strictPort`.

Known note:

- `pnpm --filter @venus/vector-editor-web lint` may fail `ui-style-guard` on existing style-boundary issues, but this does not block `dev` startup.

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
