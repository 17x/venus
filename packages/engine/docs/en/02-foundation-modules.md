# Foundation Modules

## 1. Purpose

Foundation modules provide reusable primitives that must stay independent from renderer/runtime policy decisions.

## 2. Module Breakdown

1. `math`

- Matrix and dimension contracts (`Mat3`, vectors, frustum/ray types).
- Numeric transform helpers used by scene, interaction, renderer.

2. `geometry`

- Shape and boundary computation primitives.
- Shared geometric routines for hit-test and culling preparation.

3. `time`

- Clock abstraction for deterministic scheduling and testability.

4. `utils`

- Small shared helpers and assertion-style utilities.

5. `types`

- Shared contract fragments reused across modules.

6. `transform`

- Canonical transform adaptation and composition helpers.

7. `camera`

- Camera pose/projection contracts used by 2D/3D-compatible runtime wiring.

8. `material` and `lighting`

- Material and lighting data contracts; renderer-facing shading metadata.

9. `resource` and `assets`

- Resource loading and binary/canvas asset support primitives.

10. `platform`

- Environment capability normalization and host abstraction seams.

11. `animation`

- Engine-level easing/controller primitives for deterministic animation-driven viewport updates.

## 3. Cross-Module Relationships

1. Scene relies on math/geometry/time for bounds and index updates.
2. Interaction relies on math/transform/camera contracts.
3. Renderer uses math/types/resource/material/lighting but should not push policy back into foundation.
4. Runtime uses foundation only through domain APIs, not by bypassing ownership boundaries.

## 4. Constraints

1. Foundation modules cannot import renderer/runtime/worker layers.
2. Avoid embedding product semantics into foundational types.
3. Keep constants named and traceable for threshold-sensitive behavior.

## 5. Validation Focus

When changing foundation modules:

1. Verify no reverse dependency is introduced.
2. Re-run all affected hit-test and renderer tests because geometric drift is high-impact.
3. Confirm exported type contracts stay stable unless explicitly versioned.
