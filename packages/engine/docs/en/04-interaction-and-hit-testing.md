# Interaction And Hit Testing

## 1. Domain Goal

Interaction modules provide mechanism algorithms for viewport mutation, snapping, transforms, and hit-test refinement.

## 2. Core Modules

1. `interaction/viewport`, `interaction/viewportPan`, `interaction/zoom`

- Viewport math, pan/zoom sessions, and anchor handling.

2. `interaction/hitTest`, `interaction/hitTolerance`

- Hit candidate refinement and tolerance policy.

3. `interaction/shapeTransform`

- Shape transform math and transform-session helpers.

4. `interaction/snapping`

- Geometric snapping primitives.

5. `interaction/geometryPayload`

- Geometry payload extraction for overlay and interaction visualization.

6. `interaction/lodProfile`, `interaction/lodConfig`, `interaction/lodTypes`, `interaction/visibilityLod`

- Interaction-phase quality degradation and LOD capability wiring.

7. `interaction/overlayCanvas`

- Mechanism-level overlay draw contract, not product UI behavior.

## 3. Relationship To Runtime And Renderer

1. Runtime interprets interaction phase and selects strategy/budget.
2. Renderer executes quality path based on runtime context plus interaction signals.
3. Interaction must not own scheduling policy or render backend decisions.

## 4. Known Constraint Points

1. Zoom-stop sharpness depends on strategy settling + renderer full-quality recovery.
2. High-speed pan/zoom paths must preserve deterministic anchor and matrix behavior.
3. Hit tolerance should stay declarative and not absorb product selection semantics.

## 5. Testing Priorities

1. Viewport regression tests for pan/zoom invariants.
2. Hit-test geometry edge cases (thin shapes, transformed nodes, clipping).
3. Interaction LOD transitions under pressure and scale extremes.
