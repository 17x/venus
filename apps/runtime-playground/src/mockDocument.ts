import type {DocumentNode, EditorDocument} from '@venus/document-core'

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
    id: 'shape-rect',
    type: 'rectangle',
    name: 'Rectangle',
    x: 120,
    y: 120,
    width: 240,
    height: 160,
  },
  {
    id: 'shape-ellipse',
    type: 'ellipse',
    name: 'Ellipse',
    x: 460,
    y: 180,
    width: 200,
    height: 140,
  },
  {
    id: 'shape-text',
    type: 'text',
    name: 'Runtime Playground',
    x: 260,
    y: 420,
    width: 300,
    height: 72,
  },
  {
    id: 'shape-image',
    type: 'image',
    name: 'Mock Image',
    assetUrl: createMockImageDataUrl(),
    x: 720,
    y: 120,
    width: 320,
    height: 220,
  },
]

export const MOCK_DOCUMENT: EditorDocument = {
  id: 'runtime-playground-document',
  name: 'Runtime Playground',
  width: 1200,
  height: 800,
  shapes: SHAPES,
}
