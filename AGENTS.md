# Venus Agent Instructions

Repo-level entry point for AI coding agents.
`docs/` is the documentation base. Canonical entrypoints are `docs/index.md` and `docs/ai/handoff.md`.

## Load First

Before making changes, read:

- `00_README.md` — project entry and source-of-truth order
- `STATE.md` — current phase, key facts, blockers, next step
- `docs/index.md` — documentation map
- `docs/architecture/overview.md` — architecture overview
- `docs/architecture/layering.md` — layer ownership boundaries
- `docs/engineering/coding-standards.md` — code change rules and validation
- `docs/ai/handoff.md` — AI handoff and reading order

Also read when relevant:

- `docs/core/current-work.md` — active implementation status details
- `docs/core/review-checklist.md` — review and risk checklist
- `apps/vector-editor-web/docs/architecture.md` — vector app module map, product boundary, and local integration notes
- `docs/architecture/runtime.md` — runtime-specific integration notes

If docs conflict, follow `docs/engineering/doc-versioning.md` priority order.

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
- `@vector/model` — vector app-local model alias for persisted scene/document semantics
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
- Every newly written or modified code block must include a comment.
- Prefer concise but clear intent comments, but do not leave fresh code uncommented.
- Every newly written or modified function must include a leading comment.
- Inside functions, add comments at non-obvious branches, fallbacks,
  cache/state transitions, threshold choices, and compatibility edges.
- For new or modified `type`, `interface`, and object-shaped contract
  definitions, comment the declaration and each newly changed field/signature line.
- Keep source files under 500 lines where practical; split oversized files by
  ownership/responsibility boundaries.
- File splits and extracted modules are not exempt from the comment rules.
- When changing public interfaces, update inline/API comments with parameter semantics
- Every temporary workaround, compatibility branch, guard, fallback, or
  diagnostic-only patch must include an `AI-TEMP:` comment in the format:
  `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`.
- AI agents must follow `.github/copilot-instructions.md` and treat the
  PostToolUse standards hook as a hard gate for all file edits and file splits.

## Documentation

- Update the closest module-level doc for meaningful changes
- Fall back to `docs/core/monorepo-knowledge-base.md` if no narrower domain doc exists
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
