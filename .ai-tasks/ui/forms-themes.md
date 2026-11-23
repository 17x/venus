[CHANGE REQUEST]
Target: packages/ui and apps/ui-docs
Goal: Standardize composed inputs, optional tooltips, form sizing/responsive layout, and theme documentation.
Change type: Additive public UI contracts and UI Docs information-architecture revision
Impact: Adds InputGroup, NumberInput, WithTooltip, shared control sizes, responsive Field layouts, and Cartoon dark theme.
Cleanup: Replace UI Docs raw component imitations with public UI compositions; keep @venus/ui/vector as an editor profile, not a theme.
Tests: UI contract tests/typecheck, UI Docs and Engine Docs builds, browser keyboard/pointer/theme/responsive smoke checks.
