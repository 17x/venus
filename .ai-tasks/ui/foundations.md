[CHANGE REQUEST]
Target: packages/ui and apps/ui-docs
Goal: Expand the shared UI foundation and document its interaction, accessibility, and fallback contracts.
Change type: Public UI additions and documentation
Impact: Adds app-neutral components and shared behavior without changing existing exports.
Cleanup: Keep editor-specific controls in @venus/ui/vector; do not create app-local copies.
Tests: UI contract tests, package typecheck/tests, UI Docs build, and browser keyboard/pointer smoke checks.
