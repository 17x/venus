# Packages Workspace

Packages under `packages/*` are reusable implementation layers shared by apps.

## Responsibility Boundary

- Own stable runtime, worker bridge, renderer, geometry, and document semantics.
- Own reusable interaction algorithms and app-agnostic protocol contracts.
- Avoid product-specific UI policy and route-level orchestration.

## Current Packages

- `document-core`: persisted document model and schema-level semantics.
- `engine`: render, hit-test, geometry, and spatial mechanics.

## Usage Rules

- Apps compose package capabilities; packages do not import app modules.
- Cross-layer changes should preserve: app -> runtime -> worker/shared-memory -> engine.
- Public package APIs should evolve with backward-compatible intent whenever practical.
