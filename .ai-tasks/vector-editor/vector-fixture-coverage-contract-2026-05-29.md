# Vector Canonical Fixture Coverage Matrix

## EditorDocument Fields

- id: fixture document id
- name: fixture document name
- schema: {name, version, major, minor}
- createdAt: epoch ms
- updatedAt: epoch ms
- width: canvas width
- height: canvas height
- pages: [{id, name, width, height}]
- activePageId: page-main
- lifecycle: {state, dirty, lastSavedAt, recoveryReason, lastTransitionSource, lastDirtySource}
- styleReferences: {fills, strokes, texts, effects}
- extensions: {fixture: true}
- shapes: 11 fixture shapes covering all ShapeType variants

## DocumentNode Fields

- id: fixture shape id
- type: frame, rectangle, ellipse, polygon, star, lineSegment, path, text, image, group
- name: fixture shape name
- parentId: parent shape id or null
- childIds: child shape ids
- x: world x
- y: world y
- width: bounds width
- height: bounds height
- rotation: rotation degrees
- flipX: horizontal flip flag
- flipY: vertical flip flag
- opacity: 0-1
- blendMode: normal, multiply, pass-through
- locked: boolean
- visible: boolean
- text: text content
- textRuns: [{start, end, style}]
- textAutoHeight: auto
- textTruncation: ending
- textMaxLines: max line count
- assetId: asset reference id
- assetUrl: blob URL
- clipPathId: clip source id
- clipRule: evenodd or nonzero
- points: [{x, y}]
- bezierPoints: [{anchor, cp1, cp2}]
- strokeStartArrowhead: triangle, circle, diamond, bar, none
- strokeEndArrowhead: triangle, circle, diamond, bar, none
- fills: multi-fill array with gradient, image, opacity, blendMode
- fill: deprecated compatibility fixture required.
- strokes: multi-stroke array with dash, cap, join, align, gradient
- stroke: deprecated compatibility fixture required.
- shadow: {enabled, kind, color, offsetX, offsetY, blur, spread, blendMode}
- blur: {enabled, kind, radius}
- cornerRadius: unified corner radius
- cornerRadii: {topLeft, topRight, bottomRight, bottomLeft}
- ellipseStartAngle: ellipse arc start
- ellipseEndAngle: ellipse arc end
- booleanOperation: union, intersection, difference, exclude
- componentId: component reference
- componentProperties: {variant}
- schema: {sourceNodeType, sourceNodeKind, sourceFeatureKinds, maskGroupId, maskRole}
- styleRefs: {fillStyleId, strokeStyleId, textStyleId, effectStyleId}
- extensions: {fixtureRole}
