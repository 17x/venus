# Engine Generic Constraint System Design (2026-06-04)

## 0. Decision

Constraint capability belongs in Engine because it is shared by authoring tools, games,
simulation, CAD, path planning, and runtime interaction.

The Engine API must remain 3D-first and product-neutral:

- Engine owns generic constraint descriptions, deterministic evaluation, composition,
  diagnostics, and optional debug geometry.
- Product/runtime adapters own product meaning and compile it into Engine constraints.
- Engine must not expose `vectorHandler`, `gameCharacter`, `artboard`, `road`, or similar
  product-specific constraint types.
- A 2D constraint is represented as a 3D constraint restricted to a plane.

## 1. Important Separation: Constraint Is Not Motion

These two capabilities must not be merged:

- **Constraint** answers: "Which state is valid, and what is the closest valid state?"
- **Driver / motion** answers: "Which state is desired at this time or from this input?"

The common execution order is:

1. Input, animation, AI, or a path driver proposes a candidate state.
2. Constraint evaluation projects or corrects the candidate into the feasible set.
3. Collision/physics may resolve contacts.
4. Constraint evaluation optionally performs a final stabilization pass.
5. Runtime commits the resolved state and emits diagnostics.

Examples:

- Vector ellipse-angle handler:
  pointer ray proposes a point; a circle-on-plane constraint projects it onto the ring;
  adapter converts the resolved point into the document angle.
- Vector corner-radius handler:
  pointer proposes a scalar; an interval constraint clamps it to the shape-dependent range.
- Game vehicle:
  path driver proposes the next pose; corridor/surface/orientation constraints and collision
  resolve the final pose.
- CAD assembly:
  input proposes a transform; axis/plane/distance constraints solve the valid assembly pose.

## 2. Scope

### 2.1 P0: Deterministic Projection Constraints

P0 must support one-shot projection of a candidate onto a constraint set:

- point
- line
- ray
- segment
- plane
- axis
- circle
- sphere
- axis-aligned bounds
- oriented bounds
- scalar interval
- angular interval
- polyline/path

P0 covers Vector2D special handlers, transform controls, simple gameplay movement ranges,
camera limits, and deterministic path-following correction.

### 2.2 P1: Constraint Composition and Runtime Binding

- Compose multiple constraints using stable order and priority.
- Hard constraints must be satisfied or report failure.
- Soft constraints return weighted corrections without pretending the result is exact.
- Bind a constraint set to a generic entity transform channel.
- Support world, parent, local, and named-reference spaces.
- Expose debug geometry and structured violation diagnostics.
- Record constraint inputs/results in deterministic replay.

### 2.3 P2: Iterative and Relational Solving

- entity-to-entity distance/orientation constraints
- hinge, slider, look-at, and attachment constraints
- surface and spline constraints
- iterative multi-body solving
- physics integration and stabilization policies

P2 must extend the same public model rather than introduce scenario-specific solvers.

## 3. Public API Draft

Names are provisional; API shape and separation are normative.

```ts
export interface EngineVec3 {
  x: number;
  y: number;
  z: number;
}

export interface EngineQuat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface EnginePose {
  position: EngineVec3;
  rotation?: EngineQuat;
  scale?: EngineVec3;
}

export type EngineConstraintSpace =
  | { kind: "world" }
  | { kind: "local" }
  | { kind: "parent" }
  | { kind: "reference"; entityId: string };

export type EngineConstraint =
  | { id: string; kind: "point"; point: EngineVec3 }
  | { id: string; kind: "line"; origin: EngineVec3; direction: EngineVec3 }
  | { id: string; kind: "ray"; origin: EngineVec3; direction: EngineVec3 }
  | { id: string; kind: "segment"; start: EngineVec3; end: EngineVec3 }
  | { id: string; kind: "plane"; origin: EngineVec3; normal: EngineVec3 }
  | { id: string; kind: "circle"; center: EngineVec3; normal: EngineVec3; radius: number }
  | { id: string; kind: "sphere"; center: EngineVec3; radius: number }
  | { id: string; kind: "bounds"; min: EngineVec3; max: EngineVec3 }
  | { id: string; kind: "scalar-range"; min?: number; max?: number }
  | { id: string; kind: "angle-range"; axis: EngineVec3; min?: number; max?: number }
  | { id: string; kind: "polyline"; points: readonly EngineVec3[]; loop?: boolean };

export interface EngineConstraintRule {
  constraint: EngineConstraint;
  mode?: "hard" | "soft";
  priority?: number;
  weight?: number;
  space?: EngineConstraintSpace;
  channels?: readonly ("position" | "rotation" | "scale" | "scalar")[];
}

export interface EngineConstraintSet {
  id: string;
  rules: readonly EngineConstraintRule[];
  iterationLimit?: number;
  tolerance?: number;
}

export interface EngineConstraintResolveInput {
  constraintSetId: string;
  candidate: EnginePose;
  previous?: EnginePose;
  scalar?: number;
  context?: Readonly<Record<string, unknown>>;
}

export interface EngineConstraintResolveOutput {
  status: "satisfied" | "corrected" | "unsatisfied";
  pose: EnginePose;
  scalar?: number;
  correctionDistance: number;
  activeConstraintIds: readonly string[];
  violations: readonly EngineConstraintViolation[];
  iterations: number;
}
```

