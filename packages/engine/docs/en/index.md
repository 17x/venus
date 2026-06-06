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
6. [Release API Baseline](api/release-api-baseline.md)
7. [Developer API](api/developer-api.md)
8. [Runtime API](api/runtime-api.md)
9. [Runtime Constraints API](api/runtime-constraints.md)
10. [Capability API](api/capability-api.md)
11. [Event API](api/event-api.md)
12. [3D-First Runtime And 2D Opt-In](concepts/3d-first-2d-opt-in.md)
13. [Resource And Asset Ingestion API](api/resource-asset-ingestion.md)
14. [Spatial Query Baseline](api/spatial-query-baseline.md)
15. [Timeline And Replay Baseline](api/timeline-replay-baseline.md)
16. [Backend Capability Matrix](backends/backend-capability-matrix.md)
17. [Release Backend Matrix](backends/release-backend-matrix.md)
18. [Interaction Primitives](editor-integration/interaction-primitives.md)
19. [Scenario Adapter Boundary Cookbook](editor-integration/scenario-adapter-boundary-cookbook.md)
20. [Breaking Changes](migration/breaking-changes.md)
21. [App Adapter Migration](migration/app-adapter-migration.md)
22. [Runtime World Navigation And Collision Migration](migration/runtime-world-navigation-collision-migration.md)
23. [Budgets and SLOs](performance/budgets-and-slos.md)
24. [Replay and Trace](diagnostics/replay-and-trace.md)
