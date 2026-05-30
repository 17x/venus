# Spatial Query Baseline

Status: Release contract draft.
Scope: ENG-005.

Spatial APIs are generic query primitives. They must support picking, raycast-like selection, frustum filtering, measurement, clearance, and constraint checks without app-domain vocabulary.

## Required Query Families

- Point pick against 2D or 3D projected entities.
- Region or frustum query against scene bounds.
- Measurement between generic entities or points.
- Clearance and overlap checks for constraint systems.
- Dense-scene query diagnostics with deterministic result ordering.

## Determinism Rule

Queries must be stable for identical graph revision, view state, query options, and backend profile. Any approximation or pressure fallback must appear in diagnostics.

## Adapter Rule

Vector and playground adapters may call public query APIs only. They must not import private engine spatial index modules.
