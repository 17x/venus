# Runtime Architecture

## Goal

Define runtime family responsibilities and reusable integration patterns.

## Runtime Family

- `@venus/runtime`: lifecycle, viewport state, worker bridge, runtime APIs
- `@venus/runtime/interaction`: shared editor interaction algorithms
- `@venus/runtime/worker`: command execution, history, scene mutation
- `@venus/runtime/shared-memory`: snapshot transport helpers

## Integration Approach

- Reuse runtime APIs with app-local framework bridge code.
- Keep product domain semantics in app and worker command layers.
- Keep renderer mechanism behind `@venus/engine` contracts.

## Runtime Owns

- Runtime lifecycle and viewport policy
- Worker command bridge and transport
- Shared interaction logic (marquee, snapping, transform sessions)

## Runtime Does Not Own

- Product UI policy and component state
- Product-specific domain rules
- File format product policy
- Engine mechanism internals

## Viewer Mode

`createCanvasViewerController` is suitable for read-only surfaces:

- document preview
- embedded read-only pages
- lightweight browse flows

Viewer mode handles viewport commands and optional hit-testing, but ignores editing commands.

## Mindmap Product Integration (Example)

1. Build app shell with `createDefaultCanvasRuntimeApi` + app-local viewport + renderer.
2. Add mindmap document/command adapters in app layer.
3. Extend worker with topic commands (`insert`, `rename`, `move`, `delete`).
4. Add edge rendering/hit behavior.
5. Wire undo/redo and file-format integration.
6. Add fold/layout features.

## Suggested App Structure

```text
apps/mindmap-editor
  src/
    adapters/
      mindmapDocumentAdapter.ts
      mindmapCommandAdapter.ts
    hooks/
      useMindmapRuntime.ts
    components/
      MindmapFrame.tsx
    worker/
      editor.worker.ts
```
