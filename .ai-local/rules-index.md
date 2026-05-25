# Rules Index

Purpose:

- Map common engineering tasks to the exact governing rules and checks.

Primary authorities:

- .ai/AI_NATIVE_ENGINEERING_GOVERNANCE.md
- .ai/REPO_GOVERNANCE_PREFERENCES_EXTRACTED.md
- .ai-local/AI_HIGHEST_STANDARD.md
- .github/copilot-instructions.md

Task to rules mapping:

Refactor across files

- Follow mandatory workflow sequence.
- Enforce file split trigger rules.
- Preserve ownership boundaries.

Public type/interface changes

- Add semantic declaration comments.
- Add field-level comments.
- Add param documentation for modified/new functions.

Temporary workaround / fallback / guard

- Add AI-TEMP marker with reason, removal condition, and reference.

Large file handling

- Soft trigger near 500 lines with mixed responsibilities.
- Hard trigger above 600 lines.

Dependency hygiene

- Respect DAG and avoid reverse edges.
- Avoid private deep imports across layers.

Validation

- Run typecheck.
- Run lint.
- Run targeted tests.
- Run governance guards.

Definition of done

- Behavior preserved or explicitly updated.
- No dead code from replaced paths.
- Checks pass for touched scope.
