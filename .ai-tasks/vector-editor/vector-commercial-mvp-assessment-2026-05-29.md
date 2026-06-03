# Vector 2D Editor Commercial MVP Plan (2026-05-29)

## 0. Scope Definition

Goal: ship first commercial 2D vector editor version aligned with Adobe Illustrator / Figma-level document foundations.

Deep execution source:

- `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md`

Use that plan for UI, inspector, interaction, overlay, handler, drawing tool, transform/group, CRUD, and product-runtime-engine full-chain execution.

### Current Document Model Coverage

`EditorDocument` (document-level):

- id, name, schema, createdAt, updatedAt ✅
- width, height ✅
- pages, activePageId ✅
- lifecycle (state, dirty, lastSavedAt, recoveryReason, lastTransitionSource, lastDirtySource) ✅
- styleReferences (fills, strokes, texts, effects) ✅
- extensions ✅
- shapes (DocumentNode[]) ✅

`DocumentNode` (shape-level):

- id, type, name ✅
- parentId, childIds ✅
- x, y, width, height ✅
- rotation, flipX, flipY ✅
- opacity, blendMode, locked, visible ✅
- text, textRuns ✅
- textAutoHeight, textTruncation, textMaxLines ✅
- assetId, assetUrl, clipPathId, clipRule ✅
- points, bezierPoints ✅
- strokeStartArrowhead, strokeEndArrowhead ✅
- fills (multi-fill: enabled, color, gradient, image, opacity, blendMode) ✅
- fill (legacy single) ✅
- strokes (multi-stroke: enabled, color, weight, gradient, dashPattern, customDash, align, cap, join, opacity, blendMode) ✅
- stroke (legacy single) ✅
- shadow (enabled, kind, color, offsetX, offsetY, blur, spread, blendMode) ✅
- blur (enabled, kind, radius) ✅
- cornerRadius, cornerRadii ✅
- ellipseStartAngle, ellipseEndAngle ✅
- booleanOperation ✅
- componentId, componentProperties ✅
- schema (sourceNodeType, sourceNodeKind, sourceFeatureKinds, maskGroupId, maskRole) ✅
- styleRefs (fillStyleId, strokeStyleId, textStyleId, effectStyleId) ✅
- extensions ✅

### TODO: Document Model Gaps

These fields exist in the type definitions but may not be fully covered by the canonical fixture:

- [ ] `fills` gradient angular/diamond variants (all ShapeGradientType values)
- [ ] image fill with all ImageScaleMode variants
- [ ] all StrokeDashPattern variants (solid, dashed, dotted, custom)
- [ ] all ShadowKind variants (drop, inner)
- [ ] all BlurKind variants (layer, background)
- [ ] all ShapeType variants in fixture (frame, group, rectangle, ellipse, polygon, star, lineSegment, path, text, image)
- [ ] opacity inheritance scenarios
- [ ] blendMode coverage for all ShapeBlendMode values
- [ ] Boolean operation result shape reconstruction after union/intersection/difference/exclude

### TODO: Canonical Fixture Completeness

Current fixture: 2 shapes (frame + path). Required: at least one of each ShapeType with all possible property combinations.

### TODO: Runtime Document Validation

- [ ] File import/export round-trip for all document properties
- [ ] Style reference resolution consistency (document-level ↔ node-level)
- [ ] Asset URL normalization across save/load cycles

### Integration Contracts

- [x] File → Runtime Document round-trip (VEC-003)
- [x] Runtime Scene → Engine Graph projection (VEC-003)
- [x] Engine Bridge public release gate (VEC-008)
- [x] Runtime Bridge sync (selection, scene, model)

### Interaction Contracts

- [x] Transform session state machine (commit/cancel)
- [x] Undo/redo composite cycle
- [x] Selection bounds state
- [x] Selection filter (allow-list, dedup, hidden/locked guards)
- [x] Modifier-key selection (shift add, cmd toggle)
- [x] Drag controller lifecycle (clear, getSession, pointerUp)
- [x] Interaction state matrix overlay routing

### History Contracts

- [x] History stack (local undo/redo, remote entries)
- [x] History panel transaction groups
- [x] History panel transaction presentation
- [x] Crash-recovery replay snapshots
