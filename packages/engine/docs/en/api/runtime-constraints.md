# Runtime Constraints API

The experimental `engine.runtime.constraints` namespace projects candidate 3D positions or
scalar values into product-neutral feasible sets. Constraints do not generate motion.
Input, animation, AI, or a product adapter must provide the candidate state.

Stability: `experimental`

## Supported Primitives

- `line`, `segment`, `plane`, `circle`, `polyline`
- `scalar-range`
- `angle-range`, expressed in radians and supporting intervals across the `-PI/PI` seam

## Registry

### `engine.runtime.constraints.register(set)`

Registers or replaces a constraint set. Rules are evaluated by descending `priority`, then by
declaration order. Empty set ids throw.

### `engine.runtime.constraints.unregister(setId)`

Returns `{ removed, constraintSetCount }`.

### `engine.runtime.constraints.get(setId)`

Returns the registered set or `null`.

### `engine.runtime.constraints.getAll()`

Returns registered sets in deterministic registration order.

## Resolve

### `engine.runtime.constraints.resolve(input)`

Projects a transient candidate without mutating the scene graph.

```ts
engine.runtime.constraints.register({
  id: "ring",
  rules: [{
    constraint: {
      id: "ring-surface",
      kind: "circle",
      center: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      radius: 10,
    },
  }],
});

const result = engine.runtime.constraints.resolve({
  constraintSetId: "ring",
  candidate: { position: { x: 20, y: 0, z: 5 } },
});
```

The result contains:

- `status`: `satisfied`, `corrected`, or `unsatisfied`
- resolved `pose` and optional `scalar`
- `correctionDistance`
- deterministic `activeConstraintIds`
- structured `violations`
- bounded `iterations`

## Errors And Recovery

- Missing set: returns `unsatisfied` with `missing-constraint-set`.
- Degenerate geometry: returns `unsatisfied` with `degenerate-geometry`.
- Scalar rule without scalar input: returns `unsatisfied` with `missing-scalar`.
- Correctable candidates return `corrected` with `outside-tolerance` diagnostics.

## Determinism And Budget

The same normalized set and candidate produce the same result. P0 resolution performs one
bounded pass over rules. Entity binding, replay integration, debug geometry, and iterative
relational solving are not part of this experimental slice.

## Adapter Boundary

A 2D adapter represents planar behavior using 3D planes/circles and converts the resolved
generic point back into document state. Game or simulation adapters generate desired motion
before applying constraints and collision. Product semantics must remain outside Engine.

Runtime navigation follows this separation: its path driver generates a desired next position,
then a generic active-segment constraint corrects path drift before state commit.
