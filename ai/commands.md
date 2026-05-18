# Commands

Purpose:

- Standard command set for fast and consistent validation.

Core validation sequence:

1. Typecheck

- pnpm --filter @venus/engine exec tsc --noEmit

2. Governance guard

- pnpm governance:file-shape -- --changed --scope engine

3. Module governance check

- node scripts/module-governance-check.mjs

4. Targeted tests

- Run module-specific tests based on changed files.

Execution mode templates:

Fast Loop (default during implementation)

1. Scoped typecheck

- pnpm --filter @venus/engine exec tsc --noEmit

2. Changed-scope file-shape guard

- pnpm governance:file-shape -- --changed --scope engine

3. Targeted tests only

- Run tests for touched package/path.

Release Loop (milestone or handoff)

1. Monorepo typecheck

- pnpm typecheck

2. Lint + module governance

- pnpm lint
- pnpm governance:check

3. Broad tests

- pnpm test

4. Broad file-shape guard

- pnpm governance:file-shape

One-command shortcuts (recommended)

1. Fast Loop shortcut

- pnpm ai:fast-loop

2. Release Loop shortcut

- pnpm ai:release-loop

Command policy:

- Prefer scoped checks first for speed.
- Run full checks before merge when changes cross module boundaries.
- Record failing command and first actionable error before patching.
- Record in handoff which loop (Fast Loop or Release Loop) was last executed.

Recommended extension points:

- Add app/package-specific command blocks as needed.
- Keep commands copy-paste ready.

Notes:

- If a task touches multiple top-level modules, run validation per module first, then run monorepo-level checks.
