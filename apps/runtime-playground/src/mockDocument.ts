import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type Point,
} from '@venus/document-core'

function createMockImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="mock-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22d3ee" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="28" fill="url(#mock-bg)" />
      <circle cx="246" cy="62" r="30" fill="rgba(255,255,255,0.28)" />
      <path d="M0 164 C 70 116, 148 222, 320 138 L 320 220 L 0 220 Z" fill="rgba(15,23,42,0.18)" />
      <text x="24" y="98" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="white">Mock Image</text>
      <text x="24" y="132" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.88)">Runtime playground demo asset</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createDemoMixedPathPoints(): Point[] {
  return [
    {x: 112, y: 574},
    {x: 268, y: 452},
    {x: 386, y: 638},
    {x: 582, y: 478},
    {x: 694, y: 624},
  ]
}

function createDemoMixedBezierPoints(): BezierPoint[] {
  return [
    {anchor: {x: 112, y: 574}, cp2: {x: 182, y: 498}},
    {anchor: {x: 268, y: 452}, cp1: {x: 222, y: 470}, cp2: {x: 334, y: 430}},
    {anchor: {x: 386, y: 638}, cp1: {x: 342, y: 706}, cp2: {x: 482, y: 670}},
    {anchor: {x: 582, y: 478}, cp1: {x: 522, y: 402}, cp2: {x: 634, y: 528}},
    {anchor: {x: 694, y: 624}, cp1: {x: 650, y: 572}},
  ]
}

function createDemoBezierShape(): DocumentNode {
  const points = createDemoMixedPathPoints()
  // The default playground scene keeps one mixed path with straight and bezier
  // segments so default hover/selection checks exercise both code paths.
  const bezierPoints = createDemoMixedBezierPoints()
  const bounds = getBoundingRectFromBezierPoints(bezierPoints)

  return {
    id: 'shape-bezier-path',
    type: 'path',
    name: 'Mixed Path',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    bezierPoints,
    strokeStartArrowhead: 'none',
    strokeEndArrowhead: 'none',
    fill: {
      enabled: false,
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#2563eb',
      weight: 2,
    },
  }
}

function createDemoSecondaryMixedPathPoints(): Point[] {
  return [
    {x: 760, y: 356},
    {x: 842, y: 334},
    {x: 902, y: 418},
    {x: 982, y: 382},
    {x: 1060, y: 448},
  ]
}

function createDemoSecondaryMixedBezierPoints(): BezierPoint[] {
  return [
    {anchor: {x: 760, y: 356}, cp2: {x: 786, y: 348}},
    {anchor: {x: 842, y: 334}, cp1: {x: 816, y: 340}, cp2: null},
    {anchor: {x: 902, y: 418}, cp1: null, cp2: {x: 934, y: 432}},
    {anchor: {x: 982, y: 382}, cp1: {x: 948, y: 354}, cp2: null},
    {anchor: {x: 1060, y: 448}, cp1: null},
  ]
}

function createDemoSecondaryBezierShape(): DocumentNode {
  const points = createDemoSecondaryMixedPathPoints()
  const bezierPoints = createDemoSecondaryMixedBezierPoints()
  const bounds = getBoundingRectFromBezierPoints(bezierPoints)

  return {
    id: 'shape-bezier-path-secondary',
    type: 'path',
    name: 'Mixed Path B',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    bezierPoints,
    strokeEndArrowhead: 'none',
    fill: {
      enabled: false,
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#ef4444',
      weight: 2,
    },
  }
}

const SHAPES: DocumentNode[] = [
  {
    id: 'frame-root',
    type: 'frame',
    name: 'Runtime Frame',
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
  },
  {
    id: 'group-root',
    type: 'group',
    name: 'Hero Group',
    childIds: ['shape-rect', 'group-nested', 'shape-text'],
    x: 120,
    y: 120,
    width: 564,
    height: 372,
  },
  {
    id: 'shape-rect',
    type: 'rectangle',
    name: 'Rectangle',
    parentId: 'group-root',
    x: 120,
    y: 120,
    width: 240,
    height: 160,
    fill: {
      enabled: true,
      color: '#f8fafc',
    },
    stroke: {
      enabled: true,
      color: '#0f172a',
      weight: 1.25,
    },
    shadow: {
      enabled: true,
      color: 'rgba(15,23,42,0.2)',
      offsetX: 0,
      offsetY: 4,
      blur: 14,
    },
    cornerRadii: {
      topLeft: 28,
      topRight: 12,
      bottomRight: 30,
      bottomLeft: 6,
    },
  },
  {
    id: 'group-nested',
    type: 'group',
    name: 'Nested Group',
    parentId: 'group-root',
    childIds: ['shape-ellipse'],
    x: 460,
    y: 180,
    width: 200,
    height: 140,
  },
  {
    id: 'shape-ellipse',
    type: 'ellipse',
    name: 'Ellipse',
    parentId: 'group-nested',
    x: 460,
    y: 180,
    width: 200,
    height: 140,
    fill: {
      enabled: true,
      color: '#dbeafe',
    },
    stroke: {
      enabled: true,
      color: '#1d4ed8',
      weight: 2,
    },
    shadow: {
      enabled: true,
      color: 'rgba(37,99,235,0.22)',
      offsetX: 0,
      offsetY: 3,
      blur: 12,
    },
    ellipseStartAngle: 18,
    ellipseEndAngle: 318,
  },
  {
    id: 'shape-text',
    type: 'text',
    name: 'Runtime Playground',
    parentId: 'group-root',
    x: 260,
    y: 420,
    width: 300,
    height: 72,
  },
  createDemoBezierShape(),
  createDemoSecondaryBezierShape(),
  {
    id: 'shape-image',
    type: 'image',
    name: 'Mock Image',
    assetUrl: createMockImageDataUrl(),
    x: 720,
    y: 120,
    width: 320,
    height: 220,
    stroke: {
      enabled: true,
      color: '#be123c',
      weight: 1,
    },
    shadow: {
      enabled: true,
      color: 'rgba(15,23,42,0.24)',
      offsetX: 0,
      offsetY: 6,
      blur: 18,
    },
  },
]

export const MOCK_DOCUMENT: EditorDocument = {
  id: 'runtime-playground-document',
  name: 'Runtime Playground',
  width: 1200,
  height: 800,
  shapes: SHAPES,
}
