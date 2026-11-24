[CHANGE REQUEST]
Target: packages/ui, apps/ui-docs, and root README.md
Goal: Standardize composed inputs, validation states, optional tooltips, form sizing/responsive layout, theme documentation, and the repository entry guide.
Change type: Additive public UI contracts and UI Docs information-architecture revision
Impact: Adds InputGroup, NumberInput, WithTooltip, shared control sizes, propagated Field states, responsive layouts, Cartoon dark theme, and a local-first repository overview.
Cleanup: Replace UI Docs raw component imitations with public UI compositions; keep @venus/ui/vector as an editor profile, not a theme.
Tests: UI contract tests/typecheck, UI Docs and Engine Docs builds, browser keyboard/pointer/theme/responsive smoke checks.
