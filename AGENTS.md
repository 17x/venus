# Venus Agent Instructions

Use this file as the repo-level entry point for AI coding agents.
Treat `docs/` as a single documentation base and `docs/core/*` as the source of truth for standards.

## Load First

Before making changes, read:

- `docs/core/project-context.md`
- `docs/core/engineering-standards.md`
- `docs/core/monorepo-knowledge-base.md`
- `docs/core/important-context.md`

Also read:

- `docs/core/current-work.md` when resuming work, continuing an
implementation thread, or switching back from a side task.
- `docs/core/review-checklist.md` for reviews, audits, and risk
checks.
- `docs/architecture.md` and `docs/runtime-mindmap-guide.md` when the
task touches architecture, runtime layering, or mindmap integration.

If docs conflict, prefer the newer core standards and root README over older notes.
Canvas2D is the current active renderer path for vector and playground iteration;
runtime apps consume it through `@venus/runtime-react` + `@venus/engine`.

## Project Shape

Venus is a `pnpm` monorepo for composable canvas editor products such as vector,
flowchart, mindmap, and whiteboard editors.

- `apps/*`: runnable editor apps and diagnostics surfaces.
- `packages/*`: shared runtime, worker, renderer, file-format, document, and UI
infrastructure.
- `docs/*`: architecture notes, standards, and handoff context.

Current priority areas:

- Prefer product-facing work in `apps/vector-editor-web`.
- Use `apps/playground` as the Canvas2D runtime and rendering diagnostics
bench.
- Keep shared behavior reusable across future editor surfaces.

Primary runtime chain:

```text
apps/* -> @venus/runtime + @venus/runtime-interaction + @venus/runtime-react -> @venus/editor-worker + @venus/shared-memory -> @venus/engine
```

## Architecture Rules

- Keep product UI and orchestration in app layers.
- Keep scene mutation, command execution, hit-testing, history, and protocol
handling in worker/runtime-oriented packages.
- Keep renderer code focused on consuming document snapshots and viewport state.
- Keep React focused on orchestration and product UI, not high-frequency runtime
state.
- Treat `@venus/runtime` as the bridge between app UI and worker/renderer
packages, not as a product-specific UI layer.
- Treat `packages/file-format` as the source of truth for persisted
scene/document semantics.
- Prefer the file-format `node + feature` model when reasoning about geometry,
content, image, serialization, or document compatibility behavior.
- Treat `@venus/document-core` runtime nodes as adapters where they differ from
persisted file-format semantics.

## Code Style

- Read the relevant local code before changing architecture-sensitive paths.
- Prefer small, composable diffs over broad rewrites.
- Preserve existing TypeScript, React, import, and formatting patterns.
- Use existing `@venus/*` aliases when crossing package boundaries.
- Local source imports may intentionally include `.ts` or `.tsx`; follow nearby
style.
- Do not add semicolons.
- Do not use `@ts-ignore`.
- Avoid speculative abstractions unless they remove current duplication or real
complexity.
- Keep package entrypoints intentional and small.
- Add concise comments only where the implementation would otherwise be hard to
parse, such as complex branching, state transitions, algorithmic transforms,
or compatibility edges.
- Treat comment upkeep as required handoff quality: when adding or changing
  non-obvious logic, include concise inline comments in the same diff so a new
  context can understand intent without re-deriving it from scratch.
- When changing public interfaces, protocols, or exported type contracts, update
inline/API comments with parameter semantics, mode/flag behavior, and
compatibility expectations.

## Documentation

For every meaningful feature, behavior, architecture, or standards change:

- Update the closest module-level knowledge or architecture document.
- If no narrower document exists, add a concise note to
`docs/core/monorepo-knowledge-base.md`.
- Update `docs/core/current-work.md` when a major active workstream
changes direction, is paused, or is replaced.
- Keep architecture-level docs under `docs/architecture.md` and
  `docs/runtime-mindmap-guide.md`.
- Keep package-level notes under `docs/packages/*`.

Keep notes factual: what changed, where it lives, and why it matters.

## Validation

Use the smallest meaningful validation for the changed scope.

Preferred commands from the repo root:

```sh
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm test` currently prints a placeholder and should not be presented as
meaningful verification.

If full validation is too expensive or not run, report exactly what was and was
not verified.

## Safety

- Do not revert unrelated user changes.
- Avoid destructive commands unless the user explicitly requested them.
- State assumptions when local context is incomplete.
- Flag changes that affect the runtime chain, worker protocol, renderer
contract, file format, or public package API.
- Prefer stable behavior over aggressive render-pipeline optimization unless the
user explicitly asks for optimization work.
