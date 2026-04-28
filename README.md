# Venus

Venus is a monorepo for a composable canvas editor runtime.

Current focus is `apps/vector-editor-web` as the product app. `apps/playground`
is kept as a diagnostics surface.

## Live demos

- Vector editor: [https://venus-db9.pages.dev/](https://venus-db9.pages.dev/)
- Playground: [https://venus-pla.pages.dev/](https://venus-pla.pages.dev/)

## Repo structure

- `apps/*`: runnable applications
  - `apps/vector-editor-web`: product-facing vector editor shell
    - app-local model alias: `@vector/model` -> `apps/vector-editor-web/src/model/index.ts`
  - `apps/playground`: runtime playground and rendering stress test app
- `packages/*`: shared editor infrastructure
  - `@venus/lib`: low-level shared primitives (`math`, `geometry`, `events`, `ids`, `patch`, ...)
  - `@venus/editor-primitive`: editor interaction primitives (`pointer`, `keyboard`, `overlay`, `cursor`, ...)
  - `@venus/engine`: renderer, hit-test, spatial/index, cache/scheduler mechanisms
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

`apps/*` -> app-local runtime bridge (`@vector/runtime*` aliases) + `@venus/editor-primitive` -> `@venus/engine`

- UI and product actions stay in the app layer.
- Shared interaction contracts and reducers stay in `@venus/editor-primitive`.
- The engine consumes render-ready snapshots/viewport state and owns render/hit-test mechanism.

## Vector Startup Troubleshooting

If vector "does not run", use this minimal sequence from repo root:

```sh
pnpm install
pnpm --filter @venus/vector-editor-web exec tsc --noEmit -p tsconfig.app.json
pnpm --filter @venus/vector-editor-web dev
```

If startup still fails:

- verify Node and pnpm: `node -v` and `pnpm -v`
- verify default port is free (`5173`) or pass `-- --port <port> --strictPort`
- verify workspace links: `pnpm --filter @venus/vector-editor-web list @venus/lib @venus/editor-primitive @venus/engine`

## Notes

- TypeScript project references are enabled through the root `tsconfig.json`.
- Vite is pinned through `pnpm.overrides` in the root `package.json`.
- Architecture overview: [`docs/architecture/overview.md`](./docs/architecture/overview.md)

## License

MIT. See [LICENSE](./LICENSE).
