import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type Point,
} from '@venus/document-core'
import {VisionFileType} from '../../hooks/useEditorRuntime.ts'

function createMockImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22d3ee" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="360" height="240" rx="36" fill="url(#bg)" />
      <circle cx="268" cy="72" r="36" fill="rgba(255,255,255,0.28)" />
      <path d="M0 176 C 72 126, 166 244, 360 146 L 360 240 L 0 240 Z" fill="rgba(15,23,42,0.18)" />
      <text x="28" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="white">Masked Image</text>
      <text x="28" y="148" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.88)">Vector editor mock asset</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function createMockMixedPathPoints(): Point[] {
  return [
    {x: 124, y: 454},
    {x: 238, y: 336},
    {x: 274, y: 428},
    {x: 388, y: 304},
    {x: 422, y: 486},
  ]
}

function createMockMixedBezierPoints(): BezierPoint[] {
  return [
    {anchor: {x: 124, y: 454}, cp2: {x: 168, y: 372}},
    {anchor: {x: 238, y: 336}, cp1: {x: 194, y: 354}, cp2: {x: 286, y: 316}},
    {anchor: {x: 274, y: 428}, cp1: {x: 244, y: 470}, cp2: {x: 334, y: 468}},
    {anchor: {x: 388, y: 304}, cp1: {x: 346, y: 256}, cp2: {x: 408, y: 360}},
    {anchor: {x: 422, y: 486}, cp1: {x: 398, y: 432}},
  ]
}

function createMockBezierPath() {
  const points = createMockMixedPathPoints()
  // This default path intentionally mixes straight segments and bezier segments
  // so renderer and hit-test paths cover both cases without extra setup.
  const bezierPoints = createMockMixedBezierPoints()
  const bounds = getBoundingRectFromBezierPoints(bezierPoints)

  return {
    points,
    bezierPoints,
    bounds,
  }
}

function createSecondaryMockMixedPathPoints(): Point[] {
  return [
    {x: 104, y: 528},
    {x: 186, y: 472},
    {x: 272, y: 566},
    {x: 356, y: 502},
    {x: 432, y: 596},
  ]
}

function createSecondaryMockMixedBezierPoints(): BezierPoint[] {
  return [
    {anchor: {x: 104, y: 528}, cp2: {x: 144, y: 494}},
    {anchor: {x: 186, y: 472}, cp1: {x: 152, y: 492}, cp2: {x: 224, y: 500}},
    {anchor: {x: 272, y: 566}, cp1: {x: 236, y: 548}, cp2: {x: 316, y: 604}},
    {anchor: {x: 356, y: 502}, cp1: {x: 322, y: 458}, cp2: {x: 384, y: 540}},
    {anchor: {x: 432, y: 596}, cp1: {x: 398, y: 556}},
  ]
}

function createSecondaryMockBezierPath() {
  const points = createSecondaryMockMixedPathPoints()
  const bezierPoints = createSecondaryMockMixedBezierPoints()
  const bounds = getBoundingRectFromBezierPoints(bezierPoints)

  return {
    points,
    bezierPoints,
    bounds,
  }
}

const rect0 = {
  id: 'rectangle0',
  type: 'rectangle',
  layer: 0,
  cx: 100,
  cy: 100,
  width: 100,
  height: 100,
  rotation: 0,
  fill: {
    enabled: true,
    color: '#ffffff',
  },
  stroke: {
    enabled: true,
    weight: 1,
    color: '#000000',
  },
  parentId: null,
}

const group0 = {
  id: 'group0',
  type: 'group',
  name: 'Hero Group',
  x: 60,
  y: 60,
  width: 320,
  height: 320,
  parentId: null,
  childIds: ['rectangle0', 'rectangle1', 'group1'],
}

const rect1 = {
  ...rect0,
  id: 'rectangle1',
  cx: 240,
  parentId: 'group0',
}

const rect2 = {
  ...rect0,
  id: 'rectangle2',
  cy: 240,
}

const ellipse0 = {
  ...rect0,
  id: 'ellipse0',
  type: 'ellipse',
  cx: 420,
  cy: 180,
  width: 140,
  height: 140,
  parentId: null,
}

