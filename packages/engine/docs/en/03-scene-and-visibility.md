# Scene And Visibility

## 1. Scene Domain Goal

The scene domain maintains render-facing state and deterministic candidate extraction.

## 2. Core Submodules

1. `scene/types`

- Defines renderable node contracts and snapshot shape.

2. `scene/store`

- Owns scene storage, transactions, and revision lifecycle.

3. `scene/patch`

- Applies incremental updates for high-frequency mutations.

4. `scene/indexing` and `scene/spatial`

- Maintains coarse spatial index and candidate query acceleration.

5. `scene/worldBounds` and `scene/geometry`

- Computes transformed world bounds used by planning/culling.

6. `scene/framePlan` and `scene/hitPlan`

- Builds frame/hit candidate plans before renderer or exact hit refinement.

7. `scene/hit` and `scene/hitTest`

- Exact geometry-level hit solving over coarse candidates.

8. `scene/visibility` and top-level `visibility`

- Applies visibility filters (2D/3D policy, frustum/occlusion hooks).

## 3. Dataflow

1. Load/patch scene.
2. Recompute affected index regions.
3. Query viewport/hit candidates.
4. Resolve visibility and LOD-aware final sets.
5. Pass result to renderer and interaction paths.

## 4. Limits And Risks

1. Coarse index must never be interpreted as exact visibility.
2. Candidate pruning must preserve ancestry/descendency invariants for grouped nodes.
3. Any zero-candidate result with non-empty scene requires fallback validation in runtime/renderer.

## 5. Integration Rules

1. Runtime consumes scene plans, but does not directly mutate index internals.
2. Renderer consumes scene plans and visibility outputs, but should not define scene ownership rules.
3. Interaction hit-test refines scene candidates and should avoid product-level picking semantics.
