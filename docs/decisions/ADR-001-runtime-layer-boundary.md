# ADR-001: Runtime Layer Boundary

## Status

Accepted

## Context

Feature growth across vector/runtime/engine introduced ownership drift risk.

## Decision

Adopt strict layer ownership:

- App layer: product behavior and UI orchestration
- Runtime family: lifecycle, protocol, command and interaction policy
- Engine: rendering, hit-test, geometry, spatial mechanism

## Consequences

- Architecture-sensitive work must validate ownership before implementation.
- Runtime APIs remain framework-agnostic.
- Product layers cannot bypass runtime to mutate engine or worker internals.

## Related Docs

- `../architecture/layering.md`
- `../../04_DECISIONS.md`
