# Runtime Mindmap Integration Guide

## Goal

Use the current runtime package family to ship an extensible mindmap editor without waiting for a large platform rewrite.

## Recommended Approach

- Reuse `@venus/runtime` and `@venus/runtime-react` for lifecycle/viewport/worker bridge.
- Keep mindmap semantics (topic/edge/fold/layout) in app + worker command layers.
- Start with Canvas2D renderer from `@venus/runtime-react` (engine-backed).

## What Runtime Packages Own

- `@venus/runtime`: lifecycle, viewport, command bridge, worker transport
- `@venus/runtime-react`: React hooks/components (`useCanvasRuntime`, `useCanvasViewer`, `CanvasViewport`)
- `@venus/runtime-interaction`: shared editing interaction algorithms

## What They Do Not Own

- Product UI behavior and panel/menu policy
- Mindmap domain semantics
- Mindmap file format definition
- Product rendering style decisions

## Viewer Mode

`useCanvasViewer` is suitable for read-only mindmap surfaces:

- document preview
- embedded read-only pages
- lightweight browse flows

Viewer mode handles viewport commands and optional hit-testing, but ignores shape-editing commands.

## Suggested Mindmap Delivery Steps

1. Build app shell with `useCanvasRuntime` + `CanvasViewport` + Canvas2D renderer.
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
