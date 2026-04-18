import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type Point,
} from '@venus/document-core'
import {VisionFileType} from '../../editor/hooks/useEditorRuntime.ts'

function createHeroImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320">
      <defs>
        <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="520" height="320" rx="30" fill="url(#heroBg)" />
      <circle cx="420" cy="66" r="44" fill="rgba(255,255,255,0.2)" />
      <path d="M0 224 C 94 176, 196 342, 520 184 L 520 320 L 0 320 Z" fill="rgba(15,23,42,0.24)" />
      <text x="30" y="126" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">Venus Studio</text>
      <text x="30" y="168" font-family="Arial, sans-serif" font-size="17" fill="rgba(255,255,255,0.92)">Compose. Align. Draw. Ship.</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createAccentImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220">
      <defs>
        <linearGradient id="panelBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="100%" stop-color="#be123c" />
        </linearGradient>
      </defs>
      <rect width="340" height="220" rx="22" fill="#0f172a" />
      <rect x="18" y="18" width="304" height="184" rx="16" fill="url(#panelBg)" />
      <path d="M30 150 L 84 116 L 140 142 L 190 110 L 236 146 L 306 122 L 306 186 L 30 186 Z" fill="rgba(15,23,42,0.2)" />
      <text x="40" y="84" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#fff1f2">Mood Board</text>
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

function createBezierRibbonPath() {
  const points: Point[] = [
    {x: 120, y: 516},
    {x: 224, y: 454},
    {x: 338, y: 526},
    {x: 456, y: 444},
    {x: 590, y: 510},
  ]
  const bezierPoints: BezierPoint[] = [
    {anchor: {x: 120, y: 516}, cp2: {x: 156, y: 470}},
    {anchor: {x: 224, y: 454}, cp1: {x: 188, y: 452}, cp2: {x: 260, y: 454}},
    {anchor: {x: 338, y: 526}, cp1: {x: 304, y: 546}, cp2: {x: 380, y: 534}},
    {anchor: {x: 456, y: 444}, cp1: {x: 424, y: 412}, cp2: {x: 500, y: 440}},
    {anchor: {x: 590, y: 510}, cp1: {x: 546, y: 536}},
  ]

  const bounds = getBoundingRectFromBezierPoints(bezierPoints)
  return {points, bezierPoints, bounds}
}

const ribbonPath = createBezierRibbonPath()

