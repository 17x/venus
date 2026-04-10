# Venus Project Context

## Product Shape

Venus is a composable canvas runtime monorepo for multi-editor products such as vector, flowchart, mindmap, and whiteboard experiences.

## Workspace Layout

- `apps/*`: runnable apps
- `packages/*`: shared editor/runtime infrastructure
- `docs/*`: architecture and design documents

## Primary Runtime Chain

Treat the current system as a layered runtime:

`apps/vector-editor-web` or `apps/runtime-playground`
-> `@venus/runtime` + `@venus/runtime-interaction` + `@venus/runtime-react`
-> `@venus/editor-worker` + `@venus/shared-memory`
-> `@venus/renderer-skia`

Planned package direction for the active runtime family:

- `@venus/runtime`: framework-agnostic runtime core, viewport state/math, worker bridge, extensibility contracts
- `@venus/runtime-interaction`: shared editor interaction algorithms such as marquee, snapping, selection handles, and transform sessions
- `@venus/runtime-react`: React adapters such as hooks, stores, and viewport/overlay components
- `@venus/runtime-presets`: out-of-box default behavior packs and opinionated runtime presets

## Active Areas

- Prefer current work to align with `apps/vector-editor-web`
- Treat `apps/runtime-playground` as a runtime/rendering experiment surface
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
- Keep renderer and snapshot consumption concerns separated from editing commands
- Keep React focused on orchestration and product UI, not high-frequency runtime state
- Treat `@venus/runtime` as the framework-agnostic bridge between app UI and concrete worker/renderer packages
- Treat `@venus/runtime-react` as the React-only adapter layer
- Treat `@venus/runtime-interaction` as the shared editing-interaction layer
- Treat `@venus/document-core` as the home for shared document model and primitive editor types
- Treat framework adapters as sibling packages, not part of the framework-agnostic runtime core
- Treat runtime behavior presets as policy layers, not as core runtime ownership
