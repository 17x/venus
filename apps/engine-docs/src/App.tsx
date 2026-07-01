import {useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction} from 'react'
import {Badge, Button, CollapsibleNav, Input, type CollapsibleNavItem} from '@venus/ui'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Bell,
  BellOff,
  Bug,
  Camera,
  Check,
  Copy,
  Crosshair,
  Expand,
  Film,
  Gauge,
  List,
  Maximize,
  Palette,
  Play,
  Plus,
  ScanEye,
  Search,
  Timer,
  Trash2,
  ZoomIn,
} from 'lucide-react'
import {
  engineApiCategories,
  type EngineApiCategory,
  type EngineApiDoc,
  type EngineApiParameter,
} from './engineApiDocs.ts'
import {
  Venus,
  VENUS_COMMON_RENDER_PROPERTIES,
  VENUS_SHAPE_MODEL_SPECS,
  type VenusNode,
  type VenusParameters,
} from '../../../packages/engine/src/index.ts'

type ThemeMode = 'light' | 'dark' | 'cartoon'
type VenusHitTestResult = ReturnType<Venus['hitTest']>
type VenusInspection = ReturnType<Venus['inspect']>

interface HitTestPanelState {
  point: {x: number; y: number}
  result: VenusHitTestResult
}

interface BackendDiagnostics {
  backend: string
  fallback: VenusInspection['backendFallback']
}

const getApiAnchorId = (category: EngineApiCategory, api: EngineApiDoc) => {
  return `${category.id}-${api.id}`
}

function filterNavigationItems(items: CollapsibleNavItem[], query: string): CollapsibleNavItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return items
  }

  const visit = (item: CollapsibleNavItem): CollapsibleNavItem | null => {
    const children = item.items?.map(visit).filter((child): child is CollapsibleNavItem => Boolean(child))
    const matches = item.label.toLowerCase().includes(normalizedQuery)

    if (matches || (children && children.length > 0)) {
      return {
        ...item,
        defaultOpen: true,
        items: children,
      }
    }

    return null
  }

  return items.map(visit).filter((item): item is CollapsibleNavItem => Boolean(item))
}

/** A lightweight tooltip that appears instantly above the child on hover. */
function Tooltip({text, children}: {text: string; children: React.ReactNode}) {
  return <span className={'group/tip relative flex items-center'}>
    {children}
    <span className={'pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] leading-tight text-background opacity-0 transition-opacity group-hover/tip:opacity-100 z-50'}>
      {text}
    </span>
  </span>
}

/** A code display box with content-height sizing, scroll, and a copy button visible on hover. */
function CodeBox({code, className}: {code: string; className?: string}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return <div className={`engine-docs-code overflow-hidden rounded-lg border border-border text-card-foreground ${className ?? ''}`}>
    <div className={'flex h-9 items-center justify-between border-b border-border bg-muted/30 px-3'}>
      <span className={'font-mono text-[11px] font-medium text-muted-foreground'}>code</span>
      <Tooltip text={copied ? 'Copied' : 'Copy'}>
        <Button variant={'ghost'} size={'icon-sm'} aria-label={copied ? 'Copied' : 'Copy code'} onClick={handleCopy}>
          {copied ? <Check data-icon="inline-start"/> : <Copy data-icon="inline-start"/>}
        </Button>
      </Tooltip>
    </div>
    <pre className={'engine-code-scroll max-h-[min(60vh,32rem)] overflow-auto p-4 font-mono text-xs leading-6 text-muted-foreground'}><code>{code}</code></pre>
  </div>
}

const readBackendDiagnostics = (venus: Venus): BackendDiagnostics => {
  const inspection = venus.inspect()

  return {
    backend: inspection.engine?.backend ?? 'unmounted',
    fallback: inspection.backendFallback,
  }
}

function BackendDiagnosticsPanel({diagnostics}: {diagnostics: BackendDiagnostics | null}) {
  void diagnostics
  return null
}

const createExampleNodes = (apiId: string, theme: ThemeMode): VenusNode[] => {
  const isLight = theme === 'light'
  const ink = isLight ? '#0f172a' : '#f8fafc'
  const panel = isLight ? '#dbeafe' : '#1e3a8a'

  if (apiId === 'new-venus') {
    return [{type: 'rect', x: 110, y: 102, width: 180, height: 96, fill: '#2563eb'}]
  }

  if (apiId === 'base-entry') {
    return [{type: 'rect', x: 72, y: 56, width: 160, height: 96, fill: panel}]
  }

  if (apiId === 'venus-add' || apiId === 'ellipse') {
    return [{type: 'ellipse', x: 120, y: 72, width: 260, height: 150, fill: isLight ? '#fed7aa' : '#7c2d12', stroke: isLight ? '#ea580c' : '#fdba74', strokeWidth: 5}]
  }

  if (apiId === 'rect') {
    return [{type: 'rect', x: 96, y: 72, width: 300, height: 170, fill: panel, stroke: isLight ? '#2563eb' : '#93c5fd', strokeWidth: 5, cornerRadius: 18}]
  }

  if (apiId === 'line') {
    return [{type: 'line', x: 86, y: 96, width: 310, height: 128, stroke: isLight ? '#475569' : '#e2e8f0', strokeWidth: 10}]
  }

  if (apiId === 'text') {
    return [{type: 'text', x: 86, y: 176, text: 'Venus Text', fill: ink, fontSize: 42, fontWeight: 700}]
  }

  if (apiId === 'group') {
    return [{
      type: 'group',
      x: 40,
      y: 38,
      children: [
        {type: 'rect', x: 40, y: 40, width: 310, height: 170, fill: panel, stroke: isLight ? '#2563eb' : '#93c5fd', strokeWidth: 4, cornerRadius: 18},
        {type: 'ellipse', x: 84, y: 76, width: 84, height: 70, fill: isLight ? '#fef3c7' : '#78350f', stroke: isLight ? '#f59e0b' : '#fbbf24', strokeWidth: 3},
      ],
    }]
  }

  if (apiId === 'mask') {
    return [{
      type: 'mask',
      clipPath: {type: 'rect', x: 116, y: 64, width: 260, height: 160, cornerRadius: 32},
      children: [
        {type: 'ellipse', x: 90, y: 40, width: 300, height: 220, fill: isLight ? '#e9d5ff' : '#581c87', stroke: isLight ? '#9333ea' : '#d8b4fe', strokeWidth: 5},
      ],
    }]
  }

  if (apiId === 'clip') {
    return [{
      type: 'clip',
      clipPath: {type: 'rect', x: 116, y: 64, width: 260, height: 160, cornerRadius: 999},
      children: [
        {type: 'rect', x: 70, y: 42, width: 360, height: 210, fill: isLight ? '#22c55e' : '#166534'},
        {type: 'line', x: 62, y: 62, width: 360, height: 160, stroke: isLight ? '#14532d' : '#bbf7d0', strokeWidth: 10},
      ],
    }]
  }

  if (apiId === 'hit-test') {
    return [
      {type: 'rect', x: 92, y: 72, width: 300, height: 170, fill: isLight ? '#e0f2fe' : '#0c4a6e', stroke: '#0ea5e9', strokeWidth: 5, cornerRadius: 16},
      {type: 'ellipse', x: 250, y: 130, width: 40, height: 40, fill: '#22c55e'},
    ]
  }

  if (apiId === 'camera-controls') {
    return [
      {type: 'rect', x: 70, y: 52, width: 340, height: 220, fill: isLight ? '#eef2ff' : '#312e81', stroke: isLight ? '#6366f1' : '#a5b4fc', strokeWidth: 5},
      {type: 'rect', x: 140, y: 28, width: 180, height: 270, stroke: ink, strokeWidth: 4},
    ]
  }

  if (apiId === 'performance-options' || apiId === 'constructor-parameters' || apiId === 'render-backends') {
    return [
      {type: 'rect', x: 92, y: 54, width: 300, height: 56, fill: isLight ? '#dcfce7' : '#14532d', stroke: isLight ? '#16a34a' : '#86efac', strokeWidth: 3, cornerRadius: 10},
      {type: 'rect', x: 92, y: 132, width: 300, height: 56, fill: isLight ? '#e0e7ff' : '#3730a3', stroke: isLight ? '#4f46e5' : '#a5b4fc', strokeWidth: 3, cornerRadius: 10},
    ]
  }

  if (apiId === 'animate' || apiId === 'animation-invalidation') {
    return [
      {type: 'rect', x: 76, y: 118, width: 90, height: 70, fill: isLight ? '#fce7f3' : '#831843', stroke: isLight ? '#be185d' : '#f9a8d4', strokeWidth: 3, cornerRadius: 10},
      {type: 'line', x: 178, y: 153, width: 128, height: 0, stroke: isLight ? '#be185d' : '#f9a8d4', strokeWidth: 6},
      {type: 'rect', x: 318, y: 118, width: 90, height: 70, fill: isLight ? '#f9a8d4' : '#db2777', stroke: isLight ? '#be185d' : '#f9a8d4', strokeWidth: 3, cornerRadius: 10},
    ]
  }

  if (apiId === 'debug-tools') {
    return [
      {type: 'rect', x: 104, y: 70, width: 280, height: 160, fill: isLight ? '#fee2e2' : '#7f1d1d', stroke: isLight ? '#ef4444' : '#fca5a5', strokeWidth: 5},
    ]
  }

  if (apiId === 'revision') {
    return [
      {type: 'rect', x: 90, y: 108, width: 72, height: 72, fill: isLight ? '#f1f5f9' : '#1e293b', stroke: isLight ? '#64748b' : '#cbd5e1', strokeWidth: 3},
      {type: 'rect', x: 206, y: 108, width: 72, height: 72, fill: isLight ? '#f1f5f9' : '#1e293b', stroke: isLight ? '#64748b' : '#cbd5e1', strokeWidth: 3},
      {type: 'rect', x: 322, y: 108, width: 72, height: 72, fill: isLight ? '#f1f5f9' : '#1e293b', stroke: isLight ? '#64748b' : '#cbd5e1', strokeWidth: 3},
    ]
  }

  if (apiId === 'event-system') {
    return [
      {type: 'rect', x: 96, y: 70, width: 300, height: 80, fill: isLight ? '#f0fdf4' : '#14532d', stroke: isLight ? '#16a34a' : '#86efac', strokeWidth: 4, cornerRadius: 14},
      {type: 'ellipse', x: 216, y: 174, width: 64, height: 64, fill: isLight ? '#dcfce7' : '#166534', stroke: isLight ? '#22c55e' : '#bbf7d0', strokeWidth: 3},
    ]
  }

  if (apiId === 'events-demo') {
    return [
      {type: 'rect', x: 96, y: 70, width: 300, height: 120, fill: isLight ? '#f0fdf4' : '#14532d', stroke: isLight ? '#16a34a' : '#86efac', strokeWidth: 4, cornerRadius: 14},
      {type: 'ellipse', x: 216, y: 214, width: 64, height: 64, fill: isLight ? '#dcfce7' : '#166534', stroke: isLight ? '#22c55e' : '#bbf7d0', strokeWidth: 3},
    ]
  }

  if (apiId === 'polygon') {
    return [{type: 'polygon', x: 72, y: 56, width: 220, height: 168, points: [{x: 182, y: 56}, {x: 292, y: 120}, {x: 254, y: 224}, {x: 110, y: 224}, {x: 72, y: 120}], fill: isLight ? '#dcfce7' : '#14532d', stroke: isLight ? '#16a34a' : '#86efac', strokeWidth: 3}]
  }

  if (apiId === 'path') {
    return [{type: 'path', x: 64, y: 64, width: 280, height: 180, points: [{x: 64, y: 160}, {x: 200, y: 64}, {x: 344, y: 160}, {x: 200, y: 244}], stroke: isLight ? '#7c3aed' : '#a78bfa', strokeWidth: 5, closed: true}]
  }

  if (apiId === 'image') {
    return [{type: 'image', x: 80, y: 56, width: 240, height: 160, assetId: 'demo-image'}]
  }

  if (apiId === 'add') {
    return [{type: 'rect', x: 96, y: 76, width: 300, height: 170, fill: isLight ? '#dbeafe' : '#1e3a8a', stroke: isLight ? '#2563eb' : '#93c5fd', strokeWidth: 5, cornerRadius: 16}]
  }

  if (apiId === 'mount') {
    return [{type: 'rect', x: 64, y: 52, width: 340, height: 220, fill: isLight ? '#dcfce7' : '#14532d', stroke: isLight ? '#16a34a' : '#86efac', strokeWidth: 5, cornerRadius: .16}]
  }

  if (apiId === 'hitTest') {
    return [
      {type: 'rect', x: 92, y: 72, width: 300, height: 170, fill: isLight ? '#e0f2fe' : '#0c4a6e', stroke: '#0ea5e9', strokeWidth: 5, cornerRadius: 16},
      {type: 'ellipse', x: 250, y: 130, width: 40, height: 40, fill: '#22c55e'},
    ]
  }

  if (apiId === 'getNodeById' || apiId === 'getParentId') {
    return [{
      type: 'group',
      x: 40,
      y: 38,
      children: [
        {type: 'rect', x: 40, y: 40, width: 310, height: 170, fill: isLight ? '#dbeafe' : '#1e3a8a', stroke: isLight ? '#2563eb' : '#93c5fd', strokeWidth: 4, cornerRadius: 18},
        {type: 'ellipse', x: 84, y: 76, width: 84, height: 70, fill: isLight ? '#fef3c7' : '#78350f', stroke: isLight ? '#f59e0b' : '#fbbf24', strokeWidth: 3},
      ],
    }]
  }

  return [
    {type: 'rect', x: 96, y: 76, width: 300, height: 170, fill: panel, stroke: isLight ? '#2563eb' : '#93c5fd', strokeWidth: 5, cornerRadius: 16},
  ]
}

const createUsageCode = (api: EngineApiDoc, theme: ThemeMode) => {
  if (api.id === 'base-entry') {
    return api.demo
  }

  const nodes = createExampleNodes(api.id, theme)

  return `import {Venus} from '@venus/engine'

const venus = new Venus()
venus.mount(canvas)

const nodes = ${JSON.stringify(nodes, null, 2)}

nodes.forEach((node) => venus.add(node))
`
}

