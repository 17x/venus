# Venus Cursor Rules

Use `docs/ai-standards/core/project-context.md`, `docs/ai-standards/core/engineering-standards.md`, and `docs/ai-standards/core/review-checklist.md` as the source of truth.

## Default Behavior

- Read the relevant local files before editing
- Preserve existing project patterns unless the task clearly requires change
- Prefer minimal diffs with strong validation
- Call out assumptions and validation gaps explicitly

## Repo Notes

- This repo is a `pnpm` monorepo
- Favor root-level `pnpm lint` and `pnpm typecheck` when broad validation is needed
- `pnpm test` is currently not a real signal
