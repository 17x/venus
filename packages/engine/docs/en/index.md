# Venus Engine Official Documentation

Version: Draft (2026-05-21)
Audience: Engine integrators, adapter developers, runtime maintainers

## Purpose

This documentation defines the official, stable reference for the `@venus/engine` public surface.
It is not a marketing overview. It is the normative source for API semantics, parameter contracts, and governance rules.

## Documentation Taxonomy

1. Concepts

- Architecture and boundaries
- Data-flow model
- API governance

2. API Reference

- Developer API (`engine.*`)
- Runtime API (`engine.runtime.*`)
- Capability API (`engine.capability.*`)
- Event API (`engine.events.*` + event domains)

3. Runtime Internals

- Compilation, dirty propagation, planning, command submission

4. Diagnostics and Reliability

- Metrics, traces, frame capture, replay

5. Performance and Budgeting

- Frame/query/upload budgets and regression gates

## API Naming Policy

Allowed public namespaces only:

- `engine.*`
- `engine.runtime.*`
- `engine.capability.*`
- `engine.events.*`

Disallowed:

- Industry semantics (`medical`, `bim`, `gis`, `cad`, `finance`, `video`, `game`) in public API names.

## Stability Levels

Every documented API must declare one level:

- `experimental`: may change in minor versions.
- `beta`: shape mostly stable, semantics still tightening.
- `stable`: breaking changes only in major versions.

## Required Contract Fields Per API

Each API page must include:

- Signature
- Parameters table (name, type, required, constraints)
- Return schema
- Error codes and recovery guidance
- Determinism notes (if relevant)
- Performance-budget impact (if relevant)
- Related events

## Reading Order

1. [Architecture](concepts/architecture.md)
2. [API Governance](concepts/api-governance.md)
3. [Event Contract Governance ADR](concepts/event-contract-governance-adr.md)
4. [Playground Demo Deep Analysis and API Requirements](concepts/playground-demo-deep-analysis-2026-05-24.md)
5. [API Overview](api/overview.md)
6. [Developer API](api/developer-api.md)
7. [Runtime API](api/runtime-api.md)
8. [Capability API](api/capability-api.md)
9. [Event API](api/event-api.md)
10. [Backend Capability Matrix](backends/backend-capability-matrix.md)
11. [Interaction Primitives](editor-integration/interaction-primitives.md)
12. [Breaking Changes](migration/breaking-changes.md)
13. [App Adapter Migration](migration/app-adapter-migration.md)
14. [Budgets and SLOs](performance/budgets-and-slos.md)
15. [Replay and Trace](diagnostics/replay-and-trace.md)