const createShapeMinimalCreateCode = (kind: string): string => {
  switch (kind) {
    case 'rect':
      return `const r = venus.add({
  type: 'rect',
  width: 220,
  height: 140,
})`
    case 'ellipse':
      return `const r = venus.add({
  type: 'ellipse',
  width: 220,
  height: 140,
})`
    case 'line':
      return `const r = venus.add({
  type: 'line',
  width: 220,
  height: 80,
  points: [
    {x: 40, y: 80},
    {x: 260, y: 160},
  ],
})`
    case 'text':
      return `const r = venus.add({
  type: 'text',
  text: 'Hello Venus',
})`
    case 'group':
      return `const r = venus.add({
  type: 'group',
  children: [],
})`
    case 'clip':
      return `const r = venus.add({
  type: 'clip',
  clipPath: {type: 'rect', width: 180, height: 120, cornerRadius: 16},
  children: [
    {type: 'ellipse', width: 180, height: 120},
  ],
})`
    case 'mask':
      return `const r = venus.add({
  type: 'mask',
  clipPath: {type: 'rect', width: 180, height: 120, cornerRadius: 16},
  children: [
    {type: 'rect', width: 180, height: 120},
  ],
})`
    case 'polygon':
      return `const r = venus.add({
  type: 'polygon',
  width: 220,
  height: 140,
  points: [
    {x: 110, y: 0},
    {x: 220, y: 56},
    {x: 176, y: 140},
    {x: 44, y: 140},
    {x: 0, y: 56},
  ],
})`
    case 'path':
      return `const r = venus.add({
  type: 'path',
  width: 220,
  height: 140,
  points: [
    {x: 0, y: 140},
    {x: 110, y: 0},
    {x: 220, y: 140},
  ],
})`
    case 'image':
      return `const r = venus.add({
  type: 'image',
  width: 220,
  height: 140,
  assetId: 'my-image',
})`
    default:
      return ''
  }
}

/** Generates a short "Copy COMP" code snippet showing minimal creation + proxy-style property changes. */
const createCopyCompCode = (apiId: string, theme: ThemeMode): string => {
  const isLight = theme === 'light'
  const kind = apiId.replace('-node', '')

  const base = `import {Venus} from '@venus/engine'

const venus = new Venus()
venus.mount(document.querySelector('canvas')!)

${createShapeMinimalCreateCode(kind)}`

  const props: Record<string, string> = {
    rect: `r.width = 280
r.fill = '#${isLight ? '3b82f6' : '93c5fd'}'
r.stroke = '#${isLight ? '1e40af' : 'bfdbfe'}'
r.strokeWidth = 3
r.cornerRadius = 16
r.opacity = 0.9`,
    ellipse: `r.fill = '#${isLight ? 'f59e0b' : 'fcd34d'}'
r.stroke = '#${isLight ? 'b45309' : 'fde68a'}'
r.strokeWidth = 2
r.startAngle = 30
r.endAngle = 330`,
    line: `r.stroke = '#${isLight ? '7c3aed' : 'c4b5fd'}'
r.strokeWidth = 4
r.strokeDashArray = [8, 4]`,
    text: `r.fontSize = 24
r.fontWeight = 600
r.fill = '#${isLight ? '0f172a' : 'f8fafc'}'
r.lineHeight = 1.5`,
    group: `const child = r.addChild({
  type: 'rect',
  width: 80,
  height: 60,
  fill: '#${isLight ? '3b82f6' : '93c5fd'}',
  transform: {x: 20, y: 20},
})
child.opacity = 0.7
r.x = 80
r.rotation = 5`,
    clip: `// clipPath defines the visible region
// children are the clipped content
r.transform = {x: 80, y: 50}
r.opacity = 0.9`,
    mask: `// Same structure as clip; engine normalizes both
r.transform = {x: 80, y: 50}
r.opacity = 0.85`,
    polygon: `r.fill = '#${isLight ? '22c55e' : '86efac'}'
r.stroke = '#${isLight ? '166534' : 'bbf7d0'}'
r.strokeWidth = 2
r.closed = true
const pts = [{x: 110, y: 50}, {x: 280, y: 80}, {x: 240, y: 190}, {x: 70, y: 170}]
r.points = pts`,
    path: `r.stroke = '#${isLight ? 'dc2626' : 'fca5a5'}'
r.strokeWidth = 4
r.closed = false
r.startArrowhead = 'triangle'
r.endArrowhead = 'circle'`,
    image: `r.width = 240
r.height = 160
r.smoothing = true`,
  }

  return `${base}\n${props[kind] ?? ''}`
}

