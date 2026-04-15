# ADR-002: Documentation Governance Structure

## Status

Accepted

## Context

Long-running multi-person and AI-assisted development requires stable handoff,
routing, and source-of-truth hierarchy for markdown knowledge.

## Decision

Adopt domain-based documentation structure and root governance files:

- Root: `00_README.md`, `STATE.md`, `04_DECISIONS.md`, `05_CHANGELOG.md`, `06_TODO.md`
- Domains: `docs/product`, `docs/architecture`, `docs/engineering`, `docs/ai`, `docs/decisions`
- Canonical map: `docs/index.md`

## Consequences

- New durable knowledge must be routed to the correct domain document.
- Root README should stay concise and navigation-focused.
- Obsidian is used as a navigation layer; markdown files in repo are the source of truth.

## Related Docs

- `../engineering/doc-versioning.md`
- `../ai/doc-update-rules.md`
- `../../04_DECISIONS.md`
