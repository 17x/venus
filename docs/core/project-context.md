# Venus Project Context

## Product Shape

Venus is a composable canvas runtime monorepo for multi-editor products such as vector, flowchart, mindmap, and whiteboard experiences.

## Workspace Layout

- `apps/*`: runnable apps
- `packages/*`: shared editor/runtime infrastructure
- `docs/*`: architecture and design documents

## Primary Runtime Chain

Treat the current system as a layered runtime:

`apps/vector-editor-web` or `apps/playground`
-> `@venus/runtime` + `@venus/runtime/interaction`
-> `@venus/runtime/worker` + `@venus/runtime/shared-memory`
-> `@venus/engine` (Canvas2D renderer consumed by app layer)

Planned package direction for the active runtime family:

- `@venus/runtime`: framework-agnostic runtime core, viewport state/math, worker bridge, extensibility contracts
- `@venus/runtime/interaction`: shared editor interaction algorithms (runtime submodule under `packages/runtime/src/interaction`)
- `@venus/runtime/presets`: out-of-box default behavior packs and opinionated runtime presets (runtime submodule under `packages/runtime/src/presets`)

## Active Areas

- Prefer current work to align with `apps/vector-editor-web`
- Treat `apps/playground` as a runtime/rendering experiment surface
- Expect shared packages to be reused across editors

## Tooling Baseline

- Use `pnpm` for workspace commands
- Use TypeScript project references from the repo root
- Use ESLint rules from the root `eslint.config.js`
- Respect strict TypeScript settings from `tsconfig.base.json`
- Prefer existing `@venus/*` path aliases over long relative imports when crossing package boundaries

## Current Repo Signals

- Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`
- `pnpm test` is currently a placeholder and should not be presented as meaningful verification
- Semicolons are disallowed by lint rules
- Avoid `@ts-ignore`; the current lint config rejects it
- `allowImportingTsExtensions` is enabled, so local source imports may intentionally include `.ts` and `.tsx`

## Architecture Expectations

- Keep product UI concerns in app layers
- Keep scene mutation and command execution in worker-oriented layers
- Keep hit-test and render-optimization mechanisms in `@venus/engine`; runtime/worker should orchestrate those mechanisms instead of re-implementing them in app code
- Keep renderer and snapshot consumption concerns separated from editing commands
- Keep React focused on orchestration and product UI, not high-frequency runtime state
- Treat `@venus/runtime` as the framework-agnostic bridge between app UI and concrete worker/renderer packages
- Treat `@venus/runtime/interaction` as the shared editing-interaction layer
- Treat persisted model semantics as app-owned; vector currently uses the
	app-local alias `@vector/model`
- Treat framework adapters as sibling packages, not part of the framework-agnostic runtime core
- Treat runtime behavior presets as policy layers, not as core runtime ownership