function ParameterTable({parameters}: {parameters: EngineApiParameter[]}) {
  return <div className={'engine-docs-table overflow-hidden rounded-lg border border-border'}>
    <table className={'w-full border-collapse text-left text-sm'}>
      <thead className={'text-xs text-muted-foreground'}>
        <tr className={'border-b border-border'}>
          <th className={'px-3 py-2 font-medium'}>Name</th>
          <th className={'px-3 py-2 font-medium'}>Type</th>
          <th className={'px-3 py-2 font-medium'}>Default</th>
          <th className={'px-3 py-2 font-medium'}>Notes</th>
        </tr>
      </thead>
      <tbody>
        {parameters.map((parameter, index) => {
          return <tr key={`parameter-${parameter.name}-${index}`} className={'border-b border-border last:border-0'}>
            <td className={'px-3 py-2 align-top font-mono text-xs'}>{parameter.name}</td>
            <td className={'px-3 py-2 align-top text-xs text-muted-foreground'}>{parameter.type}</td>
            <td className={'px-3 py-2 align-top text-xs text-muted-foreground'}>{parameter.defaultValue ?? '—'}</td>
            <td className={'px-3 py-2 align-top text-xs leading-5 text-muted-foreground'}>{parameter.description}</td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
}

function ApiDescription({api}: {api: EngineApiDoc}) {
  return <section className={'grid max-w-3xl gap-2'}>
    <p className={'text-sm leading-6 text-muted-foreground'}>{api.readableDescription}</p>
  </section>
}

function ApiUsage({code}: {code: string}) {
  return <section className={'grid min-w-0 gap-2'}>
    <CodeBox code={code}/>
  </section>
}

interface ModelControlValues {
  id: string
  compositeTarget: 'parent' | 'clipPath' | 'childRect' | 'childEllipse' | 'childText'
  x: number
  y: number
  x2: number
  y2: number
  width: number
  height: number
  rotation: number
  fill: string
  fillOpacity: number
  stroke: string
  strokeOpacity: number
  strokeWidth: number
  opacity: number
  cornerRadius: number
  cornerTopLeft: number
  cornerTopRight: number
  cornerBottomRight: number
  cornerBottomLeft: number
  cornersLocked: boolean
  ellipseStartAngle: number
  ellipseEndAngle: number
  ellipseDrawWedgeLine: boolean
  text: string
  selectedTextFill: string
  selectedTextStart: number
  selectedTextEnd: number
  fontSize: number
  fontWeight: number
  lineHeight: number
  childFill: string
  childStroke: string
  childRectX: number
  childRectY: number
  childRectWidth: number
  childRectHeight: number
  childRectFill: string
  childRectFillOpacity: number
  childRectStroke: string
  childRectStrokeOpacity: number
  childRectStrokeWidth: number
  childRectOpacity: number
  childRectCornerRadius: number
  childRectRotation: number
  childEllipseX: number
  childEllipseY: number
  childEllipseWidth: number
  childEllipseHeight: number
  childEllipseFill: string
  childEllipseFillOpacity: number
  childEllipseStroke: string
  childEllipseStrokeOpacity: number
  childEllipseStrokeWidth: number
  childEllipseOpacity: number
  childEllipseStartAngle: number
  childEllipseEndAngle: number
  childEllipseRotation: number
  childTextX: number
  childTextY: number
  childTextWidth: number
  childTextHeight: number
  childText: string
  childTextFill: string
  childTextOpacity: number
  childTextFontSize: number
  childTextFontWeight: number
  childTextLineHeight: number
  childTextRotation: number
  clipPathX: number
  clipPathY: number
  clipPathWidth: number
  clipPathHeight: number
  clipPathCornerRadius: number
  clipIsEllipse: boolean
  pathClosed: boolean
  pathUseBezier: boolean
  imageSmoothing: boolean
  assetId: string
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  blendMode: string
  strokeAlign: string
  strokeDashArray: number[]
  strokeCap: string
  strokeJoin: string
  lineSelectedAnchor: number
  pathSelectedAnchor: number
  pathAnchor0X: number
  pathAnchor0Y: number
  pathAnchor1X: number
  pathAnchor1Y: number
  pathAnchor2X: number
  pathAnchor2Y: number
  pathAnchor3X: number
  pathAnchor3Y: number
  gradientEnabled: boolean
  gradientStartColor: string
  gradientEndColor: string
  gradientAngle: number
  strokeGradientEnabled: boolean
  strokeGradientStartColor: string
  strokeGradientEndColor: string
  innerShadowEnabled: boolean
  innerShadowColor: string
  innerShadowBlur: number
  layerBlurEnabled: boolean
  layerBlurAmount: number
}

const editableModelApiIds = new Set(['rect', 'ellipse', 'line', 'text', 'group', 'clip', 'mask', 'polygon', 'path', 'image'])
const shapeApiIds = ['rect', 'ellipse', 'line', 'text', 'path', 'group', 'clip', 'mask', 'polygon', 'image'] as const
const themeOptions: Array<{name: ThemeMode; label: string}> = [
  {name: 'light', label: 'Classic light'},
  {name: 'dark', label: 'Classic dark'},
  {name: 'cartoon', label: 'Cartoon'},
]

const createDemoImageSource = (theme: ThemeMode): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 160
  const context = canvas.getContext('2d')
  if (!context) {
    return canvas
  }

  const gradient = context.createLinearGradient(0, 0, 240, 160)
  gradient.addColorStop(0, theme === 'light' ? '#38bdf8' : '#0f766e')
  gradient.addColorStop(0.48, theme === 'light' ? '#facc15' : '#a3e635')
  gradient.addColorStop(1, theme === 'light' ? '#f97316' : '#fb7185')
  context.fillStyle = gradient
  context.fillRect(0, 0, 240, 160)
  context.fillStyle = 'rgba(255,255,255,0.82)'
  context.fillRect(22, 22, 76, 48)
  context.fillStyle = 'rgba(15,23,42,0.72)'
  context.fillRect(118, 40, 92, 14)
  context.fillRect(118, 66, 62, 14)
  context.beginPath()
  context.arc(76, 118, 26, 0, Math.PI * 2)
  context.fillStyle = theme === 'light' ? '#1d4ed8' : '#f8fafc'
  context.fill()
  return canvas
}

const createDocsVenusParameters = (theme: ThemeMode): VenusParameters => {
  const demoImageSource = createDemoImageSource(theme)
  return {
    culling: false,
    lod: false,
    render: {backend: 'canvas2d'},
    resource: {
      loader: {
        resolveImage: (assetId) => assetId === 'demo-image' ? demoImageSource : null,
      },
    },
  }
}

const createInitialModelControls = (apiId: string, theme: ThemeMode): ModelControlValues => {
  const isLight = theme === 'light'
  const childFill = isLight ? '#fef3c7' : '#78350f'
  const childStroke = isLight ? '#f59e0b' : '#fbbf24'
  return {
    id: apiId.replace('-node', '-demo'),
    compositeTarget: 'parent',
    x: apiId === 'group' ? 0 : (apiId === 'line' ? 110 : (apiId === 'text' ? 90 : 110)),
    y: apiId === 'group' ? 0 : (apiId === 'line' ? 110 : (apiId === 'text' ? 108 : 95)),
    x2: 290,
    y2: 190,
    width: apiId === 'line' ? 180 : (apiId === 'text' ? 220 : 180),
    height: apiId === 'line' ? 80 : 110,
    rotation: 0,
    fill: apiId === 'mask' ? '#a855f7' : (isLight ? '#dbeafe' : '#1e3a8a'),
    fillOpacity: 100,
    stroke: apiId === 'line' ? (isLight ? '#475569' : '#e2e8f0') : (isLight ? '#2563eb' : '#93c5fd'),
    strokeOpacity: 100,
    strokeWidth: apiId === 'line' ? 10 : 5,
    opacity: 100,
    cornerRadius: apiId === 'rect' || apiId === 'mask' ? 18 : 0,
    cornerTopLeft: 18,
    cornerTopRight: 18,
    cornerBottomRight: 18,
    cornerBottomLeft: 18,
    cornersLocked: apiId !== 'rect',
    ellipseStartAngle: 0,
    ellipseEndAngle: 360,
    ellipseDrawWedgeLine: false,
    text: apiId === 'group' ? 'Grouped' : 'Venus Text\nmulti-line',
    selectedTextFill: '#ef4444',
    selectedTextStart: 0,
    selectedTextEnd: 5,
    fontSize: 42,
    fontWeight: 700,
    lineHeight: 52,
    childFill,
    childStroke,
    childRectX: 110,
    childRectY: 95,
    childRectWidth: 180,
    childRectHeight: 110,
    childRectFill: isLight ? '#dbeafe' : '#1e3a8a',
    childRectFillOpacity: 100,
    childRectStroke: isLight ? '#2563eb' : '#93c5fd',
    childRectStrokeOpacity: 100,
    childRectStrokeWidth: 5,
    childRectOpacity: 100,
    childRectCornerRadius: 18,
    childRectRotation: 0,
    childEllipseX: 200,
    childEllipseY: 113,
    childEllipseWidth: 96,
    childEllipseHeight: 74,
    childEllipseFill: childFill,
    childEllipseFillOpacity: 100,
    childEllipseStroke: childStroke,
    childEllipseStrokeOpacity: 100,
    childEllipseStrokeWidth: 3,
    childEllipseOpacity: 100,
    childEllipseStartAngle: 0,
    childEllipseEndAngle: 360,
    childEllipseRotation: 0,
    childTextX: 132,
    childTextY: 156,
    childTextWidth: 180,
    childTextHeight: 72,
    childText: apiId === 'group' ? 'Grouped' : 'Child',
    childTextFill: childStroke,
    childTextOpacity: 100,
    childTextFontSize: 42,
    childTextFontWeight: 700,
    childTextLineHeight: 52,
    childTextRotation: 0,
    clipPathX: 110,
    clipPathY: 82,
    clipPathWidth: 180,
    clipPathHeight: 136,
    clipPathCornerRadius: 18,
    clipIsEllipse: apiId === 'clip',
    pathClosed: true,
    pathUseBezier: apiId === 'path',
    imageSmoothing: true,
    assetId: 'demo-image',
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 12,
    shadowOffsetX: 8,
    shadowOffsetY: 8,
    blendMode: '',
    strokeAlign: '',
    strokeDashArray: [],
    strokeCap: '',
    strokeJoin: '',
    lineSelectedAnchor: 0,
    pathSelectedAnchor: 0,
    pathAnchor0X: 96,
    pathAnchor0Y: 214,
    pathAnchor1X: 190,
    pathAnchor1Y: 82,
    pathAnchor2X: 306,
    pathAnchor2Y: 214,
    pathAnchor3X: 202,
    pathAnchor3Y: 238,
    gradientEnabled: false,
    gradientStartColor: '#3b82f6',
    gradientEndColor: '#8b5cf6',
    gradientAngle: 0,
    strokeGradientEnabled: false,
    strokeGradientStartColor: '#ef4444',
    strokeGradientEndColor: '#f97316',
    innerShadowEnabled: false,
    innerShadowColor: '#000000',
    innerShadowBlur: 8,
    layerBlurEnabled: false,
    layerBlurAmount: 4,
  }
}

const withOpacity = (hexColor: string, opacityPercent: number) => {
  const normalized = hexColor.replace('#', '')
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(100, opacityPercent)) / 100})`
}

const resolveShadow = (controls: ModelControlValues) => {
  return controls.shadowEnabled
    ? {color: withOpacity(controls.shadowColor, 35), blur: controls.shadowBlur, offsetX: controls.shadowOffsetX, offsetY: controls.shadowOffsetY}
    : undefined
}

const createPathAnchorPoints = (controls: ModelControlValues) => [
  {x: controls.pathAnchor0X, y: controls.pathAnchor0Y},
  {x: controls.pathAnchor1X, y: controls.pathAnchor1Y},
  {x: controls.pathAnchor2X, y: controls.pathAnchor2Y},
  {x: controls.pathAnchor3X, y: controls.pathAnchor3Y},
]

const createBezierPointsFromAnchors = (controls: ModelControlValues) => {
  const anchors = createPathAnchorPoints(controls)
  return anchors.map((anchor, index) => {
    const previous = anchors[Math.max(0, index - 1)]
    const next = anchors[Math.min(anchors.length - 1, index + 1)]
    return {
      anchor,
      cp1: index === 0 ? null : {x: anchor.x - (anchor.x - previous.x) * 0.35, y: anchor.y - (anchor.y - previous.y) * 0.35},
      cp2: index === anchors.length - 1 ? null : {x: anchor.x + (next.x - anchor.x) * 0.35, y: anchor.y + (next.y - anchor.y) * 0.35},
    }
  })
}

const createTextRuns = (controls: ModelControlValues) => {
  const start = Math.max(0, Math.min(controls.text.length, controls.selectedTextStart))
  const end = Math.max(start, Math.min(controls.text.length, controls.selectedTextEnd))
  if (start === end) {
    return undefined
  }

  return [
    {text: controls.text.slice(0, start)},
    {text: controls.text.slice(start, end), style: {fill: controls.selectedTextFill, fontWeight: 900}},
    {text: controls.text.slice(end)},
  ]
}

const createEditableExampleNodes = (apiId: string, controls: ModelControlValues): VenusNode[] | null => {
  const commonId = controls.id.trim() ? controls.id : undefined
  const fill = withOpacity(controls.fill, controls.fillOpacity)
  const stroke = withOpacity(controls.stroke, controls.strokeOpacity)
  const childRectFill = withOpacity(controls.childRectFill, controls.childRectFillOpacity)
  const childRectStroke = withOpacity(controls.childRectStroke, controls.childRectStrokeOpacity)
  const childEllipseFill = withOpacity(controls.childEllipseFill, controls.childEllipseFillOpacity)
  const childEllipseStroke = withOpacity(controls.childEllipseStroke, controls.childEllipseStrokeOpacity)
  const opacity = controls.opacity / 100
  const shadow = resolveShadow(controls)
  const flatTransform = {
    ...(controls.blendMode ? {blendMode: controls.blendMode} : {}),
    transform: {
      rotation: controls.rotation,
    },
  }
  // Stroke style extras propagated to shape nodes.
  const strokeStyle = {
    ...(controls.strokeAlign ? {strokeAlign: controls.strokeAlign as 'center' | 'inside' | 'outside'} : {}),
    ...(controls.strokeDashArray.length > 0 ? {strokeDashArray: controls.strokeDashArray} : {}),
    ...(controls.strokeCap ? {strokeCap: controls.strokeCap as 'butt' | 'round' | 'square'} : {}),
    ...(controls.strokeJoin ? {strokeJoin: controls.strokeJoin as 'miter' | 'round' | 'bevel'} : {}),
  }

  // Gradient fill overrides solid fill when enabled. Angle maps to direction.
  const rad = controls.gradientAngle * Math.PI / 180
  const halfW = controls.width / 2
  const halfH = controls.height / 2
  const gradientFills = controls.gradientEnabled ? [{
    type: 'gradient' as const,
    gradient: {
      type: 'linear' as const,
      startX: halfW - Math.cos(rad) * halfW,
      startY: halfH - Math.sin(rad) * halfH,
      endX: halfW + Math.cos(rad) * halfW,
      endY: halfH + Math.sin(rad) * halfH,
      stops: [
        {offset: 0, color: controls.gradientStartColor},
        {offset: 1, color: controls.gradientEndColor},
      ],
    },
  }] : undefined

  const strokeGradientStrokes = controls.strokeGradientEnabled ? [{
    type: 'gradient' as const,
    gradient: {
      type: 'linear' as const,
      startX: halfW - Math.cos(rad) * halfW,
      startY: halfH - Math.sin(rad) * halfH,
      endX: halfW + Math.cos(rad) * halfW,
      endY: halfH + Math.sin(rad) * halfH,
      stops: [
        {offset: 0, color: controls.strokeGradientStartColor},
        {offset: 1, color: controls.strokeGradientEndColor},
      ],
    },
  }] : undefined
  const childRectTransform = {
    transform: {
      rotation: controls.childRectRotation,
    },
  }
  const childEllipseTransform = {
    transform: {
      rotation: controls.childEllipseRotation,
    },
  }
  const childTextTransform = {
    transform: {
      rotation: controls.childTextRotation,
    },
  }
  const cornerRadii = controls.cornersLocked
    ? undefined
    : {
      topLeft: controls.cornerTopLeft,
      topRight: controls.cornerTopRight,
      bottomRight: controls.cornerBottomRight,
      bottomLeft: controls.cornerBottomLeft,
    }

  if (apiId === 'rect') {
    return [{id: commonId, type: 'rect', x: controls.x, y: controls.y, width: controls.width, height: controls.height, fill, fills: gradientFills, stroke, strokes: strokeGradientStrokes, strokeWidth: controls.strokeWidth, opacity, shadow, cornerRadius: controls.cornersLocked ? controls.cornerRadius : undefined, cornerRadii, ...strokeStyle, ...flatTransform}]
  }

  if (apiId === 'ellipse') {
    return [{id: commonId, type: 'ellipse', x: controls.x, y: controls.y, width: controls.width, height: controls.height, fill, fills: gradientFills, stroke, strokes: strokeGradientStrokes, strokeWidth: controls.strokeWidth, opacity, shadow, ellipseStartAngle: controls.ellipseStartAngle, ellipseEndAngle: controls.ellipseEndAngle, ellipseDrawWedgeLine: controls.ellipseDrawWedgeLine, ...strokeStyle, ...flatTransform}]
  }

  if (apiId === 'line') {
    return [{id: commonId, type: 'line', width: controls.x2 - controls.x, height: controls.y2 - controls.y, points: [{x: controls.x, y: controls.y}, {x: controls.x2, y: controls.y2}], stroke, strokes: strokeGradientStrokes, strokeWidth: controls.strokeWidth, opacity, shadow, ...strokeStyle, ...flatTransform}]
  }

  if (apiId === 'text') {
    return [{id: commonId, type: 'text', x: controls.x, y: controls.y, width: controls.width, height: controls.height, text: controls.text, runs: createTextRuns(controls), fill, fontSize: controls.fontSize, fontWeight: controls.fontWeight, lineHeight: controls.lineHeight, opacity, shadow, ...flatTransform}]
  }

  if (apiId === 'group') {
    return [{
      id: commonId,
      type: 'group',
      x: controls.x,
      y: controls.y,
      opacity,
      shadow,
      ...flatTransform,
      children: [
        {type: 'rect', x: controls.childRectX, y: controls.childRectY, width: controls.childRectWidth, height: controls.childRectHeight, fill: childRectFill, stroke: childRectStroke, strokeWidth: controls.childRectStrokeWidth, opacity: controls.childRectOpacity / 100, cornerRadius: controls.childRectCornerRadius, ...childRectTransform},
        {type: 'text', x: controls.childTextX, y: controls.childTextY, width: controls.childTextWidth, height: controls.childTextHeight, text: controls.childText, fill: controls.childTextFill, fontSize: controls.childTextFontSize, fontWeight: controls.childTextFontWeight, lineHeight: controls.childTextLineHeight, opacity: controls.childTextOpacity / 100, ...childTextTransform},
      ],
    }]
  }

  if (apiId === 'clip' || apiId === 'mask') {
    const clipPath: VenusNode = controls.clipIsEllipse
      ? {type: 'ellipse', x: controls.clipPathX, y: controls.clipPathY, width: controls.clipPathWidth, height: controls.clipPathHeight}
      : {type: 'rect', x: controls.clipPathX, y: controls.clipPathY, width: controls.clipPathWidth, height: controls.clipPathHeight, cornerRadius: controls.clipPathCornerRadius}

    return [{
      id: commonId,
      type: apiId === 'clip' ? 'clip' : 'mask',
      opacity,
      ...flatTransform,
      clipPath,
      children: [
        {type: 'rect', x: controls.childRectX, y: controls.childRectY, width: controls.childRectWidth, height: controls.childRectHeight, fill: childRectFill, stroke: childRectStroke, strokeWidth: controls.childRectStrokeWidth, opacity: controls.childRectOpacity / 100, cornerRadius: controls.childRectCornerRadius, shadow, ...childRectTransform},
        {type: 'ellipse', x: controls.childEllipseX, y: controls.childEllipseY, width: controls.childEllipseWidth, height: controls.childEllipseHeight, fill: childEllipseFill, stroke: childEllipseStroke, strokeWidth: controls.childEllipseStrokeWidth, opacity: controls.childEllipseOpacity / 100, ellipseStartAngle: controls.childEllipseStartAngle, ellipseEndAngle: controls.childEllipseEndAngle, ...childEllipseTransform},
      ],
    }]
  }

  if (apiId === 'polygon') {
    return [{id: commonId, type: 'polygon', x: controls.x, y: controls.y, width: controls.width, height: controls.height, points: [{x: controls.x + controls.width / 2, y: controls.y}, {x: controls.x + controls.width, y: controls.y + controls.height * 0.4}, {x: controls.x + controls.width * 0.8, y: controls.y + controls.height}, {x: controls.x + controls.width * 0.2, y: controls.y + controls.height}, {x: controls.x, y: controls.y + controls.height * 0.4}], fill, fills: gradientFills, stroke, strokes: strokeGradientStrokes, strokeWidth: controls.strokeWidth, opacity, shadow, ...strokeStyle, ...flatTransform}]
  }

  if (apiId === 'path') {
    const pathAnchors = createPathAnchorPoints(controls)
    const minX = Math.min(...pathAnchors.map((point) => point.x))
    const minY = Math.min(...pathAnchors.map((point) => point.y))
    const maxX = Math.max(...pathAnchors.map((point) => point.x))
    const maxY = Math.max(...pathAnchors.map((point) => point.y))
    const pathBase = {id: commonId, type: 'path' as const, x: minX, y: minY, width: maxX - minX, height: maxY - minY, fill: controls.pathClosed ? fill : 'transparent', fills: controls.pathClosed ? gradientFills : undefined, stroke, strokes: strokeGradientStrokes, strokeWidth: controls.strokeWidth, opacity, shadow, closed: controls.pathClosed, ...strokeStyle, ...flatTransform}
    return controls.pathUseBezier
      ? [{
        ...pathBase,
        bezierPoints: createBezierPointsFromAnchors(controls),
      }]
      : [{
        ...pathBase,
        points: pathAnchors,
      }]
  }

  if (apiId === 'image') {
    return [{id: commonId, type: 'image', x: controls.x, y: controls.y, width: controls.width, height: controls.height, assetId: controls.assetId, imageSmoothing: controls.imageSmoothing, opacity, ...flatTransform}]
  }

  return null
}

const createMinimalModelNode = (apiId: string, controls: ModelControlValues): VenusNode => {
  if (apiId === 'rect') {
    return {type: 'rect', width: controls.width, height: controls.height}
  }

  if (apiId === 'ellipse') {
    return {type: 'ellipse', width: controls.width, height: controls.height}
  }

  if (apiId === 'line') {
    return {type: 'line', width: controls.x2 - controls.x, height: controls.y2 - controls.y, points: [{x: controls.x, y: controls.y}, {x: controls.x2, y: controls.y2}]}
  }

  if (apiId === 'text') {
    return {type: 'text', text: controls.text}
  }

  if (apiId === 'group') {
    return {type: 'group', children: [
      {type: 'rect', width: controls.childRectWidth, height: controls.childRectHeight},
      {type: 'text', text: controls.childText},
    ]}
  }

  if (apiId === 'clip' || apiId === 'mask') {
    return {
      type: apiId === 'clip' ? 'clip' : 'mask',
      clipPath: controls.clipIsEllipse
        ? {type: 'ellipse', width: controls.clipPathWidth, height: controls.clipPathHeight}
        : {type: 'rect', width: controls.clipPathWidth, height: controls.clipPathHeight},
      children: [{type: 'rect', width: controls.childRectWidth, height: controls.childRectHeight}],
    }
  }

  if (apiId === 'polygon') {
    return {type: 'polygon', width: controls.width, height: controls.height, points: [{x: controls.width / 2, y: 0}, {x: controls.width, y: controls.height * 0.4}, {x: controls.width * 0.8, y: controls.height}, {x: controls.width * 0.2, y: controls.height}, {x: 0, y: controls.height * 0.4}]}
  }

  if (apiId === 'path') {
    return controls.pathUseBezier
      ? {type: 'path', width: controls.width, height: controls.height, bezierPoints: createBezierPointsFromAnchors(controls)}
      : {type: 'path', width: controls.width, height: controls.height, points: createPathAnchorPoints(controls)}
  }

  if (apiId === 'image') {
    return {type: 'image', width: controls.width, height: controls.height, assetId: controls.assetId}
  }

  return createExampleNodes(apiId, 'light')[0]
}

const createModelCode = (apiId: string, controls: ModelControlValues) => {
  return `const node = ${JSON.stringify(createMinimalModelNode(apiId, controls), null, 2)}

