# Venus Copilot Instructions

Apply these rules to every AI-authored code change in this repository.

## Mandatory Comment Coverage

- Add a leading intent comment for every new or modified function.
- Prefer clarity-first coverage: comments should explain intent, decisions, invariants, and data-flow boundaries.
- Line-by-line comments are optional and should only be used where dense logic genuinely needs it.
- Add comments for non-trivial branches, fallbacks, cache/state transitions, thresholds, and compatibility edges.
- Comment-only placeholders are forbidden; comments must explain intent, decision, invariant, or data-flow meaning.
- Add comments inside functions at every non-obvious branch, fallback, cache/state transition, threshold, or compatibility edge whenever the behavior is not trivial from syntax alone.
- Add comment coverage when splitting files too; extracted modules are not exempt.

## Mandatory Type Documentation

- For new or modified `type`, `interface`, and object-shaped public contract definitions, comment the declaration itself.
- For each newly added or modified field/signature in those definitions, add a line-level comment immediately above it or an inline same-line comment.
- When a type contract changes semantics, update the nearest API comment in the same edit.
- All TypeScript `type`/`interface` declarations in AI-touched code must include clear semantic comments.
- All parameters of new or modified TypeScript functions must include JSDoc `@param` comments.
- Equivalent nearby parameter comments are not accepted as a replacement for JSDoc `@param`.

## Temporary Change Tag

- Every temporary workaround, guard, compatibility branch, fallback, or diagnostic-only patch must include an `AI-TEMP:` comment.
- Use this format: `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`.
- Do not leave plain `TODO`, `FIXME`, `HACK`, or `temporary` markers without the `AI-TEMP:` tag.

## File Shape Rule

- When a touched file approaches 400 lines and holds more than one responsibility, split it.
- When a touched file crosses 500 lines, split is required unless the file is generated.
- File splits must preserve ownership boundaries; do not move product policy into runtime or engine.

## Same-Name File Family Folder Rule

- When files share the same stem (for example: `a.ts`, `a.d.ts`, `a.test.ts`), they must be colocated inside a folder named after the stem (for example: `a/a.ts`, `a/a.d.ts`, `a/a.test.ts`).
- New additions must follow this structure directly; avoid creating new flat same-stem siblings in the parent directory.
- During refactors, migrate existing same-stem file families to the folder structure in the same change when safe.

## Execution Rule

- Read `docs/AI_HIGHEST_STANDARD.md` and `.github/copilot-instructions.md` before architecture-sensitive edits.
- If local instructions conflict, follow the stricter rule and keep scope minimal.
