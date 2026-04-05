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
- Add comments only where the code would otherwise be hard to parse
- When shipping a new feature or materially updating an existing one, add
  concise code comments at the non-obvious implementation points so the change
  remains legible to the next context
- Keep package entrypoints clean and intentional; export only the surface that should be reused
- Use strict typing to model the domain instead of bypassing errors with assertions or ignore comments
- Prefer extending existing `@venus/*` modules over creating parallel helpers in app code
- Preserve the repository's existing import and formatting style, including extension-bearing local imports where already used
- Treat `packages/file-format` as the source of truth for persisted scene/document
  semantics; describe runtime or app-only structures as adapters, not competing
  canonical models
- Prefer the file-format `node + feature` model when reasoning about geometry,
  content, and serialization behavior

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
  factual knowledge note into the most relevant module-level knowledge/doc file;
  if no module-specific file exists, fall back to
  `docs/ai-standards/core/monorepo-knowledge-base.md`

## Communication Rules

- Summarize user-facing impact first
- Keep explanations short unless the request asks for depth
- When reviewing code, prioritize bugs, regressions, and missing tests over style nits
- Use concrete file references when explaining important changes
- Call out when a change affects the runtime chain, worker protocol, or public package API
