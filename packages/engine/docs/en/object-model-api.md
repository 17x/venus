# Engine Object Model API Plan

This document defines the engine-owned document/scene object model before
implementation changes. Development should work backwards from these APIs:

1. Define the object API and every supported property.
2. Add capability tests for typing, rendering, hit-testing, indexing, patching,
   and cache behavior.
3. Implement or refine engine internals.
4. Update adapter docs when product document objects map into engine objects.

## Engine Ownership

The object set below is standard vector-editor scene-graph functionality. The
engine owns only render-facing scene objects and mechanism APIs: scene snapshots,
nodes, geometry, hit-test, indexing, cache, camera, and render scheduling.

The engine does not own product document format, product commands, undo/redo,
collaboration, editor tools, asset storage, or UI state.

## Engine-Owned Objects

| Object | Engine owns | Engine does not own |
| --- | --- | --- |
| `EngineSceneSnapshot` | Render-facing scene snapshot, dimensions, node order, revision metadata, and cache invalidation metadata. | Product file format, command history, or collaboration state. |
| `EngineGroupNode` | Hierarchy, child order, group transforms, inherited visual properties, and child-union indexing. | Group commands, isolation mode, layer-panel state, or deep-selection policy. |
| `EngineShapeNode: rect` | Rectangle and rounded-rectangle render geometry, style, hit bounds, and cache keys. | Product rectangle tool state, constraints, or layout behavior. |
| `EngineShapeNode: ellipse` | Ellipse, circle, and arc render geometry, style, hit bounds, and cache keys. | Product arc editor controls or circle constraint UI. |
| `EngineShapeNode: line` | Open line segment geometry, stroke, arrowheads, hit bounds, and cache keys. | Connector routing, anchors, or diagram semantics. |
| `EngineShapeNode: polygon` | Point-list polygon geometry, fill/stroke rendering, hit bounds, and cache keys. | Product polygon generator settings or boolean operations. |
| `EngineShapeNode: path` | Point/bezier path geometry, closure, fill/stroke rendering, hit bounds, and cache keys. | Pen-tool workflow, segment selection UI, or boolean path operations. |
| `EngineTextNode` | Text payload, rich runs, style, measurement hints, text bounds, and render cache keys. | IME behavior, editing commands, or rich-text toolbar state. |
| `EngineImageNode` | Asset-backed image quad, source crop, natural size, smoothing, clip, hit bounds, and cache keys. | Asset persistence, uploads, or media-library UI. |
| `EngineClipShape` | Inline rectangular/path clip descriptors and fill-rule metadata. | Product mask group creation, source lifecycle, or layer-panel semantics. |
| `EngineCamera` | Backend-neutral projection and unprojection helper contract. | App viewport UI ownership or gesture policy. |
| `EngineGeometryCache` | Backend-neutral geometry/tile cache keys, signatures, and invalidation contracts. | Backend resource lifetime internals or GPU texture ownership. |

## API-First Development Order

Develop object APIs in this order:

1. `scene-snapshot`
2. `group`
3. `rect`
4. `ellipse`
5. `line`
6. `polygon`
7. `path`
8. `text`
9. `image`
10. `clip`
11. `camera`
12. `cache`

Each object API page must answer:

- Which fields are required?
- Which optional fields are supported today?
- Which shared fields apply?
- How does it render?
- How is it indexed?
- How is it hit-tested?
- How is it patched?
- What cache keys or invalidation rules apply?
- What is explicitly outside engine ownership?

## Current Implementation Status

- `scene-snapshot`, `group`, `shape`, `text`, and `image` exist in
  `src/scene/types/types.ts`.
- Shape kinds currently include `rect`, `ellipse`, `line`, `polygon`, and `path`.
- Render command emission for every shape kind is covered by
  `src/renderer/canvas2d/shapes.objectModelRender.test.ts`.
- Click/hit-test coverage for shape, text, and image is covered by
  `src/scene/types/sceneObjectModel.contract.test.ts`.
- Backend-neutral hit/cache/camera contracts are isolated under `src/core`.
- Documentation completeness and wording are covered by
  `src/scene/types/sceneObjectApiDocs.contract.test.ts`.

## Development Rule

Do not add new object behavior directly to renderer backends first. Add or update
its object API document, add type and capability tests, implement the mechanism
in the owning domain, then add or update render tests.
