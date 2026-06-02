# API Governance

This document defines mandatory governance rules for `@venus/engine` public APIs.

## 1. Namespace Governance

Allowed public namespaces:

- `engine.*`
- `engine.runtime.*`
- `engine.capability.*`
- `engine.events.*`

Any other public namespace is rejected by policy.

## 2. Semantic Boundary

Engine APIs must remain capability-oriented.
Product semantics must stay in app/domain adapters.

Rejected naming examples:

- `engine.medical.*`
- `engine.bim.*`
- `engine.gis.*`

Accepted pattern:

- `engine.capability.field.*`
- `engine.capability.geo.*`
- `engine.capability.timeline.*`

## 3. Runtime Namespace Governance

Runtime APIs must expose generic 3D-first execution concepts.

Canonical runtime namespaces:

- `engine.runtime.navigation.*` for generic agents, waypoint paths, path constraints, and deterministic stepping.
- `engine.runtime.collision.*` for generic obstacles, colliders, broadphase queries, trigger events, and collision resolution.
- `engine.runtime.world.*` for compiled world/document foundation APIs.

Compatibility aliases under `engine.runtime.world.*` may exist for migration, but new scenario adapters must use the canonical namespace when a canonical namespace exists.

Rejected runtime API patterns:

- `engine.runtime.game.*`
- `engine.runtime.vehicle.*`
- `engine.runtime.city.*`
- `engine.runtime.navigation.pedestrianTrafficRules`
- `engine.runtime.collision.roadBlocker`
- 2D-specific runtime movement or collision names

Required promotion checklist for runtime APIs:

- API payloads are product-neutral and 3D-first.
- Capability registry stability is updated when an API moves to `stable`.
- EN/CN API docs and migration docs are updated together.
- Contract tests cover deterministic behavior and compatibility aliases when aliases remain.

## 4. API Change Workflow

1. Define or update contract.
2. Update EN and CN docs in the same change.
3. Add or update contract tests.
4. Add event emissions to docs if behavior is observable.
5. Run quality gates.

## 5. Required PR Gates

- Contract coverage gate
- EN/CN parity gate
- API docs coverage gate
- Namespace policy gate
- Determinism gate (for timeline/simulation/replay)

## 6. Breaking Change Policy

An API change is breaking if it changes:

- Signature
- Required parameters
- Return schema
- Error behavior
- Event emission order semantics

Breaking changes require:

- Major version target
- Migration guide entry
- Explicit changelog note
