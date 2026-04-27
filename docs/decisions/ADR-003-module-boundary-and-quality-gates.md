# ADR-003: Module Boundary And Quality Gates

## Status

Accepted

## Context

The repository already enforces high-level ownership boundaries, but it still
needs a clearer project-wide rule set for public APIs, command/history
contracts, test expectations, and AI-authored governance changes.

Different packages do not own the same concerns, so applying every quality gate
to every package creates noise and empty scaffolding.

## Decision

Adopt a capability-based governance rule set:

- Modules that cross package boundaries must expose explicit public APIs.
- Cross-package imports must not target another package's internal `src` or
  build-output paths.
- Modules that own persisted or collaborative mutation must define a typed
  command/history contract.
- Geometry and math logic must have deterministic unit tests in the owning
  module or package test surface.
- Rendering snapshot, performance benchmark, and E2E requirements apply only to
  packages or apps that own those surfaces.
- AI-authored structural or governance changes should be recorded in
  `AI_CHANGELOG.md` when they affect project rules, architecture, or shared
  workflow.

## Consequences

- The repo should prefer capability-aware governance over checklist-driven empty
  infrastructure.
- Forbidden-import lint should be introduced in phases, starting with internal
  package subpath bans and expanding only when migration debt is cleared.
- Architecture and workflow changes now have a stable decision record beyond
  ad hoc agent prompts or transient session context.

## Related Docs

- `../architecture/layering.md`
- `../engineering/coding-standards.md`
- `../engineering/testing.md`
- `../ai/project-rules.md`
