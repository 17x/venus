# Venus

Venus is a local-first vector editor and reusable 2D graphics engine. The
repository contains the browser product, shared TypeScript packages,
language-neutral contracts, and documentation sites.

## Product status

- **Offline is the default:** the editor writes its working copy and recovery
  revisions to IndexedDB and ships an offline application shell.
- **Cloud sync is optional and currently disabled:** the sync contract and
  disabled provider exist, but network capabilities stay off until the online
  release gates are complete.
- **One product, not offline and online forks:** a future network edition keeps
  the same local write path and adds a remote provider after local persistence.

See [Local-first architecture](./docs/architecture/local-first.md) for the write
path and online release requirements.

## Quick start

Requirements: Node.js 20+ and pnpm 8.x.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the vector editor. Run a documentation app directly when
working on a shared package:

```sh
pnpm --filter @venus/engine-docs dev
pnpm --filter @venus/ui-docs dev
```

## Repository structure

```text
apps/                 runnable user-facing deployments
  vector-editor-web/  local-first editor product
  engine-docs/        engine examples and API documentation
  ui-docs/            shared UI catalog and API documentation

packages/             reusable TypeScript implementations
  engine/             rendering, geometry, hit testing, and export
  editor-primitive/   reusable editor interaction semantics
  ui/                 sole reusable UI component and theme owner
  lib/                domain-neutral foundations
  document-core/      stored-document envelopes and revisions
  sync-core/          optional synchronization contract and disabled provider

contracts/            versioned, language-neutral schemas and protocols
services/             independently deployed backend implementations
docs/                 architecture, ownership, and engineering documentation
AI/                   concise AI engineering rules and active direction
```

Only directories with a `package.json` are pnpm workspaces. `services/` is the
location for future deployable backends; it does not imply that a cloud backend
is currently available.

## Architecture

```text
editor command
    ↓
local document repository → IndexedDB + local recovery history
    ↓ after local success
optional sync provider → versioned contract → Node / Java / native service
```

Apps own product workflow and persistence policy. Packages own reusable
mechanisms. Cross-language consumers exchange versioned data through
`contracts/`; Java or native services never import TypeScript implementation
packages.

Primary dependency direction:

```text
vector-editor-web
  ├─ engine + editor-primitive + ui
  └─ document-core + sync-core

engine / editor-primitive / ui → lib
```

For placement and naming rules, read
[Repository layout](./docs/architecture/repository-layout.md) and
[Repository ownership](./docs/ownership.md).

## UI system

`packages/ui` is the only reusable UI implementation owner.

- `@venus/ui` provides app-neutral components, form contracts, tooltips, and
  Classic/Cartoon light and dark themes.
- `@venus/ui/vector` provides the dense vector-editor component profile. It is
  a product-specific profile, not another app-neutral theme.
- `apps/ui-docs` demonstrates the public library with the library itself and is
  the component/API reference.

Product apps may compose page layouts, but they must not copy shared primitives
into app-local UI libraries.

## SSR and backend services

Keep SSR code inside its owning web app when it deploys with that app. Put an
API, worker, gateway, or scheduled process in `services/` only when it is an
independently deployed executable.

Name a service by responsibility first and technology only when the technology
distinguishes parallel implementations, for example `sync-api-node`,
`sync-api-java`, or `render-worker-native`.

## Validation

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Use package filters for focused work:

```sh
pnpm --filter @venus/ui typecheck
pnpm --filter @venus/ui test
pnpm --filter @venus/ui-docs build
```

## Documentation

- [Documentation index](./docs/index.md)
- [Local-first architecture](./docs/architecture/local-first.md)
- [Repository layout](./docs/architecture/repository-layout.md)
- [Repository ownership](./docs/ownership.md)
- [UI package guide](./packages/ui/README.md)
- [Agent scope rules](./AGENTS.md)

Published sites:

- [Engine documentation](https://enginedoc.pages.dev/)
- [Vector editor demo](https://venus-db9.pages.dev/)

## License

MIT. See [LICENSE](./LICENSE).
