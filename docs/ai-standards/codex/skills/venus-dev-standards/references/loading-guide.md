# Loading Guide

Read shared standards from the repo-level core directory.

## Always Read First

- `docs/ai-standards/core/project-context.md`
- `docs/ai-standards/core/engineering-standards.md`
- `docs/ai-standards/core/monorepo-knowledge-base.md`

## Read When Resuming Active Work

- `docs/ai-standards/core/current-work.md`

## Read When Reviewing Or Auditing

- `docs/ai-standards/core/review-checklist.md`

## Usage Note

Treat the core files as the source of truth. Keep this skill thin and update the core files first when standards change.

When a task adds or materially updates functionality:

- add concise comments at the non-obvious code paths you changed
- update the closest module-level knowledge/doc file first
- use `docs/ai-standards/core/monorepo-knowledge-base.md` only as the fallback
  when no narrower module knowledge file exists
- if public interfaces/protocols/types change, update API/inline comments for
  semantics and compatibility notes
- enforce Done-Definition before completion:
  `code + required comments + required docs + typecheck`
