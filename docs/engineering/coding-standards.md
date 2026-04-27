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
- Every newly written or modified code block must include an intent comment.
- Treat comments as required structure, not optional polish.
- Prefer concise but clear comments that explain intent and behavior, not vague labels.
- For migration and compatibility branches, include brief intent comments.
- Every newly written or modified function must include a leading comment.
- Inside functions, add comments at non-obvious branches, fallbacks, cache/state
  transitions, threshold decisions, and compatibility edges whenever behavior
  is not immediately obvious from the code alone.
- For new or modified `type`, `interface`, and object-shaped contract
  definitions, comment the declaration and each newly added or modified
  field/signature line with an adjacent line comment or inline comment.
- Keep source files under 500 lines where practical; if a file grows past 500,
  split by responsibility into focused modules.
- Treat file splits as mandatory documentation work too; extracted files must
  arrive with the same comment coverage as directly edited files.

## Temporary Guard Rules

- Do not ship long-lived hard-coded runtime kill switches in production paths
  (for example `const DISABLE_* = true` that bypasses major subsystems).
- If a temporary correctness/perf guard is unavoidable, it must be runtime-configurable,
  must include an inline `TODO` comment with clear removal criteria, and must
  reference the tracking doc/task where rollback criteria are recorded.
- Temporary guards must default to behavior consistent with the active product
  strategy and must not silently suppress key diagnostics counters.
- Every temporary workaround, compatibility branch, guard, fallback, or
  diagnostic-only patch must include an `AI-TEMP:` comment using the format:
  `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`.
- Do not leave plain `TODO`, `FIXME`, `HACK`, or `temporary` markers in changed
  code without the `AI-TEMP:` tag on the same logical change.

## Validation

- Prefer repo checks: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `pnpm test` is placeholder and must not be treated as meaningful verification.

## AI Hard Constraint

- Repository-level AI enforcement is implemented via
  `.github/hooks/ai-standards-enforcer.json`.
- The hook calls
  `.agents/skills/venus-standards-enforcer/scripts/posttooluse-enforce.sh`
  on `PostToolUse` and blocks continuation when changed code files violate the
  machine-checkable subset of these rules, including comment coverage gates,
  `AI-TEMP:` tagging gates, or ESLint checks.
- Treat hook failures as mandatory fix gates, not optional warnings.
