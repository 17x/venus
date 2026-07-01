# Engine Scene Capability Matrix

This matrix describes what each engine scene object can currently do. It is
based on the render-facing scene contract, not the app/product document model.

## Summary

| Object | Renders | Click / hit-test | Indexed | Main extension fields | Status |
| --- | --- | --- | --- | --- | --- |
| `group` | Children render through hierarchy. | No direct group-body hit; child hits work through group transform. | Yes, by child union. | `children`, `transform`, `opacity`, `blendMode`, `clip`. | Supported with boundary. |
| `shape: rect` | Yes. | Yes, bounds-based. | Yes. | `cornerRadius`, `cornerRadii`, `fill`, `stroke`, `strokeWidth`, `shadow`, `clip`. | Supported. |
| `shape: ellipse` | Yes. | Yes, bounds-based. | Yes. | `ellipseStartAngle`, `ellipseEndAngle`, style fields. | Supported; exact ellipse hit is not yet separate from bounds hit. |
| `shape: line` | Yes. | Yes, tolerance/bounds-based. | Yes. | `points`, `strokeStartArrowhead`, `strokeEndArrowhead`, `strokeWidth`. | Supported. |
| `shape: polygon` | Yes. | Yes, bounds-based. | Yes. | `points`, `closed`, style fields. | Supported; exact polygon hit is a future refinement. |
| `shape: path` | Yes. | Yes, bounds-based. | Yes. | `bezierPoints`, `points`, `closed`, arrowheads, style fields. | Supported; exact path stroke/fill hit is a future refinement. |
| `text` | Yes. | Yes, text-bounds based. | Yes. | `text`, `runs`, `style`, `wrap`, `cacheKey`, text metrics hints. | Supported. |
| `image` | Yes. | Yes, image-bounds based. | Yes. | `assetId`, `sourceRect`, `naturalSize`, `imageSmoothing`, `clip`. | Supported. |

## What “Renders” Means

The engine can consume the node from an `EngineSceneSnapshot` and emit renderer
work for it. Shape-level Canvas2D path emission is covered by
`src/renderer/canvas2d/shapes.objectModelRender.test.ts`.

## What “Click / Hit-Test” Means

The engine scene store can return the object from `hitTest`, `hitTestAll`, or
hit-plan construction for a point in scene space. Current shape hit-testing is
bounds-based in the scene-store path. This is useful and deterministic for
selection routing, but it is not yet exact fill/stroke hit-testing for every
geometry kind.

## Extension Field Coverage

### Shared Extensions

- `transform`: 2D affine matrix applied during indexing and hit-test traversal.
- `opacity`: render style input.
- `blendMode`: render style hint.
- `shadow`: render style input.
- `clip`: inline or node-referenced clipping input.

### Shape Extensions

- Rectangles support uniform and per-corner radii.
- Ellipses support arc start/end angles.
- Lines and open paths support arrowhead metadata.
- Polygons and paths support point-based geometry.
- Paths support bezier anchors and handles.

### Text Extensions

- `text` supports the fast plain-string path.
- `runs` supports rich text segments.
- `style` carries font, fill, stroke, alignment, line-height, and shadow values.
- `wrap`, `cacheKey`, `lineCount`, and `maxLineHeight` are render/cache hints.

### Image Extensions

- `assetId` connects to the engine resource loader.
- `sourceRect` supports crop-like source sampling.
- `naturalSize` gives the renderer image-dimension context.
- `imageSmoothing` controls sampling preference.
- `clip` supports render-facing clipping.

## Verified Tests

- Object registry, indexing, query, hit plan, and frame plan:
  `src/scene/types/sceneObjectModel.contract.test.ts`
- Shape render command emission and line arrowheads:
  `src/renderer/canvas2d/shapes.objectModelRender.test.ts`

## Current Gaps

- Exact geometry hit-testing for ellipse, polygon, bezier path fill, and path
  stroke is not yet complete in the scene-store hit path.
- Product-level mask groups, group isolation, locked/hidden filtering, and
  selection semantics remain outside engine.
- The public docs now describe the supported API surface, but generated API docs
  from TypeScript declarations are not yet produced.