Proposed facade namespace:

```ts
engine.runtime.constraints.register(set)
engine.runtime.constraints.update(setId, patch)
engine.runtime.constraints.unregister(setId)
engine.runtime.constraints.resolve(input)
engine.runtime.constraints.bind(binding)
engine.runtime.constraints.unbind(bindingId)
engine.runtime.constraints.getDiagnostics(options?)
engine.runtime.constraints.getDebugGeometry(options?)
```

`resolve()` is the P0 API and must work without binding constraints to a scene entity.
This allows editors to use the system for transient drag previews without mutating the graph.

## 4. Adapter Examples

### 4.1 Vector2D Special Handler

Vector runtime creates a transient plane-restricted circle:

```ts
{
  id: "ellipse-start-angle",
  rules: [
    {
      constraint: {
        id: "ellipse-ring",
        kind: "circle",
        center: { x: cx, y: cy, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        radius,
      },
      mode: "hard",
      channels: ["position"],
    },
  ],
}
```

The Engine only returns the constrained 3D point. Vector runtime owns conversion from the
point to canonical ellipse angle and document mutation.

### 4.2 Game Path and Movement Range

- A path driver advances progress/time and proposes a pose.
- A polyline or future spline constraint keeps the pose on the path.
- A bounds/corridor constraint limits allowed movement.
- Collision remains a separate contact-resolution capability.
- A vehicle adapter binds the resolved pose to whichever replaceable vehicle entity is active.

Existing `EngineRuntimeNavigationPathConstraints` is a narrow path-driver option contract.
It should remain compatible initially, then delegate geometric correction to the generic
constraint service. It must not become the generic constraint model.

## 5. Determinism and Composition Rules

- Normalize directions, normals, quaternions, ranges, and invalid numeric input at registration.
- Reject degenerate hard constraints with diagnostics; do not silently create unstable output.
- Evaluate higher priority first; preserve declaration order within equal priority.
- A hard rule may not be weakened by a later soft rule.
- Use explicit `iterationLimit` and `tolerance`; never use unbounded convergence loops.
- Return the same output and diagnostics for the same normalized input.
- Never hide an unsatisfied result by returning `satisfied`.
- Constraint resolution must be recordable and replayable without product callbacks.

## 6. Architecture Placement

- `kernel/constraint`
  - math primitives
  - normalization
  - projection/evaluation
  - composition solver
- `orchestration/runtime/constraint`
  - registry
  - entity/channel binding
  - diagnostics
  - replay integration
- `orchestration/api/public-types`
  - governed public contracts
- Product adapters
  - compile domain meaning to Engine constraint sets
  - convert resolved generic state back to product state

Do not place product conversion logic in `kernel/constraint`.

## 7. Atomic Requirements

### API and Governance

- [ ] CON-API-001 Define product-neutral public constraint types.
- [ ] CON-API-002 Expose `runtime.constraints` namespace through governed capability map.
- [ ] CON-API-003 Add CN/EN API reference and runnable examples.
- [ ] CON-API-004 Add semantic-neutrality checks for constraint API naming.

### Kernel

- [ ] CON-KRN-001 Normalize and validate every P0 constraint primitive.
- [ ] CON-KRN-002 Implement deterministic point/pose projection for every P0 primitive.
- [ ] CON-KRN-003 Implement scalar and angular interval resolution.
- [ ] CON-KRN-004 Implement stable priority/order composition.
- [ ] CON-KRN-005 Return structured correction and violation diagnostics.
- [ ] CON-KRN-006 Generate optional generic debug geometry.

