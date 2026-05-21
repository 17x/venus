# Engine AI Ops

Purpose:

- Provide engine-specific navigation and execution shortcuts for AI development and maintenance.
- Reduce cold-start lookup time for refactor/debug tasks in engine.

Use order:

1. Read ../../ai/workflow.md
2. Read ../../ai/rules-index.md
3. Use hotspot-index.md for task-entry navigation.
4. Use symptom-triage-map.md for bug-first navigation.
5. Run checks from ../../ai/commands.md and module-specific checks listed here.

Module-specific checks:

- Typecheck: pnpm --filter @venus/engine exec tsc --noEmit
- File-shape guard: pnpm governance:file-shape -- --changed --scope engine

Boundary reminder:

- This folder contains engine-only operational guidance.
- Do not place cross-repo generic AI guidance here.
