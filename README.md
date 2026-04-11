# Venus

Venus is a composable canvas runtime monorepo for building multi-editor products (vector, flowchart, mindmap, whiteboard).
The current active stack focuses on `vector-editor-web` and `playground`.

## Live Demo

- Vector App Demo:
[https://venus-db9.pages.dev/](https://venus-db9.pages.dev/)
- Playground: [https://lucasischow.github.io/demos/venus/playground/](https://lucasischow.github.io/demos/venus/playground/)


## Workspace Layout

- `apps/*`: runnable apps
  - `apps/vector-editor-web`: product-facing vector editor shell
  - `apps/playground`: runtime and rendering stress playground
- `packages/*`: shared editor infrastructure
  - `@venus/document-core`: document model and core types
  - `@venus/engine`: renderer contracts, scene render node model, frame clock, animation primitives
  - `@venus/runtime`: framework-agnostic runtime controller, viewport, worker bridge
  - `@venus/runtime-interaction`: shared interaction algorithms (selection, snapping, transform)
  - `@venus/runtime-react`: React adapters and viewport components
  - `@venus/editor-worker`: command execution and scene mutation in worker
  - `@venus/shared-memory`: SAB layout and scene snapshot helpers
  - `@venus/renderer-canvas`: Canvas2D renderer for active app surfaces
  - `@venus/renderer-skia`: Skia renderer with tile cache and diagnostics
  - `@venus/file-format`: schema and runtime format adapters
- `docs/*`: architecture and design docs

## Docs And Skills

- Docs home (Obsidian):
  - [`docs/00-Docs-Home.md`](/Users/yahone/projects/venus/docs/00-Docs-Home.md)
- Team-shared Codex skills (repo-local):
  - `.codex/skills`
- Sync repo skills into your local Codex home when needed:
  - `./tooling/codex/install-team-skills.sh`

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
pnpm --dir apps/playground dev
```

Run vector app directly:

```sh
pnpm --dir apps/vector-editor-web dev
```

## Runtime Data Flow

`vector-editor-web` / `playground` -> `@venus/runtime` + `@venus/runtime-interaction` + `@venus/runtime-react` -> `@venus/editor-worker` + `@venus/shared-memory` -> `@venus/engine` renderer contracts -> `@venus/renderer-canvas`

- UI and product actions stay in app layer.
- Worker owns scene mutation and command execution.
- Renderer consumes snapshot + viewport and currently draws with Canvas2D on the main active surfaces.

## Notes

- TypeScript project references are enabled via root `tsconfig.json`.
- Vite is pinned through `pnpm.overrides` in root `package.json`.
- Architecture doc: [./docs/architecture.md](/Users/yahone/projects/venus/docs/architecture.md)

## License

MIT. See [LICENSE](/Users/yahone/projects/venus/LICENSE).
