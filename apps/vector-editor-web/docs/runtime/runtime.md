# Vector Runtime Integration

Vector app local runtime integration note. This file captures how
`apps/vector-editor-web` consumes runtime capabilities and what boundaries must
stay stable.

## Stable Runtime Boundary

- Runtime owns worker bridge, runtime lifecycle, viewport orchestration, and
  typed command/event surfaces.
- Runtime must remain framework-agnostic.
- Product-specific tool behavior and editor-shell UI stay in vector app code.

## Ownership Summary

- Runtime owns framework-agnostic orchestration and engine-facing bridge
  surfaces.
- Runtime owns command/history/protocol ownership in runtime worker paths.
- Vector app owns product policy, panel behavior, and app-local integration
  wiring.

## Non-Goals

- No React hook implementation detail in runtime core ownership docs.
- No engine-internal mechanism ownership in this integration note.
- No global timeline detail; keep timeline in changelog.

## Current Direction

- Keep runtime framework-agnostic.
- Keep command/history/protocol ownership in runtime and runtime worker paths.
- Keep vector app integration notes here, close to product code.