### Runtime

- [ ] CON-RT-001 Register/update/unregister constraint sets.
- [ ] CON-RT-002 Resolve transient candidate state without graph mutation.
- [ ] CON-RT-003 Bind/unbind sets to generic entity transform channels.
- [ ] CON-RT-004 Integrate resolution with deterministic replay.
- [ ] CON-RT-005 Add bounded iteration and runtime budget diagnostics.

### Validation

- [ ] CON-TST-001 Unit-test every primitive including degenerates.
- [ ] CON-TST-002 Prove deterministic composition and replay.
- [ ] CON-TST-003 Validate Vector2D circle-angle and corner-radius handlers via adapter.
- [ ] CON-TST-004 Validate game path/corridor movement and replaceable entity binding.
- [ ] CON-TST-005 Validate transform gizmo axis/plane constraints.
- [ ] CON-TST-006 Validate 3D-first default path and explicit 2D plane adaptation.

## 8. First Implementation Slice

Implement the smallest slice that proves both primary scenarios:

1. Public types and `runtime.constraints.resolve`.
2. `line`, `segment`, `plane`, `circle`, `scalar-range`, and `angle-range`.
3. Stable hard-rule composition and diagnostics.
4. Vector2D ellipse-angle/corner-radius adapter integration.
5. Game polyline movement integration only after the projection contract is stable.

This slice prevents another scenario-specific path implementation while keeping the initial
solver small enough to validate thoroughly.

## 9. Implementation Progress (2026-06-04)

Landed:

- [x] CON-API-001 Product-neutral public constraint types.
- [x] CON-API-002 Governed experimental `runtime.constraints` namespace and capability map.
- [x] CON-API-003 Initial paired CN/EN API reference with runnable registration/resolve example.
- [x] CON-KRN-002 Deterministic projection for line, segment, plane, and circle.
- [x] CON-KRN-003 Scalar and wrapped angular interval resolution; angles use radians.
- [x] CON-KRN-004 Stable priority then declaration-order composition.
- [x] CON-KRN-005 Structured correction, missing-set, missing-scalar, and degenerate diagnostics.
- [x] CON-RT-001 Register/unregister/query constraint sets.
- [x] CON-RT-002 Resolve transient candidate state without graph mutation.
- [x] CON-TST-001 Initial primitive and degenerate-input contracts.
- [x] CON-TST-002 Deterministic composition contract.
- [x] CON-TST-003 Vector2D circle-angle and corner-radius handlers validated through adapter.
- [x] CON-TST-004 Initial Game path movement validation through generic active-segment constraint.

Vector2D adapter evidence:

- `shapeStyleHandles.ts` compiles rectangle radius semantics to generic `scalar-range`.
- Ellipse pointer coordinates are normalized into a 3D unit-circle constraint; Engine returns
  a generic projected point and Vector runtime converts it back to canonical degrees.
- Live drag points and committed values share the same projection path.
- Rect-radius handle placement now preserves the existing radius on pointer-down/up and rotates
  in local shape space.

Game adapter/runtime evidence:

- Runtime navigation remains the motion driver and computes the desired next position.
- The desired position is corrected through a generic active `segment` constraint before commit.
- Active-segment correction is used instead of nearest-whole-polyline correction so intersecting
  routes cannot jump to an unrelated segment.
- Playground S10 NPC, pedestrian, minimap, collision, and generic-API contracts remain green.

Current public namespace:

```ts
engine.runtime.constraints.register(set)
engine.runtime.constraints.unregister(setId)
engine.runtime.constraints.get(setId)
engine.runtime.constraints.getAll()
engine.runtime.constraints.resolve(input)
```

Still required before stable release:

- Normalize/deep-copy registered primitives rather than retaining nested caller references.
- Add point, ray, axis, sphere, bounds, oriented bounds, and pose rotation/scale channels.
- Add world/local/parent/reference spaces.
- Add entity/channel binding, replay integration, runtime budgets, and debug geometry.
- Add explicit corridor constraints and collision-aware navigation correction.
- Expand bilingual API reference as binding, replay, debug geometry, and additional primitives land.
