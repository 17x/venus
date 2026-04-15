# Coding Standards

## Baseline

- Read local code before changing architecture-sensitive paths.
- Prefer small, composable diffs over broad rewrites.
- Preserve repository TypeScript/React conventions.
- Use `@venus/*` aliases for cross-package imports.
- No semicolons and no `@ts-ignore`.

## Architecture-Sensitive Rules

- Keep product UI concerns in app layers.
- Keep command/history/protocol flow in runtime worker paths.
- Keep render/hit-test/math/index mechanism in engine.
- Keep `@venus/runtime` framework-agnostic.

## Readability Rules

- Use explicit names and intentional module boundaries.
- Add concise comments only at non-obvious logic points.
- For migration and compatibility branches, include brief intent comments.

## Validation

- Prefer repo checks: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `pnpm test` is placeholder and must not be treated as meaningful verification.
