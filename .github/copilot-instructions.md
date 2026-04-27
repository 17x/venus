# Venus Copilot Instructions

Apply these rules to every AI-authored code change in this repository.

## Mandatory Comment Coverage

- Add a leading intent comment for every new or modified function.
- Add comments inside functions at every non-obvious branch, fallback, cache/state transition, threshold, or compatibility edge whenever the behavior is not trivial from syntax alone.
- Add comment coverage when splitting files too; extracted modules are not exempt.

## Mandatory Type Documentation

- For new or modified `type`, `interface`, and object-shaped public contract definitions, comment the declaration itself.
- For each newly added or modified field/signature in those definitions, add a line-level comment immediately above it or an inline same-line comment.
- When a type contract changes semantics, update the nearest API comment in the same edit.

## Temporary Change Tag

- Every temporary workaround, guard, compatibility branch, fallback, or diagnostic-only patch must include an `AI-TEMP:` comment.
- Use this format: `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`.
- Do not leave plain `TODO`, `FIXME`, `HACK`, or `temporary` markers without the `AI-TEMP:` tag.

## File Shape Rule

- When a touched file approaches 400 lines and holds more than one responsibility, split it.
- When a touched file crosses 500 lines, split is required unless the file is generated.
- File splits must preserve ownership boundaries; do not move product policy into runtime or engine.

## Execution Rule

- Read `docs/engineering/coding-standards.md`, `docs/ai/project-rules.md`, `AGENTS.md`, and `CLAUDE.md` before architecture-sensitive edits.
- Treat the repository PostToolUse hook as a hard gate.
- When the hook blocks a change, fix the code or comments before continuing.
