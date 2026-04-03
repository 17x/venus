# Venus

Venus is a vector editor monorepo built with TypeScript, React, Web Workers, and shared workspace packages.

## Monorepo

This repository uses `pnpm` workspaces.

- `apps/*`: runnable applications (for example `apps/vector-editor-web`)
- `packages/*`: shared libraries used by apps and other packages
- `docs/*`: project docs

Current active package flow for the editor stack:

- `@venus/document-core`
- `@venus/shared-memory`
- `@venus/editor-worker`
- `@venus/renderer-skia`
- `@venus/ui`

## Requirements

- Node.js 20+ recommended
- `pnpm` 8.x

## Install

```sh
pnpm install
```

## Development

Run from repository root:

```sh
pnpm dev
```

This starts the vector editor web app in `apps/vector-editor-web`.

## Scripts

From repository root:

```sh
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
```

Or run directly in the web app:

```sh
cd apps/vector-editor-web
pnpm dev
pnpm build
```

## Notes

- TypeScript uses project references (`tsconfig.json` + per-package `tsconfig`s).
- ESLint rules are managed from the root `eslint.config.js`.
- For architecture details, see `docs/cn/architecture.md`.

## License

MIT. See [LICENSE](./LICENSE).