export const MOCK_FILE: VisionFileType = {
  id: 'mock-file',
  name: 'Untitled',
  version: '0.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  config: {
    page: {
      unit: 'px',
      width: 960,
      height: 640,
      dpi: 72,
    },
  },
  elements: [
    {
      id: 'group-cards',
      type: 'group',
      name: 'Feature Cards',
      x: 58,
      y: 94,
      width: 304,
      height: 248,
      parentId: null,
      childIds: ['card-analytics', 'card-workflow', 'card-badge'],
    },
    {
      id: 'card-analytics',
      type: 'rectangle',
      name: 'Analytics Card',
      x: 72,
      y: 114,
      width: 180,
      height: 104,
      parentId: 'group-cards',
      fill: {enabled: true, color: '#eff6ff'},
      stroke: {enabled: true, color: '#1d4ed8', weight: 2},
      cornerRadius: 16,
    },
    {
      id: 'card-workflow',
      type: 'rectangle',
      name: 'Workflow Card',
      x: 196,
      y: 196,
      width: 148,
      height: 118,
      parentId: 'group-cards',
      fill: {enabled: true, color: '#fff7ed'},
      stroke: {enabled: true, color: '#c2410c', weight: 2},
      cornerRadii: {
        topLeft: 24,
        topRight: 8,
        bottomRight: 24,
        bottomLeft: 8,
      },
    },
    {
      id: 'card-badge',
      type: 'star',
      name: 'Feature Badge',
      x: 278,
      y: 98,
      width: 72,
      height: 72,
      parentId: 'group-cards',
      points: createStarPoints(278, 98, 72, 72),
      fill: {enabled: true, color: '#fde68a'},
      stroke: {enabled: true, color: '#a16207', weight: 2},
    },
    {
      id: 'title-main',
      type: 'text',
      name: 'Main Title',
      text: 'Venus Workspace',
      x: 420,
      y: 52,
      width: 370,
      height: 52,
      parentId: null,
      fill: {enabled: true, color: '#0f172a'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    },
    {
      id: 'title-sub',
      type: 'text',
      name: 'Sub Title',
      text: 'Clean baseline scene for alignment, clipping, and path edits',
      x: 420,
      y: 104,
      width: 460,
      height: 40,
      parentId: null,
      fill: {enabled: true, color: '#0f766e'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    },
    {
      id: 'group-roadmap',
      type: 'group',
      name: 'Roadmap Group',
      x: 392,
      y: 334,
      width: 184,
      height: 196,
      parentId: null,
      childIds: ['roadmap-panel', 'roadmap-milestone-a', 'roadmap-milestone-b', 'roadmap-link'],
    },
    {
      id: 'roadmap-panel',
      type: 'rectangle',
      name: 'Roadmap Panel',
      x: 404,
      y: 348,
      width: 162,
      height: 170,
      parentId: 'group-roadmap',
      fill: {enabled: true, color: '#f1f5f9'},
      stroke: {enabled: true, color: '#334155', weight: 2},
      cornerRadius: 18,
    },
    {
      id: 'roadmap-milestone-a',
      type: 'ellipse',
      name: 'Milestone A',
      x: 430,
      y: 378,
      width: 26,
      height: 26,
      parentId: 'group-roadmap',
      fill: {enabled: true, color: '#22c55e'},
      stroke: {enabled: true, color: '#166534', weight: 2},
    },
    {
      id: 'roadmap-milestone-b',
      type: 'ellipse',
      name: 'Milestone B',
      x: 510,
      y: 450,
      width: 30,
      height: 30,
      parentId: 'group-roadmap',
      fill: {enabled: true, color: '#f59e0b'},
      stroke: {enabled: true, color: '#92400e', weight: 2},
    },
    {
      id: 'roadmap-link',
      type: 'lineSegment',
      name: 'Roadmap Connector',
      x: 442,
      y: 392,
      width: 84,
      height: 74,
      parentId: 'group-roadmap',
      points: [
        {x: 442, y: 392},
        {x: 526, y: 466},
      ],
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#0f172a', weight: 3},
    },
    {
      id: 'roadmap-caption',
      type: 'text',
      name: 'Roadmap Caption',
      text: 'A/B milestones + connector for line and group transform checks',
      x: 392,
      y: 536,
      width: 280,
      height: 36,
      parentId: null,
      fill: {enabled: true, color: '#334155'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    },
    {
      id: 'mask-pentagon',
      type: 'polygon',
      name: 'Mask Pentagon',
      x: 594,
      y: 176,
      width: 292,
      height: 218,
      parentId: null,
      points: [
        {x: 676, y: 176},
        {x: 866, y: 220},
        {x: 848, y: 366},
        {x: 648, y: 394},
        {x: 594, y: 276},
      ],
      fill: {enabled: true, color: '#f8fafc'},
      stroke: {enabled: true, color: '#94a3b8', weight: 1},
    },
    {
      id: 'hero-image',
      type: 'image',
      name: 'Hero Image',
      x: 566,
      y: 162,
      width: 332,
      height: 238,
      parentId: null,
      asset: 'mock-image-asset-hero',
      opacity: 1,
      clipPathId: 'mask-pentagon',
      clipRule: 'nonzero',
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    },
    {
      id: 'line-check',
      type: 'lineSegment',
      name: 'Line Position Check',
      x: 120,
      y: 420,
      width: 160,
      height: 120,
      parentId: null,
      points: [
        {x: 280, y: 420},
        {x: 120, y: 540},
      ],
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#dc2626', weight: 4},
      rotation: 0,
    },
    {
      id: 'path-ribbon',
      type: 'path',
      name: 'Ribbon Path',
      x: ribbonPath.bounds.x,
      y: ribbonPath.bounds.y,
      width: ribbonPath.bounds.width,
      height: ribbonPath.bounds.height,
      parentId: null,
      points: ribbonPath.points,
      bezierPoints: ribbonPath.bezierPoints,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#0f766e', weight: 3},
    },
    {
      id: 'path-polyline',
      type: 'path',
      name: 'Polyline Accent',
      x: 676,
      y: 456,
      width: 212,
      height: 130,
      parentId: null,
      points: [
        {x: 676, y: 456},
        {x: 724, y: 502},
        {x: 784, y: 472},
        {x: 842, y: 548},
        {x: 888, y: 496},
      ],
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#1d4ed8', weight: 2},
    },
    {
      id: 'accent-image',
      type: 'image',
      name: 'Accent Image',
      x: 38,
      y: 402,
      width: 216,
      height: 140,
      parentId: null,
      asset: 'mock-image-asset-accent',
      opacity: 1,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    },
    {
      id: 'sticker-tag',
      type: 'polygon',
      name: 'Sticker Tag',
      x: 416,
      y: 196,
      width: 150,
      height: 112,
      parentId: null,
      points: [
        {x: 452, y: 196},
        {x: 566, y: 218},
        {x: 548, y: 292},
        {x: 426, y: 308},
        {x: 416, y: 244},
      ],
      fill: {enabled: true, color: '#ede9fe'},
      stroke: {enabled: true, color: '#6d28d9', weight: 2},
    },
  ],
  assets: [
    {
      id: 'mock-image-asset-hero',
      name: 'Hero Asset',
      type: 'image',
      mimeType: 'image/svg+xml',
      objectUrl: createHeroImageDataUrl(),
    },
    {
      id: 'mock-image-asset-accent',
      name: 'Accent Asset',
      type: 'image',
      mimeType: 'image/svg+xml',
      objectUrl: createAccentImageDataUrl(),
    },
  ],
}
