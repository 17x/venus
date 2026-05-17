# Module Map

Purpose:

- Provide a fast, execution-oriented map of module boundaries and dependencies.

Top-level layers:

- apps/: product composition and app adapters.
- packages/editor-primitive/: reusable editor primitives.
- packages/engine/: rendering/runtime engine core.
- packages/lib/: foundational shared libraries.

Dependency DAG (allowed):

- app -> editor-primitive
- app -> engine
- app -> lib
- editor-primitive -> lib
- engine -> lib

Forbidden:

- reverse edges across the DAG.
- direct editor-primitive -> engine dependency.
- cross-layer deep private imports.

Ownership model:

- Each module owns its runtime state transitions and contracts.
- Policy and runtime execution must remain separated.
- Public contracts should be defined before orchestration changes.

How to use this file during tasks:

1. Identify the layer of the target file.
2. Verify imports against DAG before editing.
3. Route shared concerns to the owning layer, not sideways.
4. If crossing boundaries is required, add/extend adapter contracts at app layer.

Recommended per-module override file (optional):

- packages/<module>/ai/override.md
- Include only local constraints, entry points, and high-risk paths.
