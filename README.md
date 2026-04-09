# Venus

Venus is a composable canvas runtime monorepo for building multi-editor products (vector, flowchart, mindmap, whiteboard).
The current active stack focuses on `vector-editor-web` and `runtime-playground`.

## Live Demo

- Vector App Demo:
[https://venus-db9.pages.dev/](https://venus-db9.pages.dev/)
- Runtime playground: [https://lucasischow.github.io/demos/venus/playground/](https://lucasischow.github.io/demos/venus/playground/)


## Workspace Layout

- `apps/*`: runnable apps
  - `apps/vector-editor-web`: product-facing vector editor shell
  - `apps/runtime-playground`: runtime and rendering stress playground
- `packages/*`: shared editor infrastructure
  - `@venus/document-core`: document model and core types
  - `@venus/canvas-base`: runtime controller, viewport, gesture bridge
  - `@venus/editor-worker`: command execution and scene mutation in worker
  - `@venus/shared-memory`: SAB layout and scene snapshot helpers
  - `@venus/renderer-skia`: Skia renderer with tile cache and diagnostics
  - `@venus/file-format`: schema and runtime format adapters
- `docs/*`: architecture and design docs

## Requirements

- Node.js 20+
- `pnpm` 8.x

## UI Packages

- `@venus/ui`: local shared UI package for vector editor chrome and reusable primitives.
- shadcn-style component setup in `packages/ui/components.json`, with app-owned Tailwind CSS variables in `apps/vector-editor-web/src/index.css`.
- Radix UI primitives in `@venus/ui` for dialog, select, scroll area, and tooltip behavior.
- Tailwind CSS 4 for app and shared UI styling.

## Install

```sh
pnpm install
```

## Quick Start

From repo root:

```sh
pnpm dev
```

This runs `@venus/vector-editor-web`.

## Useful Commands

From repo root:

```sh
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
```

Run playground directly:

```sh
pnpm --dir apps/runtime-playground dev
```

Run vector app directly:

```sh
pnpm --dir apps/vector-editor-web dev
```

## Runtime Data Flow

`vector-editor-web` / `runtime-playground` -> `canvas-base` -> `editor-worker` + `shared-memory` -> `renderer-canvas`

- UI and product actions stay in app layer.
- Worker owns scene mutation and command execution.
- Renderer consumes snapshot + viewport and currently draws with Canvas2D on the main active surfaces.

## Notes

- TypeScript project references are enabled via root `tsconfig.json`.
- Vite is pinned through `pnpm.overrides` in root `package.json`.
- Architecture doc: [./docs/cn/architecture.md](/Users/yahone/projects/venus/docs/cn/architecture.md)

## License

MIT. See [LICENSE](/Users/yahone/projects/venus/LICENSE).
