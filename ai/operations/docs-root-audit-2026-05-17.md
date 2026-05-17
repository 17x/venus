# Root Docs Audit (2026-05-17)

Scope:

- root-level docs under docs/

Current files in docs/:

- MONOREPO_RESPONSIBILITY_STANDARD.md
- index.md

Assessment:

- MONOREPO_RESPONSIBILITY_STANDARD.md: mixed audience (human + AI). Keep in docs.
- index.md: human-facing docs navigation. Keep in docs.

Moved out of root docs during cleanup:

- docs/AI_HIGHEST_STANDARD.md -> ai/AI_HIGHEST_STANDARD.md
- docs/archive/scattered/_ -> ai/archive/scattered/_
- scattered-docs-migration-log.md -> ai/operations/scattered-docs-migration-log.md

Conclusion:

- root docs no longer contains AI-only governance or generated migration artifacts.
- root/docs and root/ai now follow strict boundary separation.
