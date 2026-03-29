# Apps Workspace

Each app under `apps/*` is a product shell that composes reusable packages.

## Current Apps

- `vector-editor-web`: existing vector editor web app
- `streamline-editor`: new scaffold for flow/diagram editor
- `mindmap-editor`: new scaffold for mindmap editor

## Recommended Pattern

- Keep app bootstrapping and product workflows in `apps/*`
- Keep reusable engine, renderer, format, and UI primitives in `packages/*`