venus.add(node)`
}

function ModelControlPanel({
  apiId,
  controls,
  setControls,
}: {
  apiId: string
  controls: ModelControlValues
  setControls: Dispatch<SetStateAction<ModelControlValues>>
}) {
  const setValue = <TKey extends keyof ModelControlValues>(key: TKey, value: ModelControlValues[TKey]) => {
    setControls((currentControls) => ({...currentControls, [key]: value}))
  }
  const setNumber = (key: keyof ModelControlValues, value: string) => {
    const nextValue = Number(value)
    setControls((currentControls) => {
      if (key === 'cornerRadius' && currentControls.cornersLocked) {
        return {
          ...currentControls,
          cornerRadius: nextValue,
          cornerTopLeft: nextValue,
          cornerTopRight: nextValue,
          cornerBottomRight: nextValue,
          cornerBottomLeft: nextValue,
        }
      }
      return {...currentControls, [key]: nextValue}
    })
  }
  const setLineAnchorNumber = (axis: 'x' | 'y', value: string) => {
    const nextValue = Number(value)
    setControls((currentControls) => {
      const isStart = currentControls.lineSelectedAnchor === 0
      return {
        ...currentControls,
        [isStart ? axis : axis === 'x' ? 'x2' : 'y2']: nextValue,
      }
    })
  }
  const setPathAnchorNumber = (axis: 'x' | 'y', value: string) => {
    const nextValue = Number(value)
    setControls((currentControls) => ({
      ...currentControls,
      [`pathAnchor${currentControls.pathSelectedAnchor}${axis.toUpperCase()}`]: nextValue,
    }))
  }
  // Compact single-letter labels with full name as tooltip.
  const fieldLabel: Record<string, string> = {
    x: 'X', y: 'Y', x2: 'X₂', y2: 'Y₂', width: 'W', height: 'H',
    rotation: 'R', opacity: 'O', fillOpacity: 'Fα', strokeOpacity: 'Sα', strokeWidth: 'Sw',
    cornerRadius: 'R', cornerTopLeft: 'Tl', cornerTopRight: 'Tr', cornerBottomRight: 'Br', cornerBottomLeft: 'Bl',
    fontSize: 'Fs', fontWeight: 'Fw', lineHeight: 'Lh',
    ellipseStartAngle: 'As', ellipseEndAngle: 'Ae',
    shadowBlur: 'Bl', shadowOffsetX: 'Sx', shadowOffsetY: 'Sy',
    selectedTextStart: 'Ss', selectedTextEnd: 'Se',
    pathClosed: 'Cl', imageSmoothing: 'Sm',
    // Child field labels (same suffixes)
    childRectX: 'X', childRectY: 'Y', childRectWidth: 'W', childRectHeight: 'H',
    childRectRotation: 'R', childRectOpacity: 'O', childRectFillOpacity: 'Fα', childRectStrokeOpacity: 'Sα', childRectStrokeWidth: 'Sw', childRectCornerRadius: 'R',
    childEllipseX: 'X', childEllipseY: 'Y', childEllipseWidth: 'W', childEllipseHeight: 'H',
    childEllipseRotation: 'R', childEllipseOpacity: 'O', childEllipseFillOpacity: 'Fα', childEllipseStrokeOpacity: 'Sα', childEllipseStrokeWidth: 'Sw',
    childEllipseStartAngle: 'As', childEllipseEndAngle: 'Ae',
    childTextX: 'X', childTextY: 'Y', childTextWidth: 'W', childTextHeight: 'H',
    childTextRotation: 'R', childTextOpacity: 'O', childTextFontSize: 'Fs', childTextFontWeight: 'Fw', childTextLineHeight: 'Lh',
    clipPathX: 'X', clipPathY: 'Y', clipPathWidth: 'W', clipPathHeight: 'H', clipPathCornerRadius: 'R',
  }
  const getFieldLabel = (key: string, full: string) => fieldLabel[key] ?? full.slice(0, 2)

  // Centralised tooltip descriptions for every editable field.
  const fieldTooltips: Partial<Record<keyof ModelControlValues, string>> = {
    x: 'X: horizontal position in pixels',
    y: 'Y: vertical position in pixels',
    width: 'Width: bounding box width in pixels',
    height: 'Height: bounding box height in pixels',
    rotation: 'Rotation: angle in degrees around bounds center',
    fill: 'Fill: CSS colour for shape interior',
    fillOpacity: 'Fill α: fill transparency (0=clear, 100=solid)',
    stroke: 'Stroke: CSS colour for shape outline',
    strokeOpacity: 'Stroke α: stroke transparency',
    strokeWidth: 'Stroke W: outline thickness in px (0=none)',
    opacity: 'Opacity: layer transparency (0=invisible, 100=solid)',
    cornerRadius: 'Radius: uniform corner rounding in px',
    fontSize: 'Font size: text height in pixels',
    fontWeight: 'Weight: 100 thin … 900 black',
    lineHeight: 'Line H: spacing between text lines in px',
    ellipseStartAngle: 'Start: ellipse arc start angle in degrees',
    ellipseEndAngle: 'End: ellipse arc end angle in degrees',
    ellipseDrawWedgeLine: 'Wedge: draw the center-to-arc side lines',
    shadowBlur: 'Blur: shadow softness radius in px',
    shadowOffsetX: 'Off X: shadow horizontal shift in px',
    shadowOffsetY: 'Off Y: shadow vertical shift in px',
    imageSmoothing: 'Smoothing: bilinear image filtering',
    pathClosed: 'Closed: whether path connects back to start',
    pathUseBezier: 'Bezier: render cubic curve segments from bezierPoints',
  }

  const numberField = (key: keyof ModelControlValues, fullLabel: string, unit = '', input?: {min?: number; max?: number; step?: number}) => {
    const value = controls[key]
    if (typeof value !== 'number') return null
    const label = getFieldLabel(String(key), fullLabel)
    const tip = fieldTooltips[key] ?? fullLabel
    return <Tooltip key={`model-number-${String(key)}`} text={tip}>
      <label className={'flex items-center gap-1'}>
        <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>{label}</span>
        <input
          className={'h-6 w-full min-w-0 max-w-[88px] rounded bg-muted/25 px-1.5 text-xs tabular-nums outline-none'}
          type={'number'}
          min={input?.min}
          max={input?.max}
          step={input?.step ?? 1}
          value={value}
          onChange={(e) => setNumber(key, e.target.value)}
        />
        {unit ? <span className={'shrink-0 text-[10px] text-muted-foreground'}>{unit}</span> : null}
      </label>
    </Tooltip>
  }
  const colorField = (key: keyof ModelControlValues, fullLabel: string) => {
    const value = controls[key]
    if (typeof value !== 'string') return null
    const label = getFieldLabel(String(key), fullLabel)
    const tip = fieldTooltips[key] ?? fullLabel
    return <label className={'flex items-center gap-1'}>
      <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>{label}</span>
      <Tooltip text={tip}>
        <input className={'size-6 shrink-0 cursor-pointer rounded border p-0'} type={'color'} value={value} onChange={(e) => setValue(key, e.target.value as never)} />
      </Tooltip>
      <Tooltip text={tip}>
        <input className={'h-6 w-full min-w-0 max-w-[76px] rounded bg-muted/25 px-1.5 text-xs outline-none'} value={value} onChange={(e) => setValue(key, e.target.value as never)} />
      </Tooltip>
    </label>
  }
  const toggleField = (key: keyof ModelControlValues, fullLabel: string) => {
    const value = controls[key]
    if (typeof value !== 'boolean') return null
    const label = getFieldLabel(String(key), fullLabel)
    const tip = fieldTooltips[key] ?? fullLabel
    return <Tooltip text={tip}>
      <label className={'flex items-center gap-1'}>
        <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>{label}</span>
        <input className={'size-4'} type={'checkbox'} checked={value} onChange={(e) => setValue(key, e.target.checked as never)} />
        <span className={'text-[11px] text-muted-foreground'}>{value ? 'on' : 'off'}</span>
      </label>
    </Tooltip>
  }
  const isCompositeModel = apiId === 'group' || apiId === 'clip' || apiId === 'mask'
  const showFill = apiId !== 'line' && !isCompositeModel && apiId !== 'image'
  const showStroke = apiId !== 'text' && !isCompositeModel && apiId !== 'image'
  const showCornerRadius = apiId === 'rect'
  const showText = apiId === 'text'
  const showTypography = apiId === 'text'
  const showEllipseAngles = apiId === 'ellipse'
  const showLineEndpoints = apiId === 'line'
  const showPathOptions = apiId === 'path'
  const showImageOptions = apiId === 'image'
  const anchorNumberField = (
    value: number,
    fullLabel: string,
    onChange: (value: string) => void,
    input?: {min?: number; max?: number; step?: number},
  ) => {
    const label = getFieldLabel(fullLabel, fullLabel)
    return <Tooltip key={`anchor-number-${fullLabel}`} text={fullLabel}>
      <label className={'flex items-center gap-1'}>
        <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>{label}</span>
        <input
          className={'h-6 w-full min-w-0 max-w-[88px] rounded bg-muted/25 px-1.5 text-xs tabular-nums outline-none'}
          type={'number'}
          min={input?.min}
          max={input?.max}
          step={input?.step ?? 1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </Tooltip>
  }
  const lineAnchorControls = showLineEndpoints ? <div className={'mb-2 grid gap-2 rounded border bg-muted/25 p-2'}>
    <div className={'grid grid-cols-2 gap-1 rounded-lg bg-background/60 p-1'}>
      {['Start', 'End'].map((label, index) => <button
        key={`line-anchor-${label}`}
        type={'button'}
        className={controls.lineSelectedAnchor === index ? 'rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background' : 'rounded-md px-2 py-1 text-xs text-muted-foreground'}
        onClick={() => setValue('lineSelectedAnchor', index)}
      >
        {label}
      </button>)}
    </div>
    <div className={'grid grid-cols-2 gap-1'}>
      {anchorNumberField(controls.lineSelectedAnchor === 0 ? controls.x : controls.x2, 'X', (value) => setLineAnchorNumber('x', value), {min: 0, max: 460})}
      {anchorNumberField(controls.lineSelectedAnchor === 0 ? controls.y : controls.y2, 'Y', (value) => setLineAnchorNumber('y', value), {min: 0, max: 460})}
    </div>
  </div> : null
  const pathAnchorKeys = [
    ['pathAnchor0X', 'pathAnchor0Y'],
    ['pathAnchor1X', 'pathAnchor1Y'],
    ['pathAnchor2X', 'pathAnchor2Y'],
    ['pathAnchor3X', 'pathAnchor3Y'],
  ] as const
  const selectedPathAnchorKeys = pathAnchorKeys[controls.pathSelectedAnchor] ?? pathAnchorKeys[0]
  const selectedPathX = controls[selectedPathAnchorKeys[0]]
  const selectedPathY = controls[selectedPathAnchorKeys[1]]
  const pathAnchorControls = showPathOptions ? <div className={'mt-2 grid gap-2 rounded border bg-muted/25 p-2'}>
    <div className={'grid grid-cols-4 gap-1 rounded-lg bg-background/60 p-1'}>
      {pathAnchorKeys.map((_keys, index) => <button
        key={`path-anchor-${index}`}
        type={'button'}
        className={controls.pathSelectedAnchor === index ? 'rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background' : 'rounded-md px-2 py-1 text-xs text-muted-foreground'}
        onClick={() => setValue('pathSelectedAnchor', index)}
      >
        P{index}
      </button>)}
    </div>
    <div className={'grid grid-cols-2 gap-1'}>
      {anchorNumberField(selectedPathX, 'X', (value) => setPathAnchorNumber('x', value), {min: 0, max: 460})}
      {anchorNumberField(selectedPathY, 'Y', (value) => setPathAnchorNumber('y', value), {min: 0, max: 460})}
    </div>
  </div> : null
  const compositeTabs = apiId === 'group'
    ? [
      ['parent', 'Group'],
      ['childRect', 'Rect'],
      ['childText', 'Text'],
    ] as const
    : [
      ['parent', apiId === 'clip' ? 'Clip' : 'Mask'],
      ['clipPath', 'Path'],
      ['childRect', 'Rect'],
      ['childEllipse', 'Ellipse'],
    ] as const
  const compositeTabList = isCompositeModel
    ? <div className={'mb-4 grid grid-cols-4 gap-1 rounded-lg bg-muted/25 p-1'}>
      {compositeTabs.map(([target, label]) => {
        return <button
          key={target}
          className={controls.compositeTarget === target ? 'rounded-md bg-background px-2 py-1.5 text-xs font-medium' : 'rounded-md px-2 py-1.5 text-xs text-muted-foreground'}
          type={'button'}
          onClick={() => setValue('compositeTarget', target)}
        >
          {label}
        </button>
      })}
    </div>
    : null
  const compositeElementProperties = () => {
    if (!isCompositeModel || controls.compositeTarget === 'parent') {
      return null
    }

    if (controls.compositeTarget === 'clipPath') {
      return <div className={'grid gap-4'}>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Transform</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('clipPathX', 'x', '', {min: 0, max: 280})}
            {numberField('clipPathY', 'y', '', {min: 0, max: 280})}
            {numberField('clipPathWidth', 'w', '', {min: 20, max: 380})}
            {numberField('clipPathHeight', 'h', '', {min: 20, max: 260})}
          </div>
        </section>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Clip Path</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('clipPathCornerRadius', 'radius', '', {min: 0, max: 90})}
            {toggleField('clipIsEllipse', 'ellipse')}
          </div>
        </section>
      </div>
    }

    if (controls.compositeTarget === 'childRect') {
      return <div className={'grid gap-4'}>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Transform</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('childRectX', 'x', '', {min: 0, max: 280})}
            {numberField('childRectY', 'y', '', {min: 0, max: 280})}
            {numberField('childRectWidth', 'w', '', {min: 20, max: 380})}
            {numberField('childRectHeight', 'h', '', {min: 20, max: 260})}
            {numberField('childRectRotation', 'rotate', '°', {min: -180, max: 180})}
          </div>
        </section>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Appearance</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('childRectOpacity', 'opacity', '%', {min: 0, max: 100})}
            {numberField('childRectFillOpacity', 'fill opacity', '%', {min: 0, max: 100})}
            {numberField('childRectStrokeOpacity', 'stroke opacity', '%', {min: 0, max: 100})}
            {numberField('childRectStrokeWidth', 'stroke', '', {min: 0, max: 24})}
          </div>
          {colorField('childRectFill', 'fill')}
          {colorField('childRectStroke', 'stroke')}
        </section>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Rect</p>
          {numberField('childRectCornerRadius', 'radius', '', {min: 0, max: 90})}
        </section>
      </div>
    }

    if (controls.compositeTarget === 'childEllipse') {
      return <div className={'grid gap-4'}>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Transform</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('childEllipseX', 'x', '', {min: 0, max: 280})}
            {numberField('childEllipseY', 'y', '', {min: 0, max: 280})}
            {numberField('childEllipseWidth', 'w', '', {min: 20, max: 380})}
            {numberField('childEllipseHeight', 'h', '', {min: 20, max: 260})}
            {numberField('childEllipseRotation', 'rotate', '°', {min: -180, max: 180})}
          </div>
        </section>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Appearance</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('childEllipseOpacity', 'opacity', '%', {min: 0, max: 100})}
            {numberField('childEllipseFillOpacity', 'fill opacity', '%', {min: 0, max: 100})}
            {numberField('childEllipseStrokeOpacity', 'stroke opacity', '%', {min: 0, max: 100})}
            {numberField('childEllipseStrokeWidth', 'stroke', '', {min: 0, max: 24})}
          </div>
          {colorField('childEllipseFill', 'fill')}
          {colorField('childEllipseStroke', 'stroke')}
        </section>
        <section className={'grid gap-2'}>
          <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Ellipse</p>
          <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
            {numberField('childEllipseStartAngle', 'start', '°', {min: 0, max: 360})}
            {numberField('childEllipseEndAngle', 'end', '°', {min: 0, max: 360})}
          </div>
        </section>
      </div>
    }

    return <div className={'grid gap-4'}>
      <section className={'grid gap-2'}>
        <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Transform</p>
        <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
          {numberField('childTextX', 'x', '', {min: 0, max: 280})}
          {numberField('childTextY', 'y', '', {min: 0, max: 280})}
          {numberField('childTextWidth', 'w', '', {min: 20, max: 380})}
          {numberField('childTextHeight', 'h', '', {min: 20, max: 260})}
          {numberField('childTextRotation', 'rotate', '°', {min: -180, max: 180})}
        </div>
      </section>
      <section className={'grid gap-2'}>
        <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Appearance</p>
        <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
          {numberField('childTextOpacity', 'opacity', '%', {min: 0, max: 100})}
        </div>
        {colorField('childTextFill', 'fill')}
      </section>
      <section className={'grid gap-2'}>
        <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Text</p>
        <label className={'grid gap-1'}>
          <span className={'text-xs text-muted-foreground'}>Text</span>
          <textarea className={'min-h-20 rounded-md border bg-background px-3 py-2 text-sm'} value={controls.childText} onChange={(event) => setValue('childText', event.target.value)} />
        </label>
      </section>
      <section className={'grid gap-2'}>
        <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Typography</p>
        <div className={'grid grid-cols-2 gap-x-3 gap-y-2'}>
          {numberField('childTextFontSize', 'size', '', {min: 12, max: 72})}
          {numberField('childTextFontWeight', 'weight', '', {min: 100, max: 900, step: 100})}
          {numberField('childTextLineHeight', 'line h', '', {min: 16, max: 96})}
        </div>
      </section>
    </div>
  }

  return <div className={'engine-docs-panel p-5'}>
    <div className={'mb-4 flex items-center justify-between gap-3'}>
      <p className={'text-sm font-medium'}>properties</p>
    </div>
    {compositeTabList}
    {isCompositeModel && controls.compositeTarget !== 'parent' ? compositeElementProperties() : null}

    {isCompositeModel && controls.compositeTarget !== 'parent' ? null : <>
      {/* ---- Transform ---- */}
      <div className={'mb-3'}>
        <p className={'mb-1 text-xs font-medium text-muted-foreground'}>Transform</p>
        {lineAnchorControls}
        <div className={'grid grid-cols-4 gap-1'}>
          {showLineEndpoints
            ? null
            : <>
              {numberField('x', 'x', '', {min: 0, max: 280})}
              {numberField('y', 'y', '', {min: 0, max: 280})}
              {numberField('width', 'w', '', {min: 20, max: 380})}
              {numberField('height', 'h', '', {min: 20, max: 260})}
            </>}
          {numberField('rotation', 'rotate', '°', {min: -180, max: 180})}
        </div>
      </div>

      {/* ---- Appearance ---- */}
      <div className={'rounded border bg-muted/25 px-3 py-2'}>
        <p className={'mb-1.5 text-xs font-medium text-muted-foreground'}>Appearance</p>

        {/* Fill row */}
        {showFill ? <div className={'flex flex-wrap items-center gap-1.5 mb-1'}>
          {colorField('fill', 'fill')}
          {numberField('fillOpacity', 'fill α', '%', {min: 0, max: 100})}
          <button type={'button'} className={'rounded border px-1.5 py-px text-[11px] transition ' + (controls.gradientEnabled ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')} onClick={() => setValue('gradientEnabled', !controls.gradientEnabled)}>grad</button>
          {controls.gradientEnabled ? <>
            <input className={'size-5 shrink-0 cursor-pointer rounded border'} type={'color'} value={controls.gradientStartColor} onChange={(e) => setValue('gradientStartColor', e.target.value)} />
            <input className={'size-5 shrink-0 cursor-pointer rounded border'} type={'color'} value={controls.gradientEndColor} onChange={(e) => setValue('gradientEndColor', e.target.value)} />
            <div className={'h-3 w-12 rounded'} style={{background: `linear-gradient(${controls.gradientAngle}deg, ${controls.gradientStartColor}, ${controls.gradientEndColor})`}} />
            <input className={'h-5 w-10 rounded bg-muted/25 px-1 text-[11px] tabular-nums outline-none'} type={'number'} min={0} max={360} step={15} value={controls.gradientAngle} onChange={(e) => setValue('gradientAngle', Number(e.target.value))} />
            <span className={'text-[10px] text-muted-foreground'}>°</span>
          </> : null}
        </div> : null}

        {/* Stroke row */}
        {showStroke ? <div className={'flex flex-wrap items-center gap-1.5 mb-1'}>
          {colorField('stroke', 'stroke')}
          {numberField('strokeWidth', 'stroke', '', {min: 0, max: 24})}
          {numberField('strokeOpacity', 'stroke α', '%', {min: 0, max: 100})}
          <button type={'button'} className={'rounded border px-1.5 py-px text-[11px] transition ' + (controls.strokeGradientEnabled ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')} onClick={() => setValue('strokeGradientEnabled', !controls.strokeGradientEnabled)}>grad</button>
          {controls.strokeGradientEnabled ? <>
            <input className={'size-5 shrink-0 cursor-pointer rounded border'} type={'color'} value={controls.strokeGradientStartColor} onChange={(e) => setValue('strokeGradientStartColor', e.target.value)} />
            <input className={'size-5 shrink-0 cursor-pointer rounded border'} type={'color'} value={controls.strokeGradientEndColor} onChange={(e) => setValue('strokeGradientEndColor', e.target.value)} />
            <div className={'h-3 w-8 rounded'} style={{background: `linear-gradient(${controls.gradientAngle}deg, ${controls.strokeGradientStartColor}, ${controls.strokeGradientEndColor})`}} />
          </> : null}
        </div> : null}

        {/* Opacity + Blend + Corners row */}
        <div className={'flex flex-wrap items-center gap-1.5 mb-1'}>
          {numberField('opacity', 'opacity', '%', {min: 0, max: 100})}
          {!isCompositeModel ? <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Bm</span>
            <select className={'h-6 w-20 rounded bg-muted/25 px-1 text-[11px] outline-none'} value={controls.blendMode} onChange={(e) => setValue('blendMode' as never, (e.target.value || undefined) as never)}>
              <option value={''}>normal</option><option value={'multiply'}>multi</option><option value={'screen'}>screen</option>
              <option value={'overlay'}>overlay</option><option value={'darken'}>darken</option><option value={'lighten'}>lighten</option>
            </select>
          </label> : null}
          {showCornerRadius ? <>
            {controls.cornersLocked
              ? numberField('cornerRadius', 'radius', '', {min: 0, max: 90})
              : <>{numberField('cornerTopLeft', '↖', '', {min: 0, max: 90})}{numberField('cornerTopRight', '↗', '', {min: 0, max: 90})}{numberField('cornerBottomRight', '↘', '', {min: 0, max: 90})}{numberField('cornerBottomLeft', '↙', '', {min: 0, max: 90})}</>}
            <button type={'button'} className={'text-[10px] text-muted-foreground hover:text-foreground'} onClick={() => setValue('cornersLocked', !controls.cornersLocked)}>
              {controls.cornersLocked ? 'split' : 'lock'}
            </button>
          </> : null}
        </div>

        {/* Dash + Align + Cap + Join row */}
        <div className={'flex flex-wrap items-center gap-1.5'}>
          <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Da</span>
            <input className={'h-6 w-12 rounded bg-muted/25 px-1 text-xs tabular-nums outline-none'} type={'number'} min={0} max={40} step={1} value={controls.strokeDashArray[0] ?? ''} onChange={(e) => {
              const v = Number(e.target.value); const g = controls.strokeDashArray[1] ?? controls.strokeDashArray[0] ?? 0
              setValue('strokeDashArray' as never, (v > 0 ? [v, g] : []) as never)
            }} />
          </label>
          <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Ga</span>
            <input className={'h-6 w-12 rounded bg-muted/25 px-1 text-xs tabular-nums outline-none'} type={'number'} min={0} max={40} step={1} value={controls.strokeDashArray[1] ?? ''} onChange={(e) => {
              const v = Number(e.target.value); const d = controls.strokeDashArray[0] ?? 0
              setValue('strokeDashArray' as never, (d > 0 && v > 0 ? [d, v] : (d > 0 ? [d] : [])) as never)
            }} />
          </label>
          <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Al</span>
            <select className={'h-6 w-16 rounded bg-muted/25 px-1 text-[11px] outline-none'} value={controls.strokeAlign} onChange={(e) => setValue('strokeAlign' as never, (e.target.value || undefined) as never)}>
              <option value={''}>center</option><option value={'inside'}>inside</option><option value={'outside'}>outside</option>
            </select>
          </label>
          <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Ca</span>
            <select className={'h-6 w-16 rounded bg-muted/25 px-1 text-[11px] outline-none'} value={controls.strokeCap} onChange={(e) => setValue('strokeCap' as never, (e.target.value || undefined) as never)}>
              <option value={''}>round</option><option value={'butt'}>butt</option><option value={'square'}>square</option>
            </select>
          </label>
          <label className={'flex items-center gap-0.5'}>
            <span className={'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'}>Jo</span>
            <select className={'h-6 w-16 rounded bg-muted/25 px-1 text-[11px] outline-none'} value={controls.strokeJoin} onChange={(e) => setValue('strokeJoin' as never, (e.target.value || undefined) as never)}>
              <option value={''}>round</option><option value={'miter'}>miter</option><option value={'bevel'}>bevel</option>
            </select>
          </label>
        </div>
      </div>

      {/* ---- Shape-specific ---- */}
      {showEllipseAngles ? <div className={'mt-2'}>
        <p className={'mb-1 text-xs font-medium text-muted-foreground'}>Ellipse Arc</p>
        <div className={'grid grid-cols-4 gap-1'}>
          {numberField('ellipseStartAngle', 'start', '°', {min: 0, max: 360})}
          {numberField('ellipseEndAngle', 'end', '°', {min: 0, max: 360})}
          {toggleField('ellipseDrawWedgeLine', 'wedge')}
        </div>
      </div> : null}

      {showText ? <div className={'mt-2'}>
        <textarea className={'mb-1 min-h-16 w-full rounded-md border bg-background px-2 py-1.5 text-xs'} value={controls.text} onChange={(e) => setValue('text', e.target.value)} />
        <div className={'grid grid-cols-4 gap-1'}>
          {numberField('selectedTextStart', 'sel start', '', {min: 0, max: Math.max(1, controls.text.length)})}
          {numberField('selectedTextEnd', 'sel end', '', {min: 0, max: Math.max(1, controls.text.length)})}
        </div>
        {colorField('selectedTextFill', 'sel fill')}
      </div> : null}

      {showTypography ? <div className={'mt-2 grid grid-cols-4 gap-1'}>
        {numberField('fontSize', 'fontSize', '', {min: 12, max: 72})}
        {numberField('fontWeight', 'weight', '', {min: 100, max: 900, step: 100})}
        {numberField('lineHeight', 'lineH', '', {min: 16, max: 96})}
      </div> : null}

      {showPathOptions ? <div className={'mt-2 flex flex-wrap gap-2'}>
        {toggleField('pathClosed', 'closed')}
        {toggleField('pathUseBezier', 'bezier')}
      </div> : null}
      {pathAnchorControls}

      {showImageOptions ? <div className={'mt-2 grid gap-1'}>
        <input className={'h-5 w-full rounded border bg-background px-2 text-[11px]'} value={controls.assetId} onChange={(e) => setValue('assetId', e.target.value)} />
        {toggleField('imageSmoothing', 'smoothing')}
      </div> : null}

      {/* ---- Effects ---- */}
      <div className={'mt-3 border-t pt-2'}>
        <p className={'mb-1.5 text-xs font-medium text-muted-foreground'}>Effects</p>

        <div className={'rounded border bg-muted/25 px-2 py-1.5 mb-1'}>
          <div className={'flex items-center justify-between mb-0.5'}>
            <span className={'text-[11px] font-medium'}>Drop Shadow</span>
            <button type={'button'} className={'rounded border px-1.5 py-px text-[10px] transition ' + (controls.shadowEnabled ? 'bg-foreground text-background' : 'text-muted-foreground')} onClick={() => setValue('shadowEnabled', !controls.shadowEnabled)}>{controls.shadowEnabled ? 'On' : 'Off'}</button>
          </div>
          {controls.shadowEnabled ? <>
            {colorField('shadowColor', 'color')}
            <div className={'grid grid-cols-4 gap-1 mt-0.5'}>
              {numberField('shadowBlur', 'blur', '', {min: 0, max: 40})}
              {numberField('shadowOffsetX', 'off x', '', {min: -40, max: 40})}
              {numberField('shadowOffsetY', 'off y', '', {min: -40, max: 40})}
            </div>
          </> : null}
        </div>

        <div className={'rounded border bg-muted/25 px-2 py-1.5 mb-1'}>
          <div className={'flex items-center justify-between mb-0.5'}>
            <span className={'text-[11px] font-medium'}>Inner Shadow</span>
            <button type={'button'} className={'rounded border px-1.5 py-px text-[10px] transition ' + (controls.innerShadowEnabled ? 'bg-foreground text-background' : 'text-muted-foreground')} onClick={() => setValue('innerShadowEnabled', !controls.innerShadowEnabled)}>{controls.innerShadowEnabled ? 'On' : 'Off'}</button>
          </div>
          {controls.innerShadowEnabled ? <>
            {colorField('innerShadowColor', 'color')}
            {numberField('innerShadowBlur', 'blur', '', {min: 0, max: 40})}
          </> : null}
        </div>

        <div className={'rounded border bg-muted/25 px-2 py-1.5'}>
          <div className={'flex items-center justify-between mb-0.5'}>
            <span className={'text-[11px] font-medium'}>Layer Blur</span>
            <button type={'button'} className={'rounded border px-1.5 py-px text-[10px] transition ' + (controls.layerBlurEnabled ? 'bg-foreground text-background' : 'text-muted-foreground')} onClick={() => setValue('layerBlurEnabled', !controls.layerBlurEnabled)}>{controls.layerBlurEnabled ? 'On' : 'Off'}</button>
          </div>
          {controls.layerBlurEnabled ? numberField('layerBlurAmount', 'amount', 'px', {min: 1, max: 20}) : null}
        </div>
      </div>
    </>}
  </div>
}

function InteractiveMethodDemo({api, theme}: {api: EngineApiDoc, theme: ThemeMode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const venusRef = useRef<Venus | null>(null)
  const [output, setOutput] = useState<string>('')
  const [clickPoint, setClickPoint] = useState<{x: number; y: number} | null>(null)
  const [hoverHit, setHoverHit] = useState<HitTestPanelState | null>(null)
  const [clickedHit, setClickedHit] = useState<HitTestPanelState | null>(null)
  const [eventLogs, setEventLogs] = useState<string[]>([])
  const [backendDiagnostics, setBackendDiagnostics] = useState<BackendDiagnostics | null>(null)
  const logIdRef = useRef(0)

  const pushLog = (msg: string) => {
    logIdRef.current += 1
    setEventLogs((prev) => [`[${logIdRef.current}] ${msg}`, ...prev].slice(0, 6))
  }

  const showResult = (label: string, value: unknown) => {
    setOutput(`${label}: ${JSON.stringify(value, null, 2)}`)
    pushLog(`${label} → ${JSON.stringify(value)}`)
  }
  const stringifyHitPanel = (state: HitTestPanelState | null) => {
    if (!state) {
      return 'Move or click on the canvas.'
    }

    return JSON.stringify({
      point: state.point,
      nodeId: state.result?.nodeId ?? null,
      nodeType: state.result?.nodeType ?? null,
      hitType: state.result?.hitType ?? null,
      raw: state.result,
    }, null, 2)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    const logicalWidth = 400
    const logicalHeight = 300
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.round(logicalWidth * scale)
    canvas.height = Math.round(logicalHeight * scale)
    canvas.style.width = '400px'
    canvas.style.height = `${logicalHeight}px`
    const venus = new Venus(createDocsVenusParameters(theme))
    venus.mount(canvas)
    venus.resize({width: logicalWidth, height: logicalHeight})
    const demoNodes: VenusNode[] = [{id: 'card', type: 'rect', x: 80, y: 60, width: 240, height: 60, fill: theme === 'light' ? '#dbeafe' : '#1e3a8a', stroke: theme === 'light' ? '#2563eb' : '#93c5fd', strokeWidth: 3, cornerRadius: 10},
      {id: 'oval', type: 'ellipse', x: 140, y: 140, width: 120, height: 90, fill: theme === 'light' ? '#fef3c7':'#78350f', stroke: theme==='light'?'#f59e0b':'#fbbf24', strokeWidth: 3},
    ]
    demoNodes.forEach((n) => venus.add(n))
    void venus.render().then(() => {
      if (!cancelled) {
        setBackendDiagnostics(readBackendDiagnostics(venus))
      }
    })
    if (!cancelled) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }
    venusRef.current = venus
    return () => {
      cancelled = true
      venus.destroy()
      venusRef.current = null
    }
  }, [api.id, theme])

  const venus = () => venusRef.current

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setClickPoint({x: Math.round(x), y: Math.round(y)})
    const v = venus()
    if (!v) return
    if (api.id === 'hitTest') {
      const hit = v.hitTest({x, y}, {phase: 'click'})
      setClickedHit({point: {x: Math.round(x), y: Math.round(y)}, result: hit})
    } else if (api.id === 'project') {
      const projected = v.project({x, y})
      showResult('project', projected)
    } else if (api.id === 'unproject') {
      const unprojected = v.unproject({x, y})
      showResult('unproject', unprojected)
    }
  }
  const handleCanvasHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (api.id !== 'hitTest') {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = venus()?.hitTest({x, y}, {phase: 'hover'}) ?? null
    setHoverHit({point: {x: Math.round(x), y: Math.round(y)}, result: hit})
  }

  const renderControls = () => {
    const v = venus()
    switch (api.id) {
      case 'add':
        return <div className={'flex flex-wrap gap-2'}>
          <Button variant={'outline'} size={'sm'} onClick={() => {
            if (!v) return
            const node = v.add({type: 'rect', x: 60 + Math.random() * 200, y: 40 + Math.random() * 140, width: 80, height: 48, fill: '#22c55e', cornerRadius: 8})
            showResult('add', {id: node.id, type: node.type})
            void v.render()
          }}><Plus data-icon="inline-start"/> Add</Button>
        </div>
      case 'bounds':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('bounds', v.bounds()) }}><ScanEye data-icon="inline-start"/> Bounds</Button>
      case 'children':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('children', v.children().map((c) => ({type: c.type, id: c.id}))) }}><List data-icon="inline-start"/> Children</Button>
      case 'getNodeById': {
        const [lookupId, setLookupId] = useState('')
        return <div className={'flex gap-2'}>
          <input className={'h-8 w-28 rounded-md border bg-background px-2 text-xs'} placeholder={'node id'} value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
          <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('getNodeById', v.getNodeById(lookupId)) }}><Search data-icon="inline-start"/> Find</Button>
        </div>
      }
      case 'getParentId': {
        const [pid, setPid] = useState('')
        return <div className={'flex gap-2'}>
          <input className={'h-8 w-28 rounded-md border bg-background px-2 text-xs'} placeholder={'node id'} value={pid} onChange={(e) => setPid(e.target.value)} />
          <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('getParentId', v.getParentId(pid)) }}><Search data-icon="inline-start"/> Find parent</Button>
        </div>
      }
      case 'snapshot':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) { const s = v.snapshot(); showResult('snapshot', {revision: s.revision, nodeCount: s.nodes.length}) } }}><Camera data-icon="inline-start"/> Snapshot</Button>
      case 'fitBounds':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) { const r = v.fitBounds(v.bounds(), 16); showResult('fitBounds', r) } }}><Maximize data-icon="inline-start"/> Fit</Button>
      case 'zoomTo': {
        const [z, setZ] = useState('1.5')
        return <div className={'flex gap-2 items-center'}>
          <input className={'h-8 w-20 rounded-md border bg-background px-2 text-xs'} type={'number'} step={0.1} value={z} onChange={(e) => setZ(e.target.value)} />
          <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('zoomTo', v.zoomTo(Number(z), {x: 200, y: 150})) }}><ZoomIn data-icon="inline-start"/> Zoom</Button>
        </div>
      }
      case 'panBy':
        return <div className={'flex gap-1'}>
          {[{Icon: ArrowLeft, dx: -40, dy: 0}, {Icon: ArrowUp, dx: 0, dy: -30}, {Icon: ArrowDown, dx: 0, dy: 30}, {Icon: ArrowRight, dx: 40, dy: 0}].map(({Icon, dx, dy}, i) =>
            <Button key={`pan-${dx}-${dy}-${i}`} variant={'outline'} size={'icon-sm'} onClick={() => { if (v) showResult('panBy', v.panBy({x: dx, y: dy})) }}><Icon data-icon={'inline-start'}/></Button>
          )}
        </div>
      case 'project':
        return <p className={'flex items-center gap-1 text-xs text-muted-foreground'}><Crosshair data-icon="inline-start"/> Click canvas to project document to screen. {clickPoint ? ` (${clickPoint.x}, ${clickPoint.y})` : ''}</p>
      case 'unproject':
        return <p className={'flex items-center gap-1 text-xs text-muted-foreground'}><Crosshair data-icon="inline-start"/> Click canvas to unproject screen to document. {clickPoint ? ` (${clickPoint.x}, ${clickPoint.y})` : ''}</p>
      case 'enableDebug': {
        const [showBounds, setShowBounds] = useState(false)
        const [showHits, setShowHits] = useState(false)
        return <div className={'flex flex-wrap gap-2 items-center'}>
          <Bug data-icon={'inline-start'} className={'text-muted-foreground'}/>
          <label className={'flex items-center gap-1 text-xs'}><input type={'checkbox'} checked={showBounds} onChange={(e) => { setShowBounds(e.target.checked); if (v) showResult('enableDebug', v.enableDebug({showBounds: e.target.checked, showHitCandidates: showHits})) }} />bounds</label>
          <label className={'flex items-center gap-1 text-xs'}><input type={'checkbox'} checked={showHits} onChange={(e) => { setShowHits(e.target.checked); if (v) showResult('enableDebug', v.enableDebug({showBounds, showHitCandidates: e.target.checked})) }} />hit candidates</label>
        </div>
      }
      case 'inspect':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) showResult('inspect', v.inspect()) }}><Gauge data-icon="inline-start"/> Inspect</Button>
      case 'measureFrame':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) { void v.measureFrame().then((measurement) => showResult('measureFrame', measurement)) } }}><Timer data-icon="inline-start"/> Profile</Button>
      case 'mount':
        return <p className={'flex items-center gap-1 text-xs text-muted-foreground'}><Play data-icon="inline-start"/> Mounted and rendering</p>
      case 'resize': {
        const [rw, setRw] = useState('400')
        const [rh, setRh] = useState('300')
        return <div className={'flex gap-2 items-center'}>
          <input className={'h-8 w-16 rounded-md border bg-background px-2 text-xs'} placeholder={'w'} value={rw} onChange={(e) => setRw(e.target.value)} />
          <span className={'text-xs text-muted-foreground'}>×</span>
          <input className={'h-8 w-16 rounded-md border bg-background px-2 text-xs'} placeholder={'h'} value={rh} onChange={(e) => setRh(e.target.value)} />
          <Button variant={'outline'} size={'sm'} onClick={() => { if (v) { v.resize({width: Number(rw), height: Number(rh)}); showResult('resized to', {width: Number(rw), height: Number(rh)}); void v.render() } }}><Expand data-icon="inline-start"/> Resize</Button>
        </div>
      }
      case 'render':
        return <Button variant={'outline'} size={'sm'} onClick={() => { if (v) { void v.render(); showResult('render', 'frame rendered') } }}><Play data-icon="inline-start"/> Render</Button>
      case 'hitTest':
        return <p className={'flex items-center gap-1 text-xs text-muted-foreground'}><Crosshair data-icon="inline-start"/> Move and click on the canvas. {clickPoint ? ` (${clickPoint.x}, ${clickPoint.y})` : ''}</p>
      case 'on':
        return <div className={'flex flex-wrap gap-2'}>
          <Button variant={'outline'} size={'sm'} onClick={() => {
            if (!v) return
            const off = v.on('render:after', () => pushLog('render:after fired'))
            showResult('on', 'subscribed render:after (auto-off 8s)')
            setTimeout(() => { off(); pushLog('unsubscribed render:after') }, 8000)
          }}><Bell data-icon="inline-start"/> Subscribe</Button>
        </div>
      case 'off':
        return <div className={'flex flex-wrap gap-2'}>
          <Button variant={'outline'} size={'sm'} onClick={() => {
            if (!v) return
            const handler = () => pushLog('one-shot hit')
            v.on('hit', handler)
            v.off('hit', handler)
            showResult('off', 'handler detached before any event')
          }}><BellOff data-icon="inline-start"/> Unsubscribe</Button>
        </div>
      case 'animate':
        return <Button variant={'outline'} size={'sm'} onClick={() => {
          if (!v) return
          const animation = v.animate('card', [{x: 80, rotation: 0}, {x: 40 + Math.random() * 180, rotation: 18}], {duration: 600, easing: 'easeOut'})
          showResult('animate', {methods: ['cancel', 'pause', 'play'], finished: 'Promise<void>'})
          void animation.finished.then(() => pushLog('animation finished'))
        }}><Film data-icon="inline-start"/> Animate</Button>
      case 'group':
        return <Button variant={'outline'} size={'sm'} onClick={() => {
          if (!v) return
          const existing = v.getNodeById('selection-group')
          if (existing) {
            showResult('group', 'selection-group already exists')
            return
          }
          const group = v.group(['card', 'oval'], {id: 'selection-group', name: 'Selection'})
          showResult('group', {id: group.id, cardParent: v.getParentId('card'), ovalParent: v.getParentId('oval')})
          void v.render()
        }}><List data-icon="inline-start"/> Group</Button>
      case 'ungroup':
        return <Button variant={'outline'} size={'sm'} onClick={() => {
          if (!v) return
          const children = v.ungroup('selection-group')
          showResult('ungroup', children.map((child) => ({id: child.id, type: child.type})))
          void v.render()
        }}><List data-icon="inline-start"/> Ungroup</Button>
      case 'destroy':
        return <Button variant={'outline'} size={'sm'} onClick={() => {
          if (!v) return
          v.destroy()
          venusRef.current = null
          showResult('destroy', 'engine disposed')
        }}><Trash2 data-icon="inline-start"/> Destroy</Button>
      default:
        return null
    }
  }

  return <div className={'grid gap-4 lg:grid-cols-[400px_minmax(0,420px)]'}>
    <div className={'grid gap-2'}>
      <canvas
        ref={canvasRef}
        aria-label={`${api.title} interactive demo`}
        className={'h-[300px] w-[400px] max-w-full rounded-lg border border-border engine-docs-canvas'}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        onMouseLeave={() => setHoverHit(null)}
        style={{cursor: (api.id === 'hitTest' || api.id === 'project' || api.id === 'unproject') ? 'crosshair' : 'default'}}
      />
      <BackendDiagnosticsPanel diagnostics={backendDiagnostics}/>
    </div>
    <div className={'flex min-w-0 flex-col gap-4'}>
      <DemoFormPanel>
        <div className={'flex flex-wrap items-center gap-2'}>{renderControls()}</div>
      </DemoFormPanel>
      {api.id === 'hitTest' ? <div className={'grid gap-3 sm:grid-cols-2'}>
        <div className={'engine-docs-panel p-3'}>
          <p className={'mb-1 text-xs font-medium'}>Hover</p>
          <pre className={'max-h-40 overflow-auto text-xs text-muted-foreground'}><code>{stringifyHitPanel(hoverHit)}</code></pre>
        </div>
        <div className={'engine-docs-panel p-3'}>
          <p className={'mb-1 text-xs font-medium'}>Clicked</p>
          <pre className={'max-h-40 overflow-auto text-xs text-muted-foreground'}><code>{stringifyHitPanel(clickedHit)}</code></pre>
        </div>
      </div> : null}
      <div className={'flex gap-3'}>
        {output ? <div className={'flex-1 engine-docs-panel p-3'}>
          <p className={'mb-1 text-xs font-medium'}>Return value</p>
          <pre className={'max-h-40 overflow-auto text-xs text-muted-foreground'}><code>{output}</code></pre>
        </div> : null}
        {eventLogs.length > 0 ? <div className={'flex-1 engine-docs-panel p-3'}>
          <p className={'mb-1 text-xs font-medium'}>Events</p>
          <div className={'max-h-40 overflow-auto'}>
            {eventLogs.map((log, i) => <p key={`event-${i}-${log}`} className={'text-xs text-muted-foreground'}>{log}</p>)}
          </div>
        </div> : null}
      </div>
    </div>
  </div>
}

function ApiCanvasDemo({api, theme}: {api: EngineApiDoc, theme: ThemeMode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [controls, setControls] = useState(() => createInitialModelControls(api.id, theme))
  const [backendDiagnostics, setBackendDiagnostics] = useState<BackendDiagnostics | null>(null)
  const isEditableModel = editableModelApiIds.has(api.id)
  const demoNodes = useMemo(() => {
    return createEditableExampleNodes(api.id, controls) ?? createExampleNodes(api.id, theme)
  }, [api.id, controls, theme])

  useEffect(() => {
    setControls(createInitialModelControls(api.id, theme))
  }, [api.id, theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    let cancelled = false

    const logicalWidth = 400
    const logicalHeight = 300
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.round(logicalWidth * scale)
    canvas.height = Math.round(logicalHeight * scale)
    canvas.style.width = '400px'
    canvas.style.height = `${logicalHeight}px`
    const venus = new Venus(createDocsVenusParameters(theme))
    venus.mount(canvas)
    venus.resize({width: logicalWidth, height: logicalHeight})
    demoNodes.forEach((node) => venus.add(node))
    void venus.render().then(() => {
      if (!cancelled) {
        setBackendDiagnostics(readBackendDiagnostics(venus))
      }
    })
    if (!cancelled) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }

    return () => { cancelled = true; venus.destroy() }
  }, [api.id, demoNodes, theme])

  if (!isEditableModel) {
    return <div className={'grid gap-2'}>
      <canvas ref={canvasRef} aria-label={`${api.title} visual demo`} className={'h-[300px] w-[400px] max-w-full rounded-lg border border-border engine-docs-canvas'} />
      <BackendDiagnosticsPanel diagnostics={backendDiagnostics}/>
    </div>
  }

  return <div className={'grid gap-4 lg:grid-cols-[400px_1fr]'}>
    <div className={'grid gap-2'}>
      <canvas ref={canvasRef} aria-label={`${api.title} visual demo`} className={'h-[300px] w-[400px] max-w-full rounded-lg border border-border engine-docs-canvas'} />
      <BackendDiagnosticsPanel diagnostics={backendDiagnostics}/>
    </div>
    <ModelControlPanel apiId={api.id} controls={controls} setControls={setControls}/>
  </div>
}

function ShapeCanvas({
  ariaLabel,
  nodes,
  theme,
}: {
  ariaLabel: string
  nodes: VenusNode[]
  theme: ThemeMode
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const logicalWidth = 400
    const logicalHeight = 300
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.round(logicalWidth * scale)
    canvas.height = Math.round(logicalHeight * scale)
    canvas.style.width = '400px'
    canvas.style.height = `${logicalHeight}px`

    const venus = new Venus(createDocsVenusParameters(theme))
    venus.mount(canvas)
    venus.resize({width: logicalWidth, height: logicalHeight})
    nodes.forEach((node) => venus.add(node))
    void venus.render()

    return () => {
      venus.destroy()
    }
  }, [nodes, theme])

  return <canvas ref={canvasRef} aria-label={ariaLabel} className={'h-[300px] w-[400px] max-w-full rounded-lg border border-border engine-docs-canvas'} />
}

function DemoFormPanel({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: React.ReactNode
}) {
  return <div className={'engine-docs-panel p-3'}>
    {title || description ? <div className={'mb-3 flex flex-col gap-1'}>
      {title ? <p className={'text-sm font-semibold'}>{title}</p> : null}
      {description ? <p className={'text-xs leading-5 text-muted-foreground'}>{description}</p> : null}
    </div> : null}
    {children}
  </div>
}

function ShapeModelGuide() {
  return <div className={'grid gap-4'}>
    <div className={'grid gap-3 engine-docs-panel p-3'}>
      <h4 className={'text-sm font-semibold'}>Coordinate contract</h4>
      <ul className={'grid gap-1 text-xs leading-5 text-muted-foreground md:grid-cols-2'}>
        <li>• Rect, ellipse, image, and text use x/y as the local top-left or text-box origin; line uses x/y as its start point and width/height as the end-point delta.</li>
        <li>• Group x/y translates the subtree; clip and mask do not own top-level x/y/width/height, so their bounds come from clipPath and children.</li>
        <li>• Polygon and path keep x/y/width/height as editable bounds, while points or bezierPoints are the rendered geometry.</li>
        <li>• transform.x/y is an extra local translation layered on top of geometry x/y; rotation is composed around the bounds center.</li>
      </ul>
    </div>

    <div className={'grid gap-3 engine-docs-panel p-3'}>
      <h4 className={'text-sm font-semibold'}>Modules and inheritance</h4>
      <div className={'overflow-x-auto'}>
        <table className={'w-full min-w-[760px] border-collapse text-left text-xs'}>
          <thead className={'text-muted-foreground'}>
            <tr className={'border-b border-border'}>
              <th className={'px-2 py-2 font-medium'}>Type</th>
              <th className={'px-2 py-2 font-medium'}>Family</th>
              <th className={'px-2 py-2 font-medium'}>Proxy</th>
              <th className={'px-2 py-2 font-medium'}>Files</th>
              <th className={'px-2 py-2 font-medium'}>Minimum</th>
            </tr>
          </thead>
          <tbody>
            {VENUS_SHAPE_MODEL_SPECS.map((spec) => <tr key={spec.type} className={'border-b border-border last:border-0'}>
              <td className={'px-2 py-2 font-mono'}>{spec.type}</td>
              <td className={'px-2 py-2 text-muted-foreground'}>{spec.family}</td>
              <td className={'px-2 py-2'}>
                <code>{spec.proxy}</code>
                <span className={'ml-1 text-muted-foreground'}>← {spec.inherits.join(' ← ')}</span>
              </td>
              <td className={'px-2 py-2 text-muted-foreground'}>{spec.files.join(', ')}</td>
              <td className={'px-2 py-2 font-mono text-muted-foreground'}>{spec.minimalCreate.join(', ')}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    <div className={'grid gap-3 md:grid-cols-2'}>
      {VENUS_SHAPE_MODEL_SPECS.map((spec) => <section key={spec.type} className={'engine-docs-panel p-3'}>
        <div className={'mb-2 flex items-center justify-between gap-2'}>
          <h5 className={'font-mono text-sm font-semibold'}>{spec.type}</h5>
          <span className={'rounded border border-border bg-muted/25 px-1.5 py-0.5 text-[10px] text-muted-foreground'}>{spec.family}</span>
        </div>
        <dl className={'grid gap-2 text-xs leading-5'}>
          <div>
            <dt className={'font-medium'}>Bounds</dt>
            <dd className={'text-muted-foreground'}>{spec.bounds}</dd>
          </div>
          <div>
            <dt className={'font-medium'}>Specific geometry</dt>
            <dd className={'text-muted-foreground'}>{spec.geometry.join(', ')}</dd>
          </div>
          <div>
            <dt className={'font-medium'}>Path expansion</dt>
            <dd className={'text-muted-foreground'}>{spec.pathExpansion}</dd>
          </div>
          <div>
            <dt className={'font-medium'}>Common render</dt>
            <dd className={'text-muted-foreground'}>{spec.commonRender.join(', ')}</dd>
          </div>
        </dl>
      </section>)}
    </div>

    <div className={'grid gap-3 engine-docs-panel p-3'}>
      <h4 className={'text-sm font-semibold'}>Common render contract</h4>
      <p className={'text-xs leading-5 text-muted-foreground'}>The structured best-practice surface is appearance.*. Flat fill/stroke/strokeWidth fields remain compatibility shortcuts and proxy conveniences. Prefer {'r.update({appearance: {...}})'} for grouped paint changes instead of nested mutable objects such as r.stroke.enabled.</p>
      <ul className={'grid gap-1 text-xs leading-5 text-muted-foreground md:grid-cols-2'}>
        {VENUS_COMMON_RENDER_PROPERTIES.map((property, index) => <li key={`common-render-${property}-${index}`}>• {property}</li>)}
      </ul>
      <CodeBox code={`const r = venus.add({type: 'rect', width: 180, height: 96})

