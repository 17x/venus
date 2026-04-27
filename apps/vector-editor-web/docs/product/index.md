# Vector Product Docs

This folder is the dedicated documentation space for vector-editor product
work.

## Scope

Keep vector-only content here:

- vector editor UI and interaction behavior
- vector product constraints, policies, and UX decisions
- vector feature implementation notes and migration notes
- vector-specific integration notes (inspector, layers, shortcuts, assets)

Keep monorepo-global content outside this folder:

- workspace governance and release process (`00_README.md`, `STATE.md`,
  `04_DECISIONS.md`, `05_CHANGELOG.md`, `06_TODO.md`)
- cross-package architecture and layer rules (`docs/architecture/*`,
  `docs/engineering/*`)
- shared package contracts and package ownership routing
- AI handoff and collaboration process (`docs/ai/*`)

## Separation Rules

1. If a doc describes shared contracts across apps/packages, place it in
   global docs.
2. If a doc is actionable only for vector-editor product behavior, place it
   here.
3. If a doc includes both global and vector content, split it:
   - keep cross-cutting principles in global docs
   - keep vector execution details in this folder
4. Link global docs from vector docs instead of duplicating text.

## Files

- `session-development-rules.md`: consolidated development rules defined and
  validated in the current session.
- `doc-separation-migration-plan.md`: migration recommendation list for
  separating monorepo-global docs and vector-only docs.