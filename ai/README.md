# AI Execution Docs

Purpose:
- Keep AI-operational guidance separate from human-oriented product/architecture docs.
- Provide fast, deterministic execution rules for refactor, debug, and development tasks.

Scope:
- This directory is for agent execution guidance only.
- Human-facing architecture and background documents stay in docs/.

Authoritative rule sources:
- docs/AI_HIGHEST_STANDARD.md
- .github/copilot-instructions.md

Directory contents:
- workflow.md: required execution sequence for non-trivial changes.
- module-map.md: module relationships, boundaries, and allowed dependencies.
- search-playbook.md: fast file/symbol discovery protocol and search budget.
- rules-index.md: index from common tasks to hard rules and checks.
- commands.md: standard verification commands and run order.

Operating model:
- Root-level AI docs are the default.
- Module-level ai/ subfolders are optional and should only include local overrides.
- Do not duplicate global rules inside module-level files; reference root docs.

Maintenance policy:
- Keep documents concise and executable.
- Prefer checklists and command snippets over long prose.
- Update ai/ docs in the same PR when workflows or governance checks change.
