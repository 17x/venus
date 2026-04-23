# Project State

## Current Phase

- Phase: vector editor architecture buildout and capability completion

## Confirmed Facts

- Runtime chain: `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`
- Product UI behavior stays in app layers; command/history/protocol stays in runtime worker paths.
- Persisted model truth stays in `@venus/document-core`.
- `apps/playground` is deprecated and retained only as historical diagnostics reference.

## Current Blockers

- No hard blocker. Main risk is documentation drift during ongoing architecture work.

## Next Step

- Continue vector capability delivery (`connector` then `boolean`) while keeping boundaries and docs synchronized.
- Execute Plan 2 workstreams in order: runtime structuring -> hit-test capability -> product completion -> regression consistency.
