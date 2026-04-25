# Venus

Venus is a monorepo for a composable canvas runtime used to build multi-editor products such as vector editors, flowchart tools, mind maps, and whiteboards.
The current active apps are `vector-editor-web` and `playground`.

## Live demos

- Vector editor: [https://venus-db9.pages.dev/](https://venus-db9.pages.dev/)
- Playground: [https://venus-pla.pages.dev/](https://venus-pla.pages.dev/)

## Repo structure

- `apps/*`: runnable applications
  - `apps/vector-editor-web`: product-facing vector editor shell
    - app-local model alias: `@vector/model` -> `apps/vector-editor-web/src/model/index.ts`
  - `apps/playground`: runtime playground and rendering stress test app
- `packages/*`: shared editor infrastructure
  - `@venus/engine`: renderer contracts, scene render node model, frame clock, and animation primitives
  - `@venus/runtime`: consolidated runtime package
    - `@venus/runtime`: core runtime and controller
    - `@venus/runtime/interaction`: interaction layer
    - `@venus/runtime/engine`: engine bridge
    - `@venus/runtime/presets`: reusable presets
  - `@venus/runtime/worker`: command execution and scene mutation in a worker
  - `@venus/runtime/shared-memory`: SharedArrayBuffer layout and scene snapshot helpers
  - `@venus/file-format`: schema and runtime format adapters
- `docs/*`: architecture and design documentation

## Documentation and team skills

- Docs home: [`docs/index.md`](./docs/index.md)
- Team-shared Codex skills: [`.codex/skills`](./.codex/skills)
- Install team skills into your local Codex home when needed:
  - `./tooling/codex/install-team-skills.sh`

## Requirements

- Node.js 20+
- `pnpm` 8.x

## UI packages

- App-owned UI package alias: `@vector/ui` -> `apps/vector-editor-web/src/ui/index.ts`
- Foundation token/styles: `apps/vector-editor-web/src/ui/foundation/*`
- Primitive components: `apps/vector-editor-web/src/ui/kit/components/ui/*`
- Tailwind CSS 4 + Radix UI primitives in vector app UI layer

## Install

```sh
pnpm install
```

## Quick start

From the repo root:

```sh
pnpm dev
```

This starts `@venus/vector-editor-web`.

## Common commands

From the repo root:

```sh
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
```

Run the playground directly:

```sh
pnpm --dir apps/playground dev
```

Run the vector editor directly:

```sh
pnpm --dir apps/vector-editor-web dev
```

## Runtime data flow

`vector-editor-web` / `playground` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`

- UI and product actions stay in the app layer.
- The worker owns scene mutation and command execution.
- The renderer consumes snapshots and viewport state, and currently renders with Canvas 2D on the active surfaces.

## Notes

- TypeScript project references are enabled through the root `tsconfig.json`.
- Vite is pinned through `pnpm.overrides` in the root `package.json`.
- Architecture overview: [`docs/architecture/overview.md`](./docs/architecture/overview.md)

## License

MIT. See [LICENSE](./LICENSE).
