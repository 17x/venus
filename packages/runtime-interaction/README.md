# `@venus/runtime-interaction`

Shared editor interaction algorithms for Venus runtimes.

## Owns

- marquee selection
- selection handles and drag helpers
- snapping computations
- transform session and preview helpers

## Does Not Own

- worker lifecycle
- framework adapters
- product-specific UI or toolbars

Use this package for interaction behavior that should be shared across editor
surfaces while staying framework-agnostic.
