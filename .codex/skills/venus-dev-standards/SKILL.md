---
name: venus-dev-standards
description: Shared Venus engineering standards for code changes, code review, and repository-aware implementation. Use when Codex is working in the Venus monorepo and needs to apply consistent project context, coding constraints, validation expectations, or review criteria across implementation, refactoring, debugging, and review tasks.
---

# Venus Dev Standards

## Overview

Apply the shared Venus standards without duplicating them inside the skill. Keep the repo-level core files as the source of truth and use this skill as the Codex-specific entry point.

## Workflow

1. Read `references/loading-guide.md`.
2. Load `docs/ai-standards/core/project-context.md`, `docs/ai-standards/core/engineering-standards.md`, and `docs/ai-standards/core/monorepo-knowledge-base.md`.
3. Load `docs/ai-standards/core/current-work.md` when the user is continuing active implementation, resuming interrupted work, or switching back from a side task.
4. Load `docs/ai-standards/core/review-checklist.md` when the task is a review, audit, or risk check.
5. Read the local code that is directly relevant to the task before proposing architecture changes.
6. For every new feature or behavior change, add concise comments at non-obvious implementation points (complex branching, state transitions, algorithmic transforms, compatibility edges).
7. For every new feature or behavior change, update documentation in the closest module-level knowledge/doc file; if no module-specific file exists, fall back to `docs/ai-standards/core/monorepo-knowledge-base.md`.
8. For every public interface/protocol/type contract change, add or update inline/API comments describing parameter semantics, mode/flag behavior, and compatibility expectations.
9. Validate the changed scope with the smallest meaningful checks and report any gaps.
10. Treat feature delivery Done-Definition as mandatory: `code + required comments + required docs + typecheck` (and lint/tests when in scope). Missing any item means work is not complete.

## Implementation Rules

- Prefer local patterns over generic framework advice when they conflict.
- Keep diffs small and composable unless the task explicitly asks for a larger refactor.
- Treat `pnpm test` as non-authoritative until the repo gains real tests.
- Prefer `pnpm lint` and `pnpm typecheck` as stronger validation signals.
- Respect repo constraints such as no semicolons and no `@ts-ignore`.
- For scene/document modeling questions, check `packages/file-format` first and
  defer to its `node + feature` structure before introducing runtime-only
  terminology.

## Review Rules

- Prioritize correctness, regression risk, and validation gaps.
- Check boundaries between app, worker/runtime, renderer, and shared package layers.
- Call out unverified behavior plainly instead of implying certainty.

## Maintenance

- Update the shared core files first when standards evolve.
- Keep this skill focused on Codex invocation guidance and loading order.
- Use the monorepo knowledge base as the persistent handoff surface for durable
  repo knowledge and concise post-change summaries.
