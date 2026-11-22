# Vector Editor Web

The main Venus product app. It owns editor UX, command policy, file workflows,
and browser persistence while consuming reusable engine and UI packages.

## Commands

```sh
pnpm --filter @venus/vector-editor-web dev
pnpm --filter @venus/vector-editor-web build
pnpm --filter @venus/vector-editor-web exec tsc --noEmit -p tsconfig.app.json
```

## Architecture

```text
app/views -> runtime product bridge
           -> @venus/editor-primitive
           -> @venus/engine
browser persistence -> @venus/document-core + @venus/sync-core
```

- `src/views`: product UI.
- `src/runtime`: app orchestration and adapters.
- `src/runtime/model`: app document/runtime model.
- `src/runtime/persistence`: IndexedDB, autosave, and sync composition.
- Generic graphics mechanisms belong in `@venus/engine`; product behavior stays
  here.

Important entrypoints:

- [src/app/App.tsx](./src/app/App.tsx)
- [src/runtime/useEditorRuntime/useEditorRuntime.ts](./src/runtime/useEditorRuntime/useEditorRuntime.ts)
- [src/runtime/useCanvasRuntimeBridge.ts](./src/runtime/useCanvasRuntimeBridge.ts)
- [src/views/editorFrame/EditorFrame.tsx](./src/views/editorFrame/EditorFrame.tsx)
- [src/runtime/adapters/fileDocument/fileDocument.ts](./src/runtime/adapters/fileDocument/fileDocument.ts)

The production build is offline-capable and saves locally before any optional
future synchronization. Default fixtures live under `src/runtime/presets/`.