r.update({
  appearance: {
    fills: [{type: 'solid', color: '#3b82f6', opacity: 1}],
    strokes: [{
      visible: true,
      width: 3,
      align: 'center',
      paints: [{type: 'solid', color: '#1e40af'}],
    }],
    effects: [{type: 'dropShadow', color: 'rgba(15,23,42,0.18)', blur: 12}],
    opacity: 0.92,
  },
})`}/>
    </div>
  </div>
}

function ShapeStoryDemo({api, theme}: {api: EngineApiDoc; theme: ThemeMode}) {
  const [controls, setControls] = useState(() => createInitialModelControls(api.id, theme))
  const nodes = useMemo(() => createEditableExampleNodes(api.id, controls) ?? createExampleNodes(api.id, theme), [api.id, controls, theme])

  useEffect(() => {
    setControls(createInitialModelControls(api.id, theme))
  }, [api.id, theme])

  return <div className={'grid gap-4 lg:grid-cols-[400px_minmax(0,420px)]'}>
    <ShapeCanvas ariaLabel={`${api.title} visual demo`} nodes={nodes} theme={theme}/>
    <div className={'flex min-w-0 flex-col gap-4'}>
      <ModelControlPanel apiId={api.id} controls={controls} setControls={setControls}/>
      <ApiUsage code={createModelCode(api.id, controls)}/>
    </div>
  </div>
}

function CommonPropertiesDemo({apis}: {apis: EngineApiDoc[]}) {
  const apiById = new Map(apis.map((api) => [api.id, api]))

  return <div className={'grid gap-4'}>
    {shapeApiIds.map((apiId) => {
      const api = apiById.get(apiId)
      const spec = VENUS_SHAPE_MODEL_SPECS.find((candidate) => candidate.type === apiId)
      if (!api || !spec) {
        return null
      }

      return <section key={`common-properties-${apiId}`} id={`models-common-properties-${apiId}`} className={'grid scroll-mt-20 gap-4 engine-docs-panel p-4'}>
        <div className={'flex flex-wrap items-center justify-between gap-3'}>
          <div>
            <h4 className={'font-mono text-base font-semibold'}>{api.title}</h4>
            <p className={'mt-1 max-w-3xl text-sm leading-6 text-muted-foreground'}>{spec.bounds}</p>
          </div>
          <span className={'rounded border border-border bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground'}>{spec.family}</span>
        </div>

        <div className={'grid gap-3 md:grid-cols-2'}>
          {api.propertyGroups?.map((group) => <div key={`${apiId}-${group.title}`} className={'rounded-md border border-border bg-background/45 p-3'}>
            <h5 className={'mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'}>{group.title}</h5>
            <ul className={'flex flex-col gap-1.5'}>
              {group.properties.map((property, propertyIndex) => <li key={`${apiId}-${group.title}-${propertyIndex}`} className={'flex items-start gap-2 text-[13px] leading-6'}>
                <code className={'mt-0.5 shrink-0 rounded bg-muted/60 px-1.5 py-0 text-[11px] font-mono text-foreground/80'}>{property.split(':')[0].split('?')[0]}</code>
                <span className={'text-muted-foreground'}>{property.includes(':') ? property.slice(property.indexOf(':') + 1).trim() : ''}</span>
              </li>)}
            </ul>
          </div>)}
        </div>
      </section>
    })}
  </div>
}

interface EventLogEntry {
  id: number
  name: string
  payload: string
}

function EventInspectorDemo({theme}: {theme: ThemeMode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const venusRef = useRef<Venus | null>(null)
  const eventLogIdRef = useRef(0)
  const [logs, setLogs] = useState<EventLogEntry[]>([])
  const [nodeCount, setNodeCount] = useState(0)
  const [backendDiagnostics, setBackendDiagnostics] = useState<BackendDiagnostics | null>(null)

  const pushLog = (name: string, payload: unknown) => {
    eventLogIdRef.current += 1
    const id = eventLogIdRef.current
    setLogs((currentLogs) => [
      {
        id,
        name,
        payload: JSON.stringify(payload, (_key, value) => {
          if (value instanceof HTMLCanvasElement) {
            return 'HTMLCanvasElement'
          }
          return value
        }),
      },
      ...currentLogs,
    ].slice(0, 8))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    let cancelled = false

    const parentWidth = canvas.parentElement?.clientWidth ?? 720
    const logicalWidth = Math.max(520, Math.floor(parentWidth))
    const logicalHeight = 280
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(logicalWidth * pixelRatio)
    canvas.height = Math.round(logicalHeight * pixelRatio)
    canvas.style.width = '100%'
    canvas.style.height = `${logicalHeight}px`

    const venus = new Venus(createDocsVenusParameters(theme))

    const unsubscribes = [
      venus.on('mounted', (event) => pushLog('mounted', {canvas: event.canvas.tagName})),
      venus.on('document:changed', (event) => pushLog('document:changed', {revision: event.revision, nodeId: event.node?.id ?? null})),
      venus.on('backend:fallback', (event) => pushLog('backend:fallback', event)),
      venus.on('resized', (event) => pushLog('resized', event)),
      venus.on('render:before', (event) => pushLog('render:before', event)),
      venus.on('render:after', (event) => pushLog('render:after', event)),
      venus.on('hit', (event) => pushLog('hit', {point: event.point, nodeId: event.result?.nodeId ?? null})),
      venus.on('destroyed', () => pushLog('destroyed', {})),
    ]

    venus.mount(canvas)
    venus.resize({width: logicalWidth, height: logicalHeight})
    createExampleNodes('events-demo', theme).forEach((node) => venus.add(node))
    void venus.render().then(() => {
      if (!cancelled) {
        setBackendDiagnostics(readBackendDiagnostics(venus))
      }
    })
    if (!cancelled) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }
    venusRef.current = venus

    return () => {
      cancelled = true
      unsubscribes.forEach((unsubscribe) => unsubscribe())
      venus.destroy()
      venusRef.current = null
    }
  }, [theme])

  const addNode = async () => {
    const venus = venusRef.current
    if (!venus) {
      return
    }

    const offset = (nodeCount % 4) * 28
    venus.add({
      type: 'rect',
      x: 80 + offset,
      y: 42 + offset,
      width: 120,
      height: 72,
      fill: theme === 'light' ? '#dbeafe' : '#1e3a8a',
      stroke: theme === 'light' ? '#2563eb' : '#93c5fd',
      strokeWidth: 3,
      cornerRadius: 10,
    })
    setNodeCount((currentCount) => currentCount + 1)
    await venus.render()
    setBackendDiagnostics(readBackendDiagnostics(venus))
  }

  const renderNow = async () => {
    const venus = venusRef.current
    await venus?.render()
    if (venus) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }
  }

  const hitTest = () => {
    const venus = venusRef.current
    venus?.hitTest({x: 160, y: 120}, {phase: 'click'})
    if (venus) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }
  }

  const resize = () => {
    const venus = venusRef.current
    venus?.resize({width: 560, height: 280})
    if (venus) {
      setBackendDiagnostics(readBackendDiagnostics(venus))
    }
  }

  return <div className={'flex flex-col gap-3'}>
    <canvas ref={canvasRef} aria-label={'Venus events interactive demo'} className={'w-full rounded-lg border border-border engine-docs-canvas'} />
    <BackendDiagnosticsPanel diagnostics={backendDiagnostics}/>
    <div className={'flex flex-wrap gap-2'}>
      <Button variant={'outline'} size={'sm'} onClick={() => void addNode()}><Plus data-icon="inline-start"/> Add</Button>
      <Button variant={'outline'} size={'sm'} onClick={() => void renderNow()}><Play data-icon="inline-start"/> Render</Button>
      <Button variant={'outline'} size={'sm'} onClick={hitTest}><Crosshair data-icon="inline-start"/> Hit test</Button>
      <Button variant={'outline'} size={'sm'} onClick={resize}><Expand data-icon="inline-start"/> Resize</Button>
    </div>
    <div className={'max-h-56 overflow-auto engine-docs-panel p-3'}>
      {logs.length === 0
        ? <p className={'text-xs text-muted-foreground'}>Click a button to see Venus events.</p>
        : logs.map((log) => {
          return <div key={log.id} className={'border-b border-border py-2 last:border-0'}>
            <p className={'text-xs font-medium'}>{log.name}</p>
            <code className={'block break-all text-xs text-muted-foreground'}>{log.payload}</code>
          </div>
        })}
    </div>
  </div>
}

function ThemeHoverMenu({
  theme,
  setTheme,
}: {
  theme: ThemeMode
  setTheme: Dispatch<SetStateAction<ThemeMode>>
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return <div className={'relative'} ref={rootRef}>
    <Button
      aria-expanded={open}
      aria-label={'Theme'}
      aria-haspopup={'menu'}
      variant={'outline'}
      size={'icon'}
      onClick={() => setOpen((current) => !current)}
    >
      <Palette data-icon="inline-start"/>
    </Button>
    <div className={open ? 'absolute right-0 top-full z-20 pt-2 opacity-100' : 'invisible absolute right-0 top-full z-20 pt-2 opacity-0'}>
      <div role={'menu'} className={'min-w-44 rounded-md border border-border bg-card p-1 text-card-foreground shadow-[var(--shadow-popover)]'}>
        {themeOptions.map((option) => {
          return <button
            key={option.name}
            role={'menuitemradio'}
            aria-checked={theme === option.name}
            type={'button'}
            className={'flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none'}
            onClick={() => {
              setTheme(option.name)
              setOpen(false)
            }}
          >
            <span>{option.label}</span>
            {theme === option.name ? <Check data-icon="inline-end"/> : null}
          </button>
        })}
      </div>
    </div>
  </div>
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [copiedApiId, setCopiedApiId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const baseNavigationItems = useMemo<CollapsibleNavItem[]>(() => {
    return engineApiCategories.map((category) => {
      if (category.id === 'models') {
        const shapeApis = shapeApiIds
          .map((apiId) => category.apis.find((api) => api.id === apiId))
          .filter((api): api is EngineApiDoc => Boolean(api))
        return {
          id: 'models-contract-nav',
          label: 'Shape model contract',
          href: '#models-shape-contract',
          defaultOpen: true,
          items: [
            {
              id: 'models-shapes-nav',
              label: 'Shapes',
              href: '#models-shapes',
              defaultOpen: true,
              items: shapeApis.map((api) => ({
                id: api.id,
                label: api.title,
                href: `#${getApiAnchorId(category, api)}`,
              })),
            },
            {
              id: 'models-common-properties-nav',
              label: 'Common Properties',
              href: '#models-common-properties',
              defaultOpen: true,
              items: shapeApis.map((api) => ({
                id: `common-${api.id}`,
                label: api.title,
                href: `#models-common-properties-${api.id}`,
              })),
            },
          ],
        }
      }

      return {
        id: category.id,
        label: category.title,
        href: `#${category.id}`,
        defaultOpen: true,
        items: category.apis.map((api) => ({
          id: api.id,
          label: api.title,
          href: `#${getApiAnchorId(category, api)}`,
        })),
      }
    })
  }, [])
  const navigationItems = useMemo(() => filterNavigationItems(baseNavigationItems, searchQuery), [baseNavigationItems, searchQuery])
  const apiCount = useMemo(() => engineApiCategories.reduce((sum, category) => sum + category.apis.length, 0), [])

  return <div data-theme={theme} className={'engine-docs-shell bg-background text-foreground'}>
    <header className={'engine-docs-topbar sticky top-0 z-10'}>
      <div className={'mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6'}>
        <a href={'#top'} className={'flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight'}>
          <span className={'engine-docs-brand-mark flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground'}>V</span>
          <span className={'truncate text-[15px]'}>Venus Engine Docs</span>
          <Badge variant={'info'} size={'sm'}>API</Badge>
        </a>
        <div className={'hidden min-w-0 flex-1 justify-center md:flex'}>
          <label className={'relative w-full max-w-md'}>
            <Search data-icon="inline-start" className={'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground'}/>
            <Input
              aria-label={'Search APIs'}
              className={'h-8 rounded-md bg-background/80 pl-8 text-xs shadow-[0_1px_1px_hsl(var(--foreground)/0.04)]'}
              placeholder={'Search APIs'}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>
        <div className={'flex items-center gap-2'}>
          <Button variant={'outline'} size={'sm'} className={'min-w-14'} onClick={() => { window.location.hash = 'start-new-venus' }}>
            Start
          </Button>
          <ThemeHoverMenu theme={theme} setTheme={setTheme}/>
        </div>
      </div>
    </header>

    <div id={'top'} className={'mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]'}>
      <aside className={'hidden lg:block'}>
        <div className={'engine-docs-sidebar sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col gap-4 overflow-auto rounded-lg p-3'} data-ui-scroll>
          <div className={'border-b border-border pb-3'}>
            <p className={'text-[11px] font-medium uppercase tracking-wide text-muted-foreground'}>Reference</p>
            <div className={'mt-1 flex items-center justify-between gap-2'}>
              <h1 className={'text-base font-semibold tracking-tight'}>Engine API</h1>
              <Badge variant={'secondary'} size={'sm'}>{apiCount}</Badge>
            </div>
            <label className={'relative mt-3 block md:hidden'}>
              <Search data-icon="inline-start" className={'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground'}/>
              <Input
                aria-label={'Search APIs'}
                className={'h-8 pl-8 text-xs'}
                placeholder={'Search APIs'}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>

          <CollapsibleNav items={navigationItems} ariaLabel={'Engine API navigation'} className={'gap-2'}/>
        </div>
      </aside>

      <div className={'engine-docs-panel lg:hidden p-3'}>
        <label className={'relative block'}>
          <Search data-icon="inline-start" className={'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground'}/>
          <Input
            aria-label={'Search APIs'}
            className={'h-8 pl-8 text-xs'}
            placeholder={'Search APIs'}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </div>

      <main className={'min-w-0'}>
        <div className={'flex flex-col gap-12'}>
          {engineApiCategories.map((category) => {
            if (category.id === 'models') {
              const shapeApis = shapeApiIds
                .map((apiId) => category.apis.find((api) => api.id === apiId))
                .filter((api): api is EngineApiDoc => Boolean(api))

              return <section key={category.id} className={'scroll-mt-20'}>
                <article id={'models-shape-contract'} className={'engine-docs-article flex scroll-mt-20 flex-col gap-6 p-6'}>
                  <header className={'flex flex-col gap-2'}>
                    <h3 className={'text-xl font-semibold tracking-tight'}>Shape model contract</h3>
                    <p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>The engine-side contract for module ownership, proxy inheritance, minimal creation fields, editable bounds, path expansion, and shared render properties.</p>
                  </header>
                  <ShapeModelGuide/>
                </article>

                <div id={'models-shapes'} className={'scroll-mt-20 py-6'}>
                  <h3 className={'text-xl font-semibold tracking-tight'}>Shapes</h3>
                  <p className={'mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'}>Each shape page includes the live canvas, model-specific controls, and shared editable fields.</p>
                </div>

                <div className={'flex flex-col gap-4'}>
                  {shapeApis.map((api) => {
                    const apiAnchorId = getApiAnchorId(category, api)
                    return <article key={`shape-api-${api.id}`} id={apiAnchorId} className={'engine-docs-article flex scroll-mt-20 flex-col gap-6 p-6'}>
                      <header className={'flex w-full flex-col gap-2'}>
                        <h4 className={'block w-full text-lg font-semibold tracking-tight'}>{api.title}</h4>
                        <p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>{api.summary}</p>
                      </header>
                      <ApiDescription api={api}/>
                      <ShapeStoryDemo api={api} theme={theme}/>
                    </article>
                  })}
                </div>

                <article id={'models-common-properties'} className={'engine-docs-article mt-4 flex scroll-mt-20 flex-col gap-6 p-6'}>
                  <header className={'flex flex-col gap-2'}>
                    <h3 className={'text-xl font-semibold tracking-tight'}>Common Properties</h3>
                    <p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>Shared fields are grouped by the engine model kind so each surface shows its complete inherited and model-specific property set.</p>
                  </header>
                  <CommonPropertiesDemo apis={shapeApis}/>
                </article>
              </section>
            }

            return <section key={category.id} id={category.id} className={'scroll-mt-20'}>
              <div className={'mb-5 flex flex-col gap-2'}>
                <h2 className={'scroll-mt-20 text-2xl font-semibold tracking-tight'}>{category.title}</h2>
              </div>

              <div className={'flex flex-col gap-4'}>
                {category.apis.map((api, apiIndex) => {
                  const apiAnchorId = getApiAnchorId(category, api)
                  const isStart = category.id === 'start'
                  const isDocModel = category.id === 'models'
                  const isLastDocModel = isDocModel && apiIndex === category.apis.length - 1
                  const isMethods = category.id === 'methods'

                  return <article key={`${category.id}-${api.id}`} id={apiAnchorId} className={'engine-docs-article flex scroll-mt-20 flex-col gap-6 p-6'}>
                    <header className={'flex w-full flex-col gap-2'}>
                      <div className={'flex flex-wrap items-center gap-2'}>
                        <h3 className={'text-lg font-semibold tracking-tight'}>{api.title}</h3>
                        {isMethods && <Badge variant={'secondary'}>method</Badge>}
                        {isDocModel && !isLastDocModel && <Badge variant={'outline'}>shape</Badge>}
                        {isStart && <Badge variant={'amber'}>start here</Badge>}
                      </div>
                      <p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>{api.summary}</p>
                      {isDocModel && !isLastDocModel
                        ? <div className={'flex items-center gap-1 pt-1'}>
                          <Tooltip text={copiedApiId === api.id ? 'Copied' : 'Copy example'}>
                            <Button variant={'ghost'} size={'xs'} onClick={() => {
                              void navigator.clipboard.writeText(createCopyCompCode(api.id, theme)).then(() => {
                                setCopiedApiId(api.id)
                                window.setTimeout(() => setCopiedApiId((id) => id === api.id ? null : id), 1200)
                              })
                            }}>
                              {copiedApiId === api.id ? '✓ Copied' : <><Copy data-icon={'inline-start'}/> Copy example</>}
                            </Button>
                          </Tooltip>
                        </div>
                        : null}
                    </header>

                    <ApiDescription api={api}/>

                    <div className={'flex flex-col gap-3'}>
                      {isStart
                        ? <div className={'grid gap-4 lg:grid-cols-[400px_minmax(0,400px)]'}>
                          <ApiCanvasDemo api={api} theme={theme}/>
                          <ApiUsage code={api.demo}/>
                        </div>
                        : isMethods
                            ? <InteractiveMethodDemo api={api} theme={theme}/>
                            : api.id === 'events-demo'
                              ? <EventInspectorDemo theme={theme}/>
                              : <ApiCanvasDemo api={api} theme={theme}/>}
                    </div>

                    {/* Document Models: generated create usage */}
                    {isDocModel && !isLastDocModel
                      ? <ApiUsage code={createCopyCompCode(api.id, theme)}/>
                      : null}

                    {/* Methods: explicit usage */}
                    {isMethods
                      ? <ApiUsage code={api.demo}/>
                      : null}

                    {!isStart && !isDocModel && !isMethods
                      ? <ApiUsage code={createUsageCode(api, theme)}/>
                      : null}

                    {api.parameters && api.parameters.length > 0
                      ? <section className={'flex min-w-0 flex-col gap-3'}>
                        <h4 className={'text-sm font-medium'}>Parameters</h4>
                        <ParameterTable parameters={api.parameters}/>
                      </section>
                      : null}

                    {(api.properties?.length ?? 0) > 0
                      ? <section className={'flex min-w-0 flex-col gap-3'}>
                        <div className={'flex items-center gap-2'}>
                          <h4 className={'text-sm font-medium'}>Properties</h4>
                          <Badge variant={'secondary'} className={'text-[10px]'}>{api.properties?.length ?? 0}</Badge>
                        </div>
                        {(api.propertyGroups?.length ?? 0) > 0
                          ? <div className={'grid gap-3 md:grid-cols-2'}>
                            {api.propertyGroups?.map((group, groupIndex) => {
                              return <div key={`${api.id}-group-${group.title}-${groupIndex}`} className={'engine-docs-panel p-4'}>
                                <h5 className={'mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'}>{group.title}</h5>
                                <ul className={'flex flex-col gap-1.5'}>
                                  {group.properties.map((property, propertyIndex) => {
                                    return <li key={`${api.id}-${group.title}-${property}-${propertyIndex}`} className={'flex items-start gap-2 text-[13px] leading-6'}>
                                      <code className={'mt-0.5 shrink-0 rounded bg-muted/60 px-1.5 py-0 text-[11px] font-mono text-foreground/80'}>{property.split(':')[0].split('?')[0]}</code>
                                      <span className={'text-muted-foreground'}>{property.includes(':') ? property.slice(property.indexOf(':') + 1).trim() : ''}</span>
                                    </li>
                                  })}
                                </ul>
                              </div>
                            })}
                          </div>
                          : <ul className={'flex flex-col gap-1 text-sm text-muted-foreground'}>
                            {api.properties?.map((property, propertyIndex) => {
                              return <li key={`${api.id}-property-${property}-${propertyIndex}`} className={'leading-6'}>• {property}</li>
                            })}
                          </ul>}
                      </section>
                      : null}

                    {api.methods && api.methods.length > 0
                      ? <section className={'flex min-w-0 flex-col gap-4'}>
                        <h4 className={'text-sm font-medium'}>Methods</h4>
                        {api.methods.map((method, methodIndex) => {
                          return <div key={`${api.id}-method-${method.name}-${methodIndex}`} className={'engine-docs-panel flex flex-col gap-2 p-4'}>
                            <code className={'text-xs'}>{method.name}</code>
                            <p className={'text-sm leading-6 text-muted-foreground'}>{method.description}</p>
                            {method.parameters && method.parameters.length > 0
                              ? <ParameterTable parameters={method.parameters}/>
                              : null}
                          </div>
                        })}
                      </section>
                      : null}
                  </article>
                })}
              </div>
            </section>
          })}
        </div>
      </main>
    </div>
  </div>
}
