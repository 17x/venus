# Venus Engineering Standards

## How To Work

- Read the local code before changing architecture-sensitive paths
- Prefer small, composable changes over broad rewrites
- Preserve existing patterns unless there is a clear reason to introduce a new one
- State assumptions when the local context is incomplete
- Check whether a change belongs in `apps/*` orchestration or in a shared `packages/*` layer before editing

## Code Change Rules

- Match the repository's TypeScript and React style before introducing new patterns
- Keep public API changes intentional and easy to trace
- Avoid speculative abstraction unless it removes repeated, current pain
- Prefer explicit names over short clever ones
- Prefer responsibility-driven package names and boundaries over generic buckets such as `base` or `core`
- Add comments only where the code would otherwise be hard to parse
- When shipping a new feature or materially updating an existing one, add
  concise code comments at the non-obvious implementation points so the change
  remains legible to the next context
- Treat this as a required deliverable, not a nice-to-have: non-obvious control
  flow, state transitions, algorithmic transforms, compatibility paths, and
  public contract semantics should ship with concise comments in the same change
- Keep files small enough to scan quickly; split large mixed-responsibility files and folders when a module is carrying more than one clear job
- Prefer a few short, factual comments at boundary points and complex branches over long prose blocks or comment-heavy implementations
- Keep package entrypoints clean and intentional; export only the surface that should be reused
- Use strict typing to model the domain instead of bypassing errors with assertions or ignore comments
- Prefer extending existing `@venus/*` modules over creating parallel helpers in app code
- Preserve the repository's existing import and formatting style, including extension-bearing local imports where already used
- Treat `packages/file-format` as the source of truth for persisted scene/document
  semantics; describe runtime or app-only structures as adapters, not competing
  canonical models
- Prefer the file-format `node + feature` model when reasoning about geometry,
  content, and serialization behavior
- Keep framework code out of framework-agnostic runtime packages; runtime core packages must not depend on React, Vue, or another UI framework
- Separate mechanism from policy: runtime core owns lifecycle, transport, viewport state, and shared contracts, while presets and app layers own opinionated behavior
- Keep renderer mechanism contracts in `@venus/engine` (renderer adapters,
  frame clock, animation primitives, and render node contracts such as text
  runs/image clipping) instead of duplicating them across runtime or app layers
- Use adapter packages for framework integration and preset packages for out-of-box behavior
- When organizing runtime code, prefer the `runtime-*` family split:
  `@venus/runtime` for portable runtime core,
  `@venus/runtime/interaction` for shared editing interaction algorithms,
  `@venus/runtime/react` for React adapters,
  and `@venus/runtime/presets` for default behavior packs

## Safety Rules

- Do not revert user changes that are unrelated to the task
- Avoid destructive commands unless explicitly requested
- Flag architectural or behavior-changing tradeoffs before committing to them
- Treat generated output and placeholders as temporary unless verified
- Avoid moving worker/runtime responsibilities into React state just to simplify a local component

## Validation Rules

- Run the smallest meaningful validation for the files you changed
- Prefer `pnpm lint` and `pnpm typecheck` for repo-wide confidence when practical
- If full validation is too expensive, run targeted checks and say what was not verified
- Report validation gaps plainly
- Treat architecture docs and actual exports as part of validation when changing package boundaries or runtime flow
- After shipping a meaningful feature addition or behavior update, write a short
  factual knowledge note into the most relevant package/module-level knowledge
  file under `docs/packages/*` when available; if no narrower file
  exists, fall back to
  `docs/core/monorepo-knowledge-base.md`

## Communication Rules

- Summarize user-facing impact first
- Keep explanations short unless the request asks for depth
- When reviewing code, prioritize bugs, regressions, and missing tests over style nits
- Use concrete file references when explaining important changes
- Call out when a change affects the runtime chain, worker protocol, or public package API
