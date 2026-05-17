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

Command policy:
- Prefer scoped checks first for speed.
- Run full checks before merge when changes cross module boundaries.
- Record failing command and first actionable error before patching.

Recommended extension points:
- Add app/package-specific command blocks as needed.
- Keep commands copy-paste ready.

Notes:
- If a task touches multiple top-level modules, run validation per module first, then run monorepo-level checks.
