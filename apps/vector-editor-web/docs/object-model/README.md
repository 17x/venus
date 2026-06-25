# Object Model

This document describes the canonical object model used by `apps/vector-editor-web`.
The model is product-facing and editor-facing. It is not the engine scene contract.

## Ownership

- `DocumentNode` is the compatibility shape consumed by runtime, worker, product hooks, and adapters.
- `TypedDocumentNode` is the preferred typed union for new model code.
- `DOCUMENT_OBJECT_TYPES` is the canonical registry for every supported object type.
- `EngineSceneSnapshot` remains render-facing and must be produced through adapters.

## Shared Fields

Every object keeps these core fields:

- `id`: stable object id.
- `type`: canonical object type.
- `name`: display name.
- `parentId`: parent object id, or `null` for root objects.
- `childIds`: ordered child ids for containers.
- `x`, `y`, `width`, `height`: world-space object bounds.
- `rotation`, `flipX`, `flipY`: object transform state.
- `fill`, `stroke`, `shadow`: shared style channels where applicable.
- `schema`: adapter metadata and import diagnostics.

## Object Types

| Type | Typed alias | Purpose | Required specialization |
| --- | --- | --- | --- |
| `frame` | `FrameDocumentNode` | Artboard-like container. | Ordered `childIds`. |
| `group` | `GroupDocumentNode` | Generic grouping container. | Ordered `childIds`. |
| `rectangle` | `RectangleDocumentNode` | Rectangle or rounded rectangle. | Optional `cornerRadius` / `cornerRadii`. |
| `ellipse` | `EllipseDocumentNode` | Ellipse, circle, or arc. | Optional `ellipseStartAngle` / `ellipseEndAngle`. |
| `polygon` | `PolygonDocumentNode` | Closed polygon geometry. | `points`. |
| `star` | `StarDocumentNode` | Star geometry. | `points`. |
| `lineSegment` | `LineSegmentDocumentNode` | Open two-point line. | `points`, optional arrowheads. |
| `path` | `PathDocumentNode` | Custom bezier path. | `bezierPoints`. |
| `text` | `TextDocumentNode` | Editable text box. | `text`, optional `textRuns`. |
| `image` | `ImageDocumentNode` | Asset-backed image object. | `assetId`, optional clip metadata. |

## Container Rules

- `frame` and `group` are the only objects that should own `childIds`.
- Child ordering is canonical and drives layer order, hit-test traversal, and history patches.
- A child must point back to its owner through `parentId`.
- Root objects use `parentId: null` and appear in document order.

## Geometry Rules

- `rectangle`, `ellipse`, `text`, and `image` use bounds as primary geometry.
- `polygon`, `star`, and `lineSegment` use `points` as primary geometry.
- `path` uses `bezierPoints` as primary geometry and may keep `points` as a compatibility outline.
- Bounds should remain non-negative after normalization.

## Style Rules

- `fill`, `stroke`, and `shadow` are optional because not every object renders every channel.
- `strokeStartArrowhead` and `strokeEndArrowhead` apply to open stroke objects, especially `lineSegment` and open `path`.
- Text styling lives in `textRuns`; node-level `fill` is not the canonical rich-text color source.

## Adapter Rules

- Runtime scene import uses `parseRuntimeSceneToEditorDocument`.
- Engine rendering must go through a scene adapter instead of treating `DocumentNode` as render-ready.
- Adapter metadata belongs in `schema` and should not drive product behavior unless explicitly promoted.

## Test Documentation

Each object type has an English test document under `docs/object-model/tests`.
The docs describe the minimum object contract, parser coverage, runtime coverage, and rendering-adapter expectations.
