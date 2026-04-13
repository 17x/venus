# Venus Agent Instructions

Repo-level entry point for AI coding agents.
`docs/` is the documentation base; `docs/core/*` is the source of truth for standards.

## Load First

Before making changes, read:

- `docs/core/project-context.md` — workspace layout, runtime chain, tooling baseline
- `docs/core/engineering-standards.md` — code change rules, safety, validation
- `docs/core/monorepo-knowledge-base.md` — durable repo knowledge
- `docs/core/important-context.md` — layer boundaries, model truth, renderer direction

Also read when relevant:

- `docs/core/current-work.md` — when resuming or continuing active implementation
- `docs/core/review-checklist.md` — for reviews, audits, and risk checks
- `docs/architecture.md` — overall architecture and package responsibilities
- `docs/vector-editor-architecture.md` — vector editor module map, data flows, gaps, migration plan
- `docs/runtime-engine-responsibility-split.md` — ownership boundary between engine/runtime/app

If docs conflict, prefer newer core standards over older notes.

## Project Shape

Venus is a `pnpm` monorepo for composable canvas editor products.

- `apps/*` — runnable editor apps and diagnostics surfaces
- `packages/*` — shared runtime, worker, renderer, document, and UI infrastructure
- `docs/*` — architecture notes, standards, and handoff context

Priority areas: `apps/vector-editor-web` (product), `apps/playground` (diagnostics).

Runtime chain:

```
apps/* -> @venus/runtime + @venus/runtime/interaction -> @venus/runtime/worker + @venus/runtime/shared-memory -> @venus/engine
```

## Architecture Rules

### Layer boundaries

- **Product UI** — stays in app layers (`apps/*`)
- **Command execution, history, protocol** — stays in runtime/worker packages
- **Hit-test, render, spatial index** — stays in engine
- **Renderer** — consumes snapshots + viewport only
- **React** — orchestration and product UI only, not high-frequency runtime state

### Package roles

- `@venus/runtime` — framework-agnostic bridge between app UI and worker/renderer
- `@venus/document-core` — source of truth for persisted scene/document semantics
- `@venus/engine` — mechanism owner (render, hit-test, math, spatial index)
- `@venus/runtime/interaction` — shared editing interaction algorithms
- `@venus/runtime/presets` — default behavior packs (not core contracts)

### Three-layer rule (vector / runtime / engine)

- `vector` — product rules, product state, product entry points, command composition
- `runtime` — stable abstractions, command registry, hit-test adapter, interaction algorithms
- `engine` — high-performance rendering, geometry, spatial queries

**Do not**: push product rules into engine, push framework UI into runtime,
re-implement runtime capabilities in vector, let vector bypass runtime to
directly depend on engine internals.

## Code Style

- Read local code before changing architecture-sensitive paths
- Prefer small, composable diffs over broad rewrites
- Preserve existing TypeScript, React, import, and formatting patterns
- Use `@venus/*` aliases when crossing package boundaries
- No semicolons, no `@ts-ignore`
- Add concise comments at non-obvious logic points (state transitions, algorithmic transforms, compatibility edges)
- When changing public interfaces, update inline/API comments with parameter semantics

## Documentation

- Update the closest module-level doc for meaningful changes
- Fall back to `docs/core/monorepo-knowledge-base.md` if no narrower doc exists
- Update `docs/core/current-work.md` when a workstream changes direction
- Keep notes factual: what changed, where, why

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm test` is a placeholder — do not present as meaningful verification.
Report exactly what was and was not verified.

## Safety

- Do not revert unrelated user changes
- Avoid destructive commands unless explicitly requested
- Flag changes affecting runtime chain, worker protocol, renderer contract, or public API
- Prefer stable behavior over aggressive render-pipeline optimization unless asked
