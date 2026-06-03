import type {EditorDocument} from '../../../runtime/model/index.ts'

/**
 * Creates one canonical document fixture that exercises every public EditorDocument and DocumentNode field.
 */
export function createCanonicalDocumentModelFixture(): EditorDocument {
  return {
    id: 'canonical-doc-fixture',
    name: 'Canonical Document Fixture',
    schema: {
      name: 'venus.vector.document',
      version: 1,
      major: 1,
      minor: 0,
    },
    createdAt: 1735689600000,
    updatedAt: 1735689601000,
    width: 1440,
    height: 960,
    pages: [
      {
        id: 'page-main',
        name: 'Main Page',
        width: 1440,
        height: 960,
      },
    ],
    activePageId: 'page-main',
    lifecycle: {
      state: 'dirty',
      dirty: true,
      lastSavedAt: 1735689600000,
      lastTransitionSource: {
        kind: 'command',
        event: 'fixture.create',
        commandId: 'cmd-fixture',
        transactionId: 'txn-fixture',
        commandType: 'fixture-command',
        issuedAt: 1735689601000,
      },
      lastDirtySource: {
        commandType: 'fixture-command',
        commandId: 'cmd-fixture',
        transactionId: 'txn-fixture',
        issuedAt: 1735689601000,
      },
    },
    styleReferences: {
      fills: {'fill-primary': {name: 'Primary Fill'}},
      strokes: {'stroke-primary': {name: 'Primary Stroke'}},
      texts: {'text-primary': {name: 'Primary Text'}},
      effects: {'effect-primary': {name: 'Primary Effect'}},
    },
    extensions: {
      fixture: true,
    },
    shapes: [
      // Shape 1: frame (container)
      {
        id: 'fixture-frame',
        type: 'frame',
        name: 'Fixture Frame',
        parentId: null,
        childIds: ['fixture-rect', 'fixture-ellipse', 'fixture-polygon', 'fixture-star', 'fixture-line', 'fixture-path', 'fixture-text', 'fixture-image', 'fixture-group'],
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        visible: true,
        fills: [{enabled: true, color: '#f8fafc', opacity: 1}],
        fill: {enabled: true, color: '#f8fafc'},
        strokes: [{enabled: true, color: '#e2e8f0', weight: 1, align: 'inside'}],
        stroke: {enabled: true, color: '#e2e8f0', weight: 1},
        shadow: {enabled: false, kind: 'drop', color: '#000000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        schema: {sourceNodeType: 'FRAME', sourceNodeKind: 'frame', sourceFeatureKinds: ['container']},
        styleRefs: {fillStyleId: 'fill-primary', strokeStyleId: 'stroke-primary', effectStyleId: 'effect-primary'},
        extensions: {fixtureRole: 'container'},
      },
      // Shape 2: rectangle
      {
        id: 'fixture-rect',
        type: 'rectangle',
        name: 'Fixture Rectangle',
        parentId: 'fixture-frame',
        childIds: [],
        x: 16, y: 16, width: 120, height: 80,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        fills: [{enabled: true, color: '#3b82f6', opacity: 1}],
        fill: {enabled: true, color: '#3b82f6'},
        strokes: [{enabled: true, color: '#1e40af', weight: 2, align: 'center', dashPattern: 'solid' as const}],
        stroke: {enabled: true, color: '#1e40af', weight: 2},
        shadow: {enabled: true, kind: 'drop', color: '#00000040', offsetX: 2, offsetY: 2, blur: 6, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 8,
        cornerRadii: {topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8},
        schema: {sourceNodeType: 'RECTANGLE', sourceNodeKind: 'rectangle', sourceFeatureKinds: ['shape']},
        styleRefs: {fillStyleId: 'fill-primary', strokeStyleId: 'stroke-primary'},
        extensions: {},
      },
      // Shape 3: ellipse
      {
        id: 'fixture-ellipse',
        type: 'ellipse',
        name: 'Fixture Ellipse',
        parentId: 'fixture-frame',
        childIds: [],
        x: 148, y: 16, width: 90, height: 80,
        rotation: 0, flipX: false, flipY: false,
        opacity: 0.85, blendMode: 'normal', locked: false, visible: true,
        fills: [{
          enabled: true, color: '#10b981',
          gradient: {type: 'linear' as const, stops: [{offset: 0, color: '#10b981'}, {offset: 1, color: '#047857'}], angle: 45},
          opacity: 0.85,
        }],
        fill: {enabled: true, color: '#10b981'},
        strokes: [{enabled: true, color: '#065f46', weight: 1.5, align: 'center', dashPattern: 'dashed' as const}],
        stroke: {enabled: true, color: '#065f46', weight: 1.5},
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        ellipseStartAngle: 0, ellipseEndAngle: 360,
        schema: {sourceNodeType: 'ELLIPSE', sourceNodeKind: 'ellipse', sourceFeatureKinds: ['shape']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 4: polygon
      {
        id: 'fixture-polygon',
        type: 'polygon',
        name: 'Fixture Polygon',
        parentId: 'fixture-frame',
        childIds: [],
        x: 250, y: 16, width: 100, height: 80,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        points: [{x: 250, y: 16}, {x: 350, y: 16}, {x: 320, y: 50}, {x: 350, y: 96}, {x: 250, y: 96}, {x: 280, y: 50}],
        fills: [{enabled: true, color: '#f59e0b', opacity: 1}],
        fill: {enabled: true, color: '#f59e0b'},
        strokes: [{enabled: true, color: '#92400e', weight: 1, align: 'center', dashPattern: 'dotted' as const, join: 'round' as const}],
        stroke: {enabled: true, color: '#92400e', weight: 1},
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        schema: {sourceNodeType: 'POLYGON', sourceNodeKind: 'polygon', sourceFeatureKinds: ['shape', 'vector']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 5: star
      {
        id: 'fixture-star',
        type: 'star',
        name: 'Fixture Star',
        parentId: 'fixture-frame',
        childIds: [],
        x: 362, y: 16, width: 80, height: 80,
        rotation: 15, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        points: [{x: 402, y: 16}, {x: 422, y: 56}, {x: 452, y: 96}, {x: 410, y: 80}, {x: 372, y: 96}, {x: 392, y: 56}],
        fills: [{enabled: true, color: '#ef4444', opacity: 1}],
        fill: {enabled: true, color: '#ef4444'},
        strokes: [{enabled: true, color: '#991b1b', weight: 1, align: 'center', join: 'miter' as const}],
        stroke: {enabled: true, color: '#991b1b', weight: 1},
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        schema: {sourceNodeType: 'STAR', sourceNodeKind: 'star', sourceFeatureKinds: ['shape', 'vector']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 6: lineSegment
      {
        id: 'fixture-line',
        type: 'lineSegment',
        name: 'Fixture Line',
        parentId: 'fixture-frame',
        childIds: [],
        x: 16, y: 112, width: 200, height: 2,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        points: [{x: 16, y: 112}, {x: 216, y: 112}],
        fills: [],
        fill: undefined,
        strokes: [{enabled: true, color: '#8b5cf6', weight: 3, align: 'center' as const, cap: 'round' as const}],
        stroke: {enabled: true, color: '#8b5cf6', weight: 3},
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        strokeStartArrowhead: 'triangle',
        strokeEndArrowhead: 'circle',
        schema: {sourceNodeType: 'LINE', sourceNodeKind: 'lineSegment', sourceFeatureKinds: ['vector']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 7: path (bezier)
      {
        id: 'fixture-path',
        type: 'path',
        name: 'Fixture Path',
        parentId: 'fixture-frame',
        childIds: [],
        x: 16, y: 130, width: 200, height: 80,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        points: [{x: 16, y: 130}, {x: 100, y: 200}, {x: 216, y: 130}],
        bezierPoints: [
          {anchor: {x: 16, y: 130}, cp1: {x: 50, y: 100}, cp2: {x: 80, y: 200}},
          {anchor: {x: 100, y: 200}, cp1: {x: 120, y: 200}, cp2: {x: 180, y: 100}},
          {anchor: {x: 216, y: 130}, cp1: {x: 200, y: 140}},
        ],
        fills: [{enabled: false, color: '#000'}],
        fill: {enabled: false},
        strokes: [{
          enabled: true, color: '#06b6d4', weight: 2, align: 'center' as const,
          dashPattern: 'custom' as const, customDash: [6, 3], cap: 'round' as const, join: 'round' as const,
        }],
        stroke: {enabled: true, color: '#06b6d4', weight: 2},
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        strokeStartArrowhead: 'none',
        strokeEndArrowhead: 'bar',
        schema: {sourceNodeType: 'VECTOR', sourceNodeKind: 'path', sourceFeatureKinds: ['vector']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 8: text
      {
        id: 'fixture-text',
        type: 'text',
        name: 'Fixture Text',
        parentId: 'fixture-frame',
        childIds: [],
        x: 16, y: 220, width: 200, height: 40,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        text: 'Hello World — Canonical Text',
        textRuns: [
          {
            start: 0, end: 30,
            style: {
              color: '#1e293b', fontFamily: 'Inter', fontSize: 16, fontWeight: 600,
              letterSpacing: 0, lineHeight: 1.5,
              textAlign: 'left' as const, verticalAlign: 'top' as const,
              textDecoration: 'none' as const,
            },
          },
        ],
        textAutoHeight: 'auto',
        textTruncation: 'ending',
        textMaxLines: 2,
        fills: [{enabled: true, color: '#1e293b', opacity: 1}],
        fill: {enabled: true, color: '#1e293b'},
        strokes: [],
        stroke: undefined,
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        schema: {sourceNodeType: 'TEXT', sourceNodeKind: 'text', sourceFeatureKinds: ['text']},
        styleRefs: {textStyleId: 'text-primary'},
        extensions: {},
      },
      // Shape 9: image
      {
        id: 'fixture-image',
        type: 'image',
        name: 'Fixture Image',
        parentId: 'fixture-frame',
        childIds: [],
        x: 228, y: 110, width: 200, height: 150,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal', locked: false, visible: true,
        assetId: 'asset-primary',
        assetUrl: 'blob:fixture-asset',
        clipPathId: undefined,
        clipRule: undefined,
        fills: [{
          enabled: true, color: '#ffffff',
          image: {assetId: 'asset-primary', scaleMode: 'fill' as const, rotation: 0, opacity: 1, blendMode: 'normal' as const},
          opacity: 1, blendMode: 'normal' as const,
        }],
        fill: {enabled: true},
        strokes: [],
        stroke: undefined,
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 4,
        cornerRadii: {topLeft: 4, topRight: 4, bottomRight: 4, bottomLeft: 4},
        schema: {sourceNodeType: 'IMAGE', sourceNodeKind: 'image', sourceFeatureKinds: ['image', 'asset']},
        styleRefs: {},
        extensions: {},
      },
      // Shape 10: group
      {
        id: 'fixture-group',
        type: 'group',
        name: 'Fixture Group',
        parentId: 'fixture-frame',
        childIds: ['fixture-styled'],
        x: 16, y: 280, width: 400, height: 200,
        rotation: 0, flipX: false, flipY: false,
        opacity: 1, blendMode: 'normal' as const,
        locked: false, visible: true,
        fills: [],
        fill: undefined,
        strokes: [],
        stroke: undefined,
        shadow: {enabled: false, kind: 'drop', color: '#000', offsetX: 0, offsetY: 0, blur: 0, spread: 0},
        blur: {enabled: false, kind: 'layer', radius: 0},
        cornerRadius: 0,
        cornerRadii: {topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0},
        schema: {sourceNodeType: 'GROUP', sourceNodeKind: 'group', sourceFeatureKinds: ['container']},
        styleRefs: {},
        extensions: {fixtureRole: 'group-container'},
      },
      // Shape 11: styled node with full gradient/shadow/blur/composite
      {
        id: 'fixture-styled',
        type: 'rectangle',
        name: 'Fixture Styled Composite',
        parentId: 'fixture-group',
        childIds: [],
        x: 20, y: 20, width: 120, height: 80,
        rotation: 5, flipX: true, flipY: false,
        opacity: 0.92, blendMode: 'multiply' as const, locked: true, visible: true,
        fills: [{
          enabled: true, color: '#2563eb',
          gradient: {type: 'radial' as const, stops: [{offset: 0, color: '#eff6ff'}, {offset: 1, color: '#1d4ed8'}], centerX: 0.5, centerY: 0.5, radius: 0.8},
          opacity: 0.9, blendMode: 'normal' as const,
        }],
        fill: {enabled: true, color: '#2563eb'},
        strokes: [{
          enabled: true, color: '#0f172a', weight: 2,
          gradient: {type: 'angular' as const, stops: [{offset: 0, color: '#0f172a'}, {offset: 1, color: '#64748b'}], startAngle: 0, sweepAngle: 180},
          dashPattern: 'custom' as const, customDash: [4, 2], align: 'center' as const, cap: 'round' as const, join: 'bevel' as const,
          opacity: 1, blendMode: 'normal' as const,
        }],
        stroke: {enabled: true, color: '#0f172a', weight: 2},
        shadow: {enabled: true, kind: 'inner' as const, color: 'rgba(15,23,42,0.3)', offsetX: 2, offsetY: 4, blur: 8, spread: 1, blendMode: 'multiply' as const},
        blur: {enabled: true, kind: 'background' as const, radius: 4},
        cornerRadius: 12,
        cornerRadii: {topLeft: 8, topRight: 10, bottomRight: 12, bottomLeft: 14},
        booleanOperation: 'union' as const,
        assetId: 'asset-primary',
        assetUrl: 'blob:fixture-asset',
        componentId: 'component-primary',
        componentProperties: {variant: 'primary'},
        schema: {sourceNodeType: 'RECTANGLE', sourceNodeKind: 'rectangle', sourceFeatureKinds: ['shape', 'style'], maskGroupId: 'mask-fixture', maskRole: 'source' as const},
        styleRefs: {fillStyleId: 'fill-primary', strokeStyleId: 'stroke-primary', textStyleId: 'text-primary', effectStyleId: 'effect-primary'},
        text: 'Styled composite text',
        textRuns: [{start: 0, end: 22, style: {color: '#111827', fontFamily: 'Inter', fontSize: 14, fontWeight: 600}}],
        textAutoHeight: 'auto',
        textTruncation: 'ending',
        textMaxLines: 1,
        points: [{x: 20, y: 20}, {x: 140, y: 100}],
        bezierPoints: [{anchor: {x: 20, y: 20}, cp1: {x: 50, y: 30}, cp2: {x: 100, y: 80}}],
        strokeStartArrowhead: 'triangle',
        strokeEndArrowhead: 'diamond',
        clipPathId: 'fixture-frame',
        clipRule: 'nonzero' as const,
        ellipseStartAngle: undefined, ellipseEndAngle: undefined,
        extensions: {fixtureRole: 'composite'},
      },
    ],
  }
}

export type CommercialDocumentFixtureKind =
  | 'small'
  | 'medium'
  | 'large'
  | 'text-heavy'
  | 'image-heavy'
  | 'group-mask-boolean-heavy'
  | 'path-heavy'
  | 'style-heavy'

export interface CommercialDocumentFixtureDefinition {
  kind: CommercialDocumentFixtureKind
  document: EditorDocument
  coverageTags: string[]
}

function cloneCanonicalDocument(): EditorDocument {
  return JSON.parse(JSON.stringify(createCanonicalDocumentModelFixture())) as EditorDocument
}

function tagDocument(document: EditorDocument, kind: CommercialDocumentFixtureKind, coverageTags: string[]): EditorDocument {
  return {
    ...document,
    id: `commercial-fixture-${kind}`,
    name: `Commercial Fixture ${kind}`,
    extensions: {
      ...document.extensions,
      commercialFixtureKind: kind,
      coverageTags,
    },
  }
}

function createSmallDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  const frame = document.shapes.find((shape) => shape.id === 'fixture-frame')
  const rectangle = document.shapes.find((shape) => shape.id === 'fixture-rect')
  const text = document.shapes.find((shape) => shape.id === 'fixture-text')

  if (!frame || !rectangle || !text) {
    return document
  }

  frame.childIds = ['fixture-rect', 'fixture-text']
  document.shapes = [frame, rectangle, text]
  return document
}

function appendClonedShape(document: EditorDocument, sourceId: string, nextId: string, offsetX: number, offsetY: number): void {
  const source = document.shapes.find((shape) => shape.id === sourceId)
  const group = document.shapes.find((shape) => shape.id === 'fixture-group')
  if (!source || !group) {
    return
  }

  document.shapes.push({
    ...source,
    id: nextId,
    name: `${source.name} ${nextId}`,
    parentId: group.id,
    childIds: [],
    x: source.x + offsetX,
    y: source.y + offsetY,
    extensions: {
      ...source.extensions,
      clonedForFixtureSuite: true,
    },
  })
  group.childIds = [...(group.childIds ?? []), nextId]
}

function createLargeDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  for (let index = 0; index < 24; index += 1) {
    appendClonedShape(document, 'fixture-styled', `fixture-large-node-${index}`, (index % 6) * 24, Math.floor(index / 6) * 22)
  }
  return document
}

function createTextHeavyDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  for (let index = 0; index < 8; index += 1) {
    appendClonedShape(document, 'fixture-text', `fixture-text-node-${index}`, (index % 4) * 48, Math.floor(index / 4) * 28)
  }
  return document
}

function createImageHeavyDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  for (let index = 0; index < 8; index += 1) {
    appendClonedShape(document, 'fixture-image', `fixture-image-node-${index}`, (index % 4) * 40, Math.floor(index / 4) * 36)
  }
  return document
}

function createGroupMaskBooleanHeavyDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  for (let index = 0; index < 8; index += 1) {
    appendClonedShape(document, 'fixture-styled', `fixture-boolean-mask-node-${index}`, (index % 4) * 32, Math.floor(index / 4) * 34)
    const clone = document.shapes.find((shape) => shape.id === `fixture-boolean-mask-node-${index}`)
    if (clone) {
      clone.booleanOperation = index % 2 === 0 ? 'union' : 'exclude'
      clone.schema = {
        ...clone.schema,
        maskGroupId: `mask-fixture-${index}`,
        maskRole: index % 2 === 0 ? 'source' : 'host',
      }
    }
  }
  return document
}

function createPathHeavyDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  for (let index = 0; index < 10; index += 1) {
    appendClonedShape(document, 'fixture-path', `fixture-path-node-${index}`, (index % 5) * 36, Math.floor(index / 5) * 30)
  }
  return document
}

function createStyleHeavyDocumentFixture(): EditorDocument {
  const document = cloneCanonicalDocument()
  const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'difference', 'luminosity'] as const
  blendModes.forEach((blendMode, index) => {
    appendClonedShape(document, 'fixture-styled', `fixture-style-node-${blendMode}`, (index % 3) * 36, Math.floor(index / 3) * 30)
    const clone = document.shapes.find((shape) => shape.id === `fixture-style-node-${blendMode}`)
    if (clone) {
      clone.blendMode = blendMode
      clone.fills = clone.fills?.map((fill) => ({...fill, blendMode}))
      clone.strokes = clone.strokes?.map((stroke) => ({...stroke, blendMode}))
    }
  })
  return document
}

export function createCommercialDocumentFixtureSuite(): CommercialDocumentFixtureDefinition[] {
  return [
    {
      kind: 'small',
      document: tagDocument(createSmallDocumentFixture(), 'small', ['pages', 'frame', 'shape', 'text']),
      coverageTags: ['pages', 'frame', 'shape', 'text'],
    },
    {
      kind: 'medium',
      document: tagDocument(cloneCanonicalDocument(), 'medium', ['canonical', 'all-node-fields', 'all-shape-types']),
      coverageTags: ['canonical', 'all-node-fields', 'all-shape-types'],
    },
    {
      kind: 'large',
      document: tagDocument(createLargeDocumentFixture(), 'large', ['scale', 'groups', 'style']),
      coverageTags: ['scale', 'groups', 'style'],
    },
    {
      kind: 'text-heavy',
      document: tagDocument(createTextHeavyDocumentFixture(), 'text-heavy', ['text', 'textRuns', 'typography']),
      coverageTags: ['text', 'textRuns', 'typography'],
    },
    {
      kind: 'image-heavy',
      document: tagDocument(createImageHeavyDocumentFixture(), 'image-heavy', ['image', 'assets', 'image-fill']),
      coverageTags: ['image', 'assets', 'image-fill'],
    },
    {
      kind: 'group-mask-boolean-heavy',
      document: tagDocument(createGroupMaskBooleanHeavyDocumentFixture(), 'group-mask-boolean-heavy', ['groups', 'masks', 'booleans']),
      coverageTags: ['groups', 'masks', 'booleans'],
    },
    {
      kind: 'path-heavy',
      document: tagDocument(createPathHeavyDocumentFixture(), 'path-heavy', ['paths', 'bezier', 'stroke-arrowheads']),
      coverageTags: ['paths', 'bezier', 'stroke-arrowheads'],
    },
    {
      kind: 'style-heavy',
      document: tagDocument(createStyleHeavyDocumentFixture(), 'style-heavy', ['fills', 'strokes', 'effects', 'blend-modes']),
      coverageTags: ['fills', 'strokes', 'effects', 'blend-modes'],
    },
  ]
}
