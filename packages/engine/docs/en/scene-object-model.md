# Engine Scene Object Model

`@venus/engine` owns a render-facing scene object model. It is the contract the
renderer, spatial index, frame planner, and hit-test pipeline consume after an
app/runtime adapter has translated product document objects into engine nodes.

This is not the product document model. It does not own file format semantics,
history, commands, collaboration, editor tools, selection policy, or UI overlay
state.

## Canonical Registries

The engine publishes two explicit capability registries:

- `ENGINE_RENDERABLE_NODE_TYPES`: `group`, `shape`, `text`, `image`.
- `ENGINE_SHAPE_TYPES`: `rect`, `ellipse`, `line`, `polygon`, `path`.

Use these registries when tests, docs, adapters, or diagnostics need to prove
they cover the full current engine scene surface.

## Renderable Nodes

| Node type | Interface | Purpose | Indexed | Hit-tested |
| --- | --- | --- | --- | --- |
| `group` | `EngineGroupNode` | Hierarchical transform and child traversal container. | Yes, by child-union bounds. | No direct body hit; children are hit-tested. |
| `shape` | `EngineShapeNode` | Vector-like geometry rendered by shape kind. | Yes. | Yes, through local bounds today. |
| `text` | `EngineTextNode` | Plain or run-based text payload. | Yes. | Yes, through text bounds. |
| `image` | `EngineImageNode` | Asset-backed raster payload. | Yes. | Yes, through image bounds. |

## Shape Kinds

| Shape kind | Primary fields | Current capability |
| --- | --- | --- |
| `rect` | `x`, `y`, `width`, `height`, `cornerRadius`, `cornerRadii` | Rectangles and rounded rectangles. |
| `ellipse` | `x`, `y`, `width`, `height`, `ellipseStartAngle`, `ellipseEndAngle` | Full ellipses and arc sectors. |
| `line` | `points`, `strokeWidth`, arrowhead fields | Open line segments with optional arrowheads. |
| `polygon` | `points`, `closed` | Closed polygon geometry. |
| `path` | `bezierPoints`, `points`, `closed` | Bezier/custom paths with bounds from curve extrema. |

## Shared Node Fields

Every renderable node inherits `EngineNodeBase`:

- `id`: stable render-facing node id.
- `type`: renderable node family.
- `transform`: optional 2D affine transform matrix.
- `opacity`: node opacity.
- `blendMode`: renderer blend-mode hint.
- `shadow`: renderer shadow payload.
- `clip`: graph-level or inline clip descriptor.

## Scene Snapshot

`EngineSceneSnapshot` is the scene payload accepted by the engine:

- `revision`: cache invalidation and diagnostics revision.
- `width`, `height`: render scene dimensions.
- `nodes`: ordered renderable node tree.
- `metadata`: optional plan/buffer/dirty-node metadata used by engine internals.

Adapters should treat `EngineSceneSnapshot` as render-ready output, not as a
persisted editor document.

## Verified Capabilities

The contract test at `src/scene/types/sceneObjectModel.contract.test.ts` verifies
the current scene object model across these engine subsystems:

- Published node and shape registries.
- Scene store node lookup for every renderable node and shape kind.
- Spatial indexing and coarse bounds queries for group, shape, text, and image.
- Point candidate queries for stroke-backed line geometry.
- Hit-plan generation from exact hit-test summaries.
- Frame-plan generation from the scene store query surface.

## Known Boundaries

- Shape hit-testing currently uses local bounds in the scene-store hit path.
- Product selection, locked/hidden policy, group isolation, mask-group semantics,
  and command history remain outside engine.
- Engine clip support is render-facing (`clipNodeId` or inline `clipShape`) and is
  not a complete product mask model.
- Scene patches replace or upsert top-level subtrees; adapters should submit
  parent group subtrees when nested render nodes change.

## Recommended Adapter Flow

1. Keep product objects in the app/runtime document model.
2. Translate product objects into `EngineRenderableNode` trees.
3. Load the first `EngineSceneSnapshot` with `loadScene`.
4. Submit incremental render-facing updates with scene patches or transactions.
5. Use engine query/hit/frame-plan outputs as mechanism signals, then apply
   product policy in runtime/app layers.
