# Render Backend Strategy

Venus is a WebGL-first 2D engine with a Canvas2D fidelity path. The document
model, hit-test model, geometry cache, and animation scheduler must stay
backend-neutral. A renderer backend is only responsible for turning an already
resolved scene and viewport into pixels.

## Backend Roles

| Backend path | Primary role | Good for | Avoid using for |
| --- | --- | --- | --- |
| WebGL packets | Default presentation path | Large static scenes, batched shape drawing, transforms, opacity, texture composition | Text shaping, complex shadows, browser-native filters that require Canvas2D semantics |
| Canvas2D direct | Deterministic fallback path | Docs, tests, simple fidelity previews, environments where WebGL fails | Very large scenes without culling, LOD, or snapshot support |
| Canvas2D-to-texture | Fidelity raster path inside WebGL | Text, complex effects, masks, non-trivial paint that is easier or more correct in Canvas2D | Per-frame rasterization of unchanged content |

## Public Backend Selection

`VenusParameters.render.backend` accepts:

| Value | Behavior |
| --- | --- |
| `auto` | Try WebGL first. If initialization or shader setup fails, fall back to Canvas2D and emit `backend:fallback`. |
| `webgl` | Require WebGL. Initialization or shader failures should throw instead of silently switching backend. |
| `canvas2d` | Use Canvas2D directly. This is preferred for documentation pages and deterministic tests. |

`venus.inspect().backendFallback` reports the last automatic fallback when
`auto` switches from WebGL to Canvas2D.

## Canvas2D-To-Texture Rule

Some features should be rendered by Canvas2D and uploaded as a WebGL texture.
This is correct when the feature has high fidelity requirements and changes
less often than it is composited.

Use Canvas2D-to-texture for:

- multiline text and future rich text runs,
- shadows and blur effects that need browser fidelity,
- masks or clips that are expensive to express as WebGL geometry,
- image preprocessing such as crop, tile, or smoothing,
- complex fills before the WebGL packet path supports them natively.

Do not rasterize every frame unless the property is actively changing. Cache by
node id, revision, paint/effect signature, device pixel ratio, and raster size.

## Animation Strategy

Animation should mutate backend-neutral document properties and let invalidation
choose the cheapest render path.

| Animated property | Invalidation class | Preferred path |
| --- | --- | --- |
| `x`, `y`, `rotation`, `scaleX`, `scaleY`, `skewX`, `skewY` | `transform` | Reuse geometry or texture, update matrices/packets |
| `opacity`, `blendMode` | `composite` | Reuse geometry or texture, update composition state |
| `fill`, `stroke`, `strokeWidth`, gradients | `paint` | Rebuild packets or rerasterize cached fidelity texture |
| text content, font, line height | `content` | Rerasterize text texture and update bounds/cache |
| shadow, blur, mask source | `effect` | Rerasterize fidelity texture or effect cache |
| width, height, points, path data | `geometry` | Rebuild geometry, AABB, hit data, and affected caches |

Animation modules must not call WebGL or Canvas2D directly. They should update
document state, ask invalidation to classify the change, and request rendering
through runtime services.

## Isolation Rules

- Document nodes cannot store backend objects such as GL buffers, textures, or
  Canvas2D paths.
- Hit-test uses document geometry, AABB, stroke width, fill state, closed/open
  shape semantics, and transform matrices before considering renderer output.
- Geometry cache stores backend-neutral signatures. Backend resources may refer
  to those signatures, but resource lifetime belongs to the renderer.
- WebGL may consume Canvas2D raster output as textures, but Canvas2D fidelity
  code must not become the owner of document semantics.

## Diagnostics

Docs and debug panels should expose:

- active backend,
- backend fallback reason,
- whether a feature used WebGL packets, Canvas2D direct rendering, or
  Canvas2D-to-texture fidelity,
- cache hit/miss for raster textures,
- invalidation class for the last mutation.
