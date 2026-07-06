import type {EditorFileDocument} from '../../types/index.ts'
import {
  createAccentImageDataUrl,
  createHeroImageDataUrl,
} from './mockFile.images.ts'

export const MOCK_FILE: EditorFileDocument = {
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
    // ═══════════════════════════════════════════════════════════════
    // Complex Multi-Level Group (4 levels deep) — right side
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'group-artboard',
      type: 'group',
      name: 'Complex Artboard',
      x: 610,
      y: 20,
      width: 338,
      height: 320,
      parentId: null,
      childIds: ['group-header', 'group-content', 'shape-footer-bar'],
    },
    // Level 2: Header
    {
      id: 'group-header',
      type: 'group',
      name: 'Header Section',
      x: 620,
      y: 28,
      width: 318,
      height: 44,
      parentId: 'group-artboard',
      childIds: ['shape-logo', 'shape-title-bar'],
    },
    // Level 3: Logo
    {
      id: 'shape-logo',
      type: 'ellipse',
      name: 'Logo',
      x: 628,
      y: 34,
      width: 28,
      height: 28,
      parentId: 'group-header',
      fill: { enabled: true, color: '#3b82f6' },
      stroke: { enabled: true, color: '#1d4ed8', weight: 1.5 },
      cornerRadius: 0,
    },
    // Level 3: Title Bar
    {
      id: 'shape-title-bar',
      type: 'rectangle',
      name: 'Title Bar',
      x: 664,
      y: 36,
      width: 262,
      height: 24,
      parentId: 'group-header',
      fill: { enabled: true, color: '#f1f5f9' },
      stroke: { enabled: true, color: '#cbd5e1', weight: 1 },
      cornerRadius: 4,
    },
    // Level 2: Content Area
    {
      id: 'group-content',
      type: 'group',
      name: 'Content Area',
      x: 620,
      y: 80,
      width: 318,
      height: 180,
      parentId: 'group-artboard',
      childIds: ['group-left-panel', 'shape-main-canvas'],
    },
    // Level 3: Left Panel (narrowed from 100→68)
    {
      id: 'group-left-panel',
      type: 'group',
      name: 'Left Panel',
      x: 624,
      y: 88,
      width: 68,
      height: 164,
      parentId: 'group-content',
      childIds: ['shape-nav-item-1', 'shape-nav-item-2', 'shape-nav-item-3'],
    },
    // Level 4: Nav Item 1
    {
      id: 'shape-nav-item-1',
      type: 'rectangle',
      name: 'Dashboard',
      x: 630,
      y: 94,
      width: 56,
      height: 22,
      parentId: 'group-left-panel',
      fill: { enabled: true, color: '#dbeafe' },
      stroke: { enabled: false },
      cornerRadius: 4,
    },
    // Level 4: Nav Item 2
    {
      id: 'shape-nav-item-2',
      type: 'rectangle',
      name: 'Settings',
      x: 630,
      y: 122,
      width: 56,
      height: 22,
      parentId: 'group-left-panel',
      fill: { enabled: true, color: '#f3f4f6' },
      stroke: { enabled: false },
      cornerRadius: 4,
    },
    // Level 4: Nav Item 3
    {
      id: 'shape-nav-item-3',
      type: 'rectangle',
      name: 'Reports',
      x: 630,
      y: 150,
      width: 56,
      height: 22,
      parentId: 'group-left-panel',
      fill: { enabled: true, color: '#f3f4f6' },
      stroke: { enabled: false },
      cornerRadius: 4,
    },
    // Level 3: Main Canvas
    {
      id: 'shape-main-canvas',
      type: 'rectangle',
      name: 'Main Canvas',
      x: 700,
      y: 88,
      width: 226,
      height: 164,
      parentId: 'group-content',
      fill: { enabled: true, color: '#ffffff' },
      stroke: { enabled: true, color: '#e2e8f0', weight: 1 },
      cornerRadius: 8,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.06)', offsetX: 0, offsetY: 2, blur: 8 },
    },
    // Level 2: Footer Bar
    {
      id: 'shape-footer-bar',
      type: 'rectangle',
      name: 'Footer Bar',
      x: 620,
      y: 268,
      width: 318,
      height: 22,
      parentId: 'group-artboard',
      fill: { enabled: true, color: '#f8fafc' },
      stroke: { enabled: true, color: '#e2e8f0', weight: 1 },
      cornerRadius: 0,
    },

    // ═══════════════════════════════════════════════════════════════
    // All Element Types Grid — tiled on the left side
    // Row 1: Rect · Ellipse · Ellipse Arc · Line · Polygon
    // Row 2: Star · Path Polyline · Path Bezier · Image · Clipped Image
    // Each card: 100×100, 8px gap. 5 cols starting at x=16.
    // ═══════════════════════════════════════════════════════════════

    // ── Row 1 ──────────────────────────────────────────────────────
    // 1. Rectangle — fill + stroke + cornerRadius + shadow
    {
      id: 'type-rect',
      type: 'rectangle',
      name: 'Rectangle',
      x: 26,
      y: 30,
      width: 80,
      height: 50,
      parentId: null,
      fill: { enabled: true, color: '#dbeafe' },
      stroke: { enabled: true, color: '#2563eb', weight: 2 },
      cornerRadius: 10,
      shadow: { enabled: true, color: 'rgba(37,99,235,0.2)', offsetX: 0, offsetY: 3, blur: 6 },
    },
    // Label: Rect
    {
      id: 'type-rect-label',
      type: 'text',
      name: 'Rect Label',
      text: 'Rect',
      textRuns: [{ start: 0, end: 4, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }],
      x: 16, y: 90, width: 100, height: 18,
      parentId: null,
      fill: { enabled: true, color: '#64748b' },
      stroke: { enabled: false },
    },

    // 2. Ellipse — radial gradient + shadow
    {
      id: 'type-ellipse',
      type: 'ellipse',
      name: 'Ellipse',
      x: 134,
      y: 30,
      width: 80,
      height: 50,
      parentId: null,
      fill: { enabled: true, color: '#fef9c3', gradient: { type: 'radial', centerX: 0.45, centerY: 0.35, radius: 0.8, stops: [{ offset: 0, color: '#fef9c3' }, { offset: 1, color: '#f59e0b' }] } },
      stroke: { enabled: true, color: '#a16207', weight: 2 },
      shadow: { enabled: true, color: 'rgba(161,98,7,0.25)', offsetX: 0, offsetY: 4, blur: 8 },
    },
    { id: 'type-ellipse-label', type: 'text', name: 'Ellipse Label', text: 'Ellipse', textRuns: [{ start: 0, end: 7, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 124, y: 90, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 3. Ellipse Arc — open arc with start/end angle
    {
      id: 'type-ellipse-arc',
      type: 'ellipse',
      name: 'Ellipse Arc',
      x: 242,
      y: 30,
      width: 80,
      height: 50,
      parentId: null,
      ellipseStartAngle: 30,
      ellipseEndAngle: 330,
      fill: { enabled: true, color: '#dbeafe' },
      stroke: { enabled: true, color: '#1d4ed8', weight: 2 },
    },
    { id: 'type-ellipse-arc-label', type: 'text', name: 'Arc Label', text: 'Arc', textRuns: [{ start: 0, end: 3, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 232, y: 90, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 4. Line Segment — two-point line with stroke
    {
      id: 'type-line',
      type: 'lineSegment',
      name: 'Line',
      x: 350,
      y: 30,
      width: 80,
      height: 50,
      parentId: null,
      points: [{ x: 354, y: 72 }, { x: 422, y: 38 }],
      fill: { enabled: false },
      stroke: { enabled: true, color: '#dc2626', weight: 3 },
    },
    { id: 'type-line-label', type: 'text', name: 'Line Label', text: 'Line', textRuns: [{ start: 0, end: 4, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 340, y: 90, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 5. Polygon — 5-point closed polygon
    {
      id: 'type-polygon',
      type: 'polygon',
      name: 'Polygon',
      x: 458,
      y: 30,
      width: 80,
      height: 50,
      parentId: null,
      points: [{ x: 498, y: 32 }, { x: 530, y: 46 }, { x: 522, y: 72 }, { x: 474, y: 72 }, { x: 466, y: 46 }],
      fill: { enabled: true, color: '#ede9fe' },
      stroke: { enabled: true, color: '#7c3aed', weight: 2 },
    },
    { id: 'type-polygon-label', type: 'text', name: 'Polygon Label', text: 'Polygon', textRuns: [{ start: 0, end: 7, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 448, y: 90, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // ── Row 2 ──────────────────────────────────────────────────────
    // 6. Star — 10-point star polygon
    {
      id: 'type-star',
      type: 'star',
      name: 'Star',
      x: 26,
      y: 142,
      width: 80,
      height: 50,
      parentId: null,
      points: [
        { x: 66, y: 144 }, { x: 74, y: 160 }, { x: 90, y: 162 }, { x: 78, y: 172 },
        { x: 80, y: 188 }, { x: 66, y: 180 }, { x: 52, y: 188 }, { x: 54, y: 172 },
        { x: 42, y: 162 }, { x: 58, y: 160 },
      ],
      fill: { enabled: true, color: '#fde68a' },
      stroke: { enabled: true, color: '#a16207', weight: 1.5 },
    },
    { id: 'type-star-label', type: 'text', name: 'Star Label', text: 'Star', textRuns: [{ start: 0, end: 4, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 16, y: 202, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 7. Path (polyline) — open multi-point path
    {
      id: 'type-path-polyline',
      type: 'path',
      name: 'Path Polyline',
      x: 134,
      y: 142,
      width: 80,
      height: 50,
      parentId: null,
      points: [{ x: 142, y: 186 }, { x: 158, y: 158 }, { x: 170, y: 180 }, { x: 186, y: 150 }, { x: 202, y: 174 }],
      fill: { enabled: false },
      stroke: { enabled: true, color: '#0f766e', weight: 2.5 },
    },
    { id: 'type-path-polyline-label', type: 'text', name: 'Path Line Label', text: 'Path', textRuns: [{ start: 0, end: 4, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 124, y: 202, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 8. Path (bezier) — bezier curve path
    {
      id: 'type-path-bezier',
      type: 'path',
      name: 'Path Bezier',
      x: 242,
      y: 142,
      width: 80,
      height: 50,
      parentId: null,
      bezierPoints: [
        { anchor: { x: 250, y: 170 }, cp2: { x: 264, y: 148 } },
        { anchor: { x: 280, y: 184 }, cp1: { x: 268, y: 190 } },
        { anchor: { x: 306, y: 160 }, cp1: { x: 294, y: 178 }, cp2: { x: 298, y: 152 } },
      ],
      fill: { enabled: false },
      stroke: { enabled: true, color: '#1d4ed8', weight: 2.5 },
    },
    { id: 'type-path-bezier-label', type: 'text', name: 'Path Bezier Label', text: 'Bezier', textRuns: [{ start: 0, end: 6, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 232, y: 202, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 9. Image — image with asset
    {
      id: 'type-image',
      type: 'image',
      name: 'Image',
      x: 350,
      y: 142,
      width: 80,
      height: 50,
      parentId: null,
      asset: 'mock-image-asset-hero',
      opacity: 1,
      fill: { enabled: false },
      stroke: { enabled: true, color: '#cbd5e1', weight: 1 },
    },
    { id: 'type-image-label', type: 'text', name: 'Image Label', text: 'Image', textRuns: [{ start: 0, end: 5, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 340, y: 202, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // 10. Clipped Image — image with clip-path
    {
      id: 'type-clip-mask',
      type: 'ellipse',
      name: 'Clip Mask',
      x: 458,
      y: 145,
      width: 80,
      height: 44,
      parentId: null,
      fill: { enabled: true, color: '#f1f5f9' },
      stroke: { enabled: true, color: '#94a3b8', weight: 1 },
    },
    {
      id: 'type-clipped-image',
      type: 'image',
      name: 'Clipped Image',
      x: 450,
      y: 140,
      width: 96,
      height: 54,
      parentId: null,
      asset: 'mock-image-asset-accent',
      opacity: 1,
      clipPathId: 'type-clip-mask',
      clipRule: 'nonzero',
      fill: { enabled: false },
      stroke: { enabled: false },
    },
    { id: 'type-clip-label', type: 'text', name: 'Clip Label', text: 'Clip', textRuns: [{ start: 0, end: 4, style: { color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, lineHeight: 16, textAlign: 'center' } }], x: 448, y: 202, width: 100, height: 18, parentId: null, fill: { enabled: true, color: '#64748b' }, stroke: { enabled: false } },

    // ═══════════════════════════════════════════════════════════════
    // Full Text Pipeline Demo — 7-line rich text showcasing all
    // features: multi-script, bold/italic/weight, shadow,
    // letter-spacing, multi-font fallback, line-height,
    // AND width-based word wrapping (width=300 guarantees wrap on L1,L3)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'text-pipeline-demo',
      type: 'text',
      name: 'Text Pipeline Full Demo',
      text: 'Venus 文本引擎 · Full Pipeline Demo\nBold · Italic · Weight · Shadow · Spacing\nCJK 中文 · 日本語 · 한국어 · Mixed Script\nShadow Effect · 文字阴影效果\nLetter Spacing 2px · 字间距加宽\nMulti-Font: Inter + Noto Sans SC\nLine Height 1.8x · 行高倍率演示',
      textRuns: [
        { start: 0, end: 5, style: { color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 800, lineHeight: 32 } },
        { start: 5, end: 31, style: { color: '#0369a1', fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, lineHeight: 32, shadow: { color: 'rgba(2,132,199,0.15)', offsetX: 0, offsetY: 2, blur: 4 } } },
        { start: 32, end: 36, style: { color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, lineHeight: 22 } },
        { start: 36, end: 45, style: { color: '#0369a1', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 400, fontStyle: 'italic', lineHeight: 22 } },
        { start: 45, end: 54, style: { color: '#0f766e', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, lineHeight: 22 } },
        { start: 54, end: 63, style: { color: '#be123c', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 400, lineHeight: 22, shadow: { color: 'rgba(190,18,60,0.2)', offsetX: 1, offsetY: 1, blur: 3 } } },
        { start: 63, end: 73, style: { color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 400, lineHeight: 22, letterSpacing: 2 } },
        { start: 74, end: 107, style: { color: '#0f766e', fontFamily: 'Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif', fontSize: 17, fontWeight: 600, lineHeight: 24 } },
        { start: 108, end: 130, style: { color: '#be123c', fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, lineHeight: 26, shadow: { color: 'rgba(190,18,60,0.25)', offsetX: 2, offsetY: 3, blur: 6 } } },
        { start: 131, end: 157, style: { color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 20, letterSpacing: 2 } },
        { start: 158, end: 170, style: { color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500, lineHeight: 22 } },
        { start: 170, end: 190, style: { color: '#0369a1', fontFamily: 'Noto Sans SC, PingFang SC, sans-serif', fontSize: 15, fontWeight: 500, lineHeight: 22 } },
        { start: 191, end: 216, style: { color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 400, lineHeight: 23, letterSpacing: 0.3 } },
      ],
      x: 16,
      y: 228,
      width: 300,
      height: 340,
      parentId: null,
      fill: { enabled: true, color: '#0f172a' },
      stroke: { enabled: false, color: '#111827', weight: 0 },
    },
    // Width-wrap demo: narrow box forces word-wrapping across textRuns
    {
      id: 'text-width-wrap-demo',
      type: 'text',
      name: 'Width Wrap Demo',
      text: 'This sentence is long enough that it must wrap across multiple lines inside a narrow text box',
      textRuns: [
        { start: 0, end: 17, style: { color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, lineHeight: 20 } },
        { start: 17, end: 93, style: { color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 20 } },
      ],
      x: 16, y: 560, width: 200, height: 80,
      parentId: null,
      fill: { enabled: true, color: '#334155' },
      stroke: { enabled: false },
    },
    // Center-aligned text
    {
      id: 'text-align-center-demo',
      type: 'text',
      name: 'Center Align Demo',
      text: '← 居中对齐 Center Aligned →',
      textRuns: [{ start: 0, end: 26, style: { color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, lineHeight: 22, textAlign: 'center' } }],
      x: 240, y: 560, width: 280, height: 26,
      parentId: null,
      fill: { enabled: true, color: '#0f172a' },
      stroke: { enabled: false },
    },
    // Right-aligned text
    {
      id: 'text-align-right-demo',
      type: 'text',
      name: 'Right Align Demo',
      text: '右对齐 Right Aligned →',
      textRuns: [{ start: 0, end: 19, style: { color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 500, lineHeight: 22, textAlign: 'right' } }],
      x: 240, y: 592, width: 280, height: 26,
      parentId: null,
      fill: { enabled: true, color: '#334155' },
      stroke: { enabled: false },
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
