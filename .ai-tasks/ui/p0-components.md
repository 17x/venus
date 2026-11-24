[CHANGE REQUEST]
Target: packages/ui and apps/ui-docs
Goal: Add the next app-neutral P0 interaction components and document their composition.
Change type: Additive public UI contracts
Impact: Adds Combobox, DropdownMenu, Popover, Sonner toast integration, FormErrorSummary, and loading-button composition examples.
Cleanup: Reuse Base UI behavior primitives and existing Button, Field, Spinner, Alert, and theme tokens; do not add parallel custom overlay systems.
Tests: UI typecheck and contract tests, UI Docs and Engine Docs builds, browser keyboard/pointer/dark/responsive smoke checks.
