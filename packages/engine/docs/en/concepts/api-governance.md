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

## 3. API Change Workflow

1. Define or update contract.
2. Update EN and CN docs in the same change.
3. Add or update contract tests.
4. Add event emissions to docs if behavior is observable.
5. Run quality gates.

## 4. Required PR Gates

- Contract coverage gate
- EN/CN parity gate
- API docs coverage gate
- Namespace policy gate
- Determinism gate (for timeline/simulation/replay)

## 5. Breaking Change Policy

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
