# Venus

Venus is a local-first vector editor and reusable 2D graphics engine monorepo.

## Repository map

| Directory | Owns |
| --- | --- |
| `apps/vector-editor-web` | Main editor product |
| `apps/engine-docs` | Runnable engine documentation site |
| `apps/ui-docs` | Runnable shared UI catalog and API reference |
| `packages/engine` | Rendering, geometry, spatial, hit-test, and export mechanisms |
| `packages/editor-primitive` | Reusable editor interaction semantics |
| `packages/ui` | Shared UI primitives and themes |
| `packages/lib` | Domain-neutral foundations |
| `packages/document-core` | Stored-document envelopes and revisions |
| `packages/sync-core` | Optional synchronization boundary; disabled offline |
| `contracts` | Language-neutral schemas/protocols for browser, Node, Java, or native consumers |
| `services` | Future independently deployable backends |
| `docs` | Human architecture and ownership documentation |
| `AI` | Short AI rules and active technical direction |

Only directories with a `package.json` are pnpm apps/packages. Empty product
idea folders are not workspace applications.

## Dependency direction

```text
vector-editor-web
  -> engine + editor-primitive + ui
  -> document-core + sync-core
engine/editor-primitive/ui -> lib
```

Apps own product policy. Packages own reusable implementations. `contracts/`
defines cross-language boundaries; it does not contain runtime code.

See [repository ownership](./docs/ownership.md),
[repository layout](./docs/architecture/repository-layout.md),
[local-first architecture](./docs/architecture/local-first.md), and
[agent scope rules](./AGENTS.md).

## Development

Requirements: Node.js 20+ and pnpm 8.x.

```sh
pnpm install
pnpm dev
```

Common checks:

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Run a specific app:

```sh
pnpm --filter @venus/vector-editor-web dev
pnpm --filter @venus/engine-docs dev
pnpm --filter @venus/ui-docs dev
```

Documentation: [enginedoc.pages.dev](https://enginedoc.pages.dev/)

Vector demo: [venus-db9.pages.dev](https://venus-db9.pages.dev/)

## License

MIT. See [LICENSE](./LICENSE).