const polygon0 = {
  ...rect0,
  id: 'polygon0',
  type: 'polygon',
  name: 'Polygon',
  x: 620,
  y: 340,
  width: 150,
  height: 140,
  points: [
    {x: 700, y: 340},
    {x: 770, y: 388},
    {x: 744, y: 480},
    {x: 656, y: 480},
    {x: 620, y: 396},
  ],
  parentId: null,
}

const star0 = {
  ...rect0,
  id: 'star0',
  type: 'star',
  name: 'Star',
  x: 620,
  y: 120,
  width: 140,
  height: 140,
  points: createStarPoints(620, 120, 140, 140),
  parentId: null,
}

const imageMask0 = {
  ...rect0,
  id: 'imageMask0',
  type: 'ellipse',
  name: 'Image Mask',
  x: 470,
  y: 250,
  width: 220,
  height: 160,
  parentId: null,
}

const image0 = {
  ...rect0,
  id: 'image0',
  type: 'image',
  name: 'Masked Image',
  x: 430,
  y: 220,
  width: 300,
  height: 220,
  asset: 'mock-image-asset-0',
  clipPathId: 'imageMask0',
  clipRule: 'nonzero',
  parentId: null,
}

const group1 = {
  id: 'group1',
  type: 'group',
  name: 'Nested Group',
  x: 190,
  y: 170,
  width: 180,
  height: 140,
  parentId: 'group0',
  childIds: ['rectangle2'],
}

const groupedRect0 = {
  ...rect0,
  parentId: 'group0',
}

const groupedRect2 = {
  ...rect2,
  parentId: 'group1',
}

const lineSegment0 = {
  ...rect0,
  id: 'lineSegment0',
  type: 'lineSegment',
  cx: 520,
  cy: 340,
  width: 180,
  height: 100,
  fill: {
    enabled: false,
    color: '#ffffff',
  },
  strokeStartArrowhead: 'none',
  strokeEndArrowhead: 'none',
  parentId: null,
}

const mockBezierPath = createMockBezierPath()
const mockBezierPathSecondary = createSecondaryMockBezierPath()

const path0 = {
  ...rect0,
  id: 'path0',
  type: 'path',
  name: 'Bezier Path',
  x: mockBezierPath.bounds.x,
  y: mockBezierPath.bounds.y,
  width: mockBezierPath.bounds.width,
  height: mockBezierPath.bounds.height,
  points: mockBezierPath.points,
  bezierPoints: mockBezierPath.bezierPoints,
  strokeStartArrowhead: 'none',
  strokeEndArrowhead: 'none',
  fill: {
    enabled: false,
    color: '#ffffff',
  },
  stroke: {
    enabled: true,
    color: '#2563eb',
    weight: 3,
  },
  parentId: null,
}

const path1 = {
  ...rect0,
  id: 'path1',
  type: 'path',
  name: 'Bezier Path B',
  x: mockBezierPathSecondary.bounds.x,
  y: mockBezierPathSecondary.bounds.y,
  width: mockBezierPathSecondary.bounds.width,
  height: mockBezierPathSecondary.bounds.height,
  points: mockBezierPathSecondary.points,
  bezierPoints: mockBezierPathSecondary.bezierPoints,
  strokeEndArrowhead: 'none',
  fill: {
    enabled: false,
    color: '#ffffff',
  },
  stroke: {
    enabled: true,
    color: '#0f766e',
    weight: 3,
  },
  parentId: null,
}

const text0 = {
  ...rect0,
  id: 'text0',
  type: 'text',
  name: 'Vector text baseline',
  x: 470,
  y: 90,
  width: 220,
  height: 40,
  fill: {
    enabled: false,
    color: '#ffffff',
  },
  parentId: null,
}

export const MOCK_FILE: VisionFileType = {
  id: 'mock-file',
  name: 'Untitled',
  version: '0.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  config: {
    page: {
      unit: 'px',
      width: 800,
      height: 600,
      dpi: 72,
    },
  },
  elements: [group0, groupedRect0, rect1, group1, groupedRect2, ellipse0, polygon0, star0, imageMask0, image0, lineSegment0, path0, path1, text0],
  assets: [
    {
      id: 'mock-image-asset-0',
      name: 'Masked Image',
      type: 'image',
      mimeType: 'image/svg+xml',
      objectUrl: createMockImageDataUrl(),
    },
  ],
}
