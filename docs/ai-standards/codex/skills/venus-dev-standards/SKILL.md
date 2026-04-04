---
name: venus-dev-standards
description: Shared Venus engineering standards for code changes, code review, and repository-aware implementation. Use when Codex is working in the Venus monorepo and needs to apply consistent project context, coding constraints, validation expectations, or review criteria across implementation, refactoring, debugging, and review tasks.
---

# Venus Dev Standards

## Overview

Apply the shared Venus standards without duplicating them inside the skill. Keep the repo-level core files as the source of truth and use this skill as the Codex-specific entry point.

## Workflow

1. Read `references/loading-guide.md`.
2. Load `docs/ai-standards/core/project-context.md` and `docs/ai-standards/core/engineering-standards.md`.
3. Load `docs/ai-standards/core/review-checklist.md` when the task is a review, audit, or risk check.
4. Read the local code that is directly relevant to the task before proposing architecture changes.
5. Validate the changed scope with the smallest meaningful checks and report any gaps.

## Implementation Rules

- Prefer local patterns over generic framework advice when they conflict.
- Keep diffs small and composable unless the task explicitly asks for a larger refactor.
- Treat `pnpm test` as non-authoritative until the repo gains real tests.
- Prefer `pnpm lint` and `pnpm typecheck` as stronger validation signals.
- Respect repo constraints such as no semicolons and no `@ts-ignore`.

## Review Rules

- Prioritize correctness, regression risk, and validation gaps.
- Check boundaries between app, worker/runtime, renderer, and shared package layers.
- Call out unverified behavior plainly instead of implying certainty.

## Maintenance

- Update the shared core files first when standards evolve.
- Keep this skill focused on Codex invocation guidance and loading order.
