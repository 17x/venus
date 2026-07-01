import {
  createEngine,
  type EngineSceneSnapshot,
} from '../src/index.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#engine-canvas')
const renderStatus = document.querySelector<HTMLPreElement>('#render-status')
const selfTest = document.querySelector<HTMLPreElement>('#self-test')
const hoverHit = document.querySelector<HTMLPreElement>('#hover-hit')
const clickHit = document.querySelector<HTMLPreElement>('#click-hit')

if (!canvas || !renderStatus || !selfTest || !hoverHit || !clickHit) {
  throw new Error('Engine demo expected canvas and hit-test output elements')
}

const HOVER_TOLERANCE = 10
const CLICK_TOLERANCE = 6

const viewport = {
  viewportWidth: canvas.clientWidth,
  viewportHeight: canvas.clientHeight,
  offsetX: 24,
  offsetY: 24,
  scale: 1,
}

const image = new Image()
image.src = createDemoImageDataUrl()

const hitFixtures = [
  {id: 'rect-rounded', scenePoint: {x: 115, y: 88}},
  {id: 'ellipse-arc', scenePoint: {x: 302, y: 90}},
  {id: 'line-arrow', scenePoint: {x: 520, y: 90}},
  {id: 'polygon', scenePoint: {x: 714, y: 96}},
  {id: 'path-bezier', scenePoint: {x: 214, y: 276}},
  {id: 'closed-path-fill', scenePoint: {x: 128, y: 440}},
  {id: 'stroke-only-rect', scenePoint: {x: 266, y: 426}},
  {id: 'text-rich', scenePoint: {x: 520, y: 244}},
  {id: 'image-clipped', scenePoint: {x: 760, y: 274}},
] as const

const scene: EngineSceneSnapshot = {
  revision: 1,
  width: 960,
  height: 560,
  nodes: [
    {
      id: 'group-basics',
      type: 'group',
      opacity: 0.98,
      children: [
        {
          id: 'rect-rounded',
          type: 'shape',
          shape: 'rect',
          x: 40,
          y: 42,
          width: 150,
          height: 92,
          cornerRadii: {
            topLeft: 22,
            topRight: 8,
            bottomRight: 22,
            bottomLeft: 8,
          },
          fill: '#dbeafe',
          stroke: '#2563eb',
          strokeWidth: 3,
        },
        {
          id: 'ellipse-arc',
          type: 'shape',
          shape: 'ellipse',
          x: 230,
          y: 48,
          width: 142,
          height: 84,
          ellipseStartAngle: 20,
          ellipseEndAngle: 320,
          fill: '#fef3c7',
          stroke: '#d97706',
          strokeWidth: 3,
        },
        {
          id: 'line-arrow',
          type: 'shape',
          shape: 'line',
          x: 424,
          y: 90,
          width: 188,
          height: 0,
          points: [
            {x: 424, y: 90},
            {x: 612, y: 90},
          ],
          stroke: '#0f766e',
          strokeWidth: 5,
          strokeStartArrowhead: 'circle',
          strokeEndArrowhead: 'triangle',
        },
        {
          id: 'polygon',
          type: 'shape',
          shape: 'polygon',
          x: 654,
          y: 36,
          width: 130,
          height: 112,
          points: [
            {x: 714, y: 36},
            {x: 784, y: 90},
            {x: 748, y: 148},
            {x: 666, y: 134},
            {x: 654, y: 62},
          ],
          fill: '#dcfce7',
          stroke: '#16a34a',
          strokeWidth: 3,
          closed: true,
        },
        {
          id: 'path-bezier',
          type: 'shape',
          shape: 'path',
          x: 54,
          y: 218,
          width: 300,
          height: 132,
          bezierPoints: [
            {anchor: {x: 54, y: 318}},
            {
              anchor: {x: 354, y: 238},
              cp1: {x: 142, y: 172},
              cp2: {x: 272, y: 392},
            },
          ],
          stroke: '#7c3aed',
          strokeWidth: 5,
          strokeEndArrowhead: 'diamond',
        },
        {
          id: 'closed-path-fill',
          type: 'shape',
          shape: 'path',
          x: 62,
          y: 384,
          width: 130,
          height: 92,
          points: [
            {x: 128, y: 384},
            {x: 192, y: 468},
            {x: 62, y: 468},
          ],
          closed: true,
          fill: '#fce7f3',
          stroke: '#db2777',
          strokeWidth: 3,
        },
        {
          id: 'stroke-only-rect',
          type: 'shape',
          shape: 'rect',
          x: 256,
          y: 382,
          width: 142,
          height: 88,
          cornerRadius: 24,
          stroke: '#475569',
          strokeWidth: 8,
        },
        {
          id: 'text-rich',
          type: 'text',
          x: 420,
          y: 220,
          width: 250,
          height: 72,
          text: 'Engine text node',
          runs: [
            {
              text: 'Engine text node',
              style: {
                fill: '#111827',
                fontWeight: 700,
              },
            },
          ],
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 28,
            fill: '#111827',
          },
          wrap: 'word',
        },
        {
          id: 'image-clipped',
          type: 'image',
          x: 690,
          y: 210,
          width: 190,
          height: 126,
          assetId: 'demo-gradient',
          naturalSize: {
            width: 240,
            height: 160,
          },
          imageSmoothing: true,
          clip: {
            clipShape: {
              kind: 'rect',
              rect: {
                x: 690,
                y: 210,
                width: 190,
                height: 126,
              },
              radius: 18,
            },
          },
        },
      ],
    },
  ],
}

const engine = createEngine({
  canvas,
  initialScene: scene,
  viewport,
  performance: {
    culling: true,
    lod: {enabled: false},
    tiles: {enabled: false},
    overscan: {enabled: false},
  },
  render: {
    backend: 'canvas2d',
    quality: 'full',
    interactionPreview: {enabled: false},
  },
  resource: {
    loader: {
      resolveImage: (assetId) => assetId === 'demo-gradient' && image.complete ? image : null,
    },
  },
})

const demoWindow = window as typeof window & {
  venusEngineDemo?: {
    hitAt(x: number, y: number, tolerance?: number): unknown
    selfTest(): string
  }
}

demoWindow.venusEngineDemo = {
  hitAt(x: number, y: number, tolerance = CLICK_TOLERANCE) {
    const point = {x, y}
    return {
      hit: engine.hitTest(point, tolerance),
      candidates: engine.queryPointCandidates(point, tolerance),
      diagnostics: engine.getDiagnostics().hitPlan,
    }
  },
  selfTest: formatSelfTestBlock,
}

image.addEventListener('load', () => {
  void render('image ready')
})

window.addEventListener('resize', () => {
  resizeCanvas()
  void render('resized')
})

canvas.addEventListener('pointerdown', (event) => {
  const pointer = resolvePointer(event)
  clickHit.textContent = formatHitTestBlock('clicked', pointer, CLICK_TOLERANCE)
})

canvas.addEventListener('pointermove', (event) => {
  const pointer = resolvePointer(event)
  hoverHit.textContent = formatHitTestBlock('hover', pointer, HOVER_TOLERANCE)
})

canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  const currentViewport = engine.getDiagnostics().viewport
  const nextScale = Math.min(2.4, Math.max(0.5, currentViewport.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
  const bounds = canvas.getBoundingClientRect()
  engine.zoomTo(nextScale, {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })
  void render(`zoom ${nextScale.toFixed(2)}x`)
}, {passive: false})

resizeCanvas()
void render('ready')

/**
 * Renders one frame and publishes compact demo diagnostics.
 */
async function render(reason: string) {
  const stats = await engine.renderFrame()
  renderStatus.textContent = [
    `reason: ${reason}`,
    `backend: ${engine.getDiagnostics().backend}`,
    `visible: ${stats.visibleCount}`,
    `drawn: ${stats.drawCount}`,
    `culled: ${stats.culledCount}`,
  ].join('\n')
  selfTest.textContent = formatSelfTestBlock()
}

/**
 * Keeps the canvas backing store aligned with CSS size and device pixel ratio.
 */
function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(rect.width * ratio))
  canvas.height = Math.max(1, Math.round(rect.height * ratio))
  engine.resize({
    viewportWidth: rect.width,
    viewportHeight: rect.height,
    outputWidth: canvas.width,
    outputHeight: canvas.height,
  })
}

/**
 * Converts pointer coordinates into engine scene coordinates through the
 * engine-owned inverse viewport matrix.
 */
function resolvePointer(event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect()
  const currentViewport = engine.getDiagnostics().viewport
  const screenPoint = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  }
  const scenePoint = applyMatrixToPoint(currentViewport.inverseMatrix, screenPoint)

  return {
    screenPoint,
    scenePoint,
    viewport: currentViewport,
  }
}

/**
 * Runs one hit-test mode and formats the diagnostics block shown in the demo.
 */
function formatHitTestBlock(
  mode: 'hover' | 'clicked',
  pointer: ReturnType<typeof resolvePointer>,
  tolerance: number,
) {
  const {screenPoint, scenePoint, viewport: currentViewport} = pointer
  const hit = engine.hitTest(scenePoint, tolerance)
  const diagnostics = engine.getDiagnostics()
  const plan = diagnostics.hitPlan
  const candidates = engine.queryPointCandidates(scenePoint, tolerance)

  return [
    `mode: ${mode}`,
    `screen: ${Math.round(screenPoint.x)}, ${Math.round(screenPoint.y)}`,
    `point: ${Math.round(scenePoint.x)}, ${Math.round(scenePoint.y)}`,
    `viewport: offset ${Math.round(currentViewport.offsetX)}, ${Math.round(currentViewport.offsetY)} / scale ${currentViewport.scale.toFixed(2)}`,
    `tolerance: ${tolerance}`,
    `primary: ${hit?.nodeId ?? 'none'}`,
    `type: ${hit?.nodeType ?? 'none'}`,
    `candidates(${candidates.length}): ${formatList(candidates)}`,
    `hits: ${plan?.hitCount ?? 0}`,
    `exact checks: ${plan?.exactCheckCount ?? 0}`,
    `budget: ${formatBudget(plan?.exactCheckBudget)}`,
    `budget exceeded: ${String(plan?.exactBudgetExceeded ?? false)}`,
  ].join('\n')
}

/**
 * Runs known scene-space hit points so page load itself proves hit-test works.
 */
function formatSelfTestBlock() {
  return hitFixtures.map((fixture) => {
    const hit = engine.hitTest(fixture.scenePoint, CLICK_TOLERANCE)
    return `${fixture.id}: ${hit?.nodeId ?? 'none'}`
  }).join('\n')
}

/**
 * Applies one row-major 3x3 matrix to a point.
 */
function applyMatrixToPoint(
  matrix: readonly [number, number, number, number, number, number, number, number, number],
  point: {x: number; y: number},
) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

/**
 * Formats a compact id list for panel output.
 */
function formatList(values: readonly string[]) {
  if (values.length === 0) {
    return 'none'
  }

  return values.slice(0, 8).join(', ') + (values.length > 8 ? ', …' : '')
}

/**
 * Formats the exact-check budget for readable demo diagnostics.
 */
function formatBudget(value: number | undefined) {
  if (value === undefined) {
    return 'n/a'
  }
  if (!Number.isFinite(value)) {
    return '∞'
  }
  return String(value)
}

/**
 * Creates a small inline image asset so the demo has no network dependency.
 */
function createDemoImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="55%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
      <rect width="240" height="160" fill="url(#g)"/>
      <circle cx="184" cy="54" r="34" fill="#ffffff" opacity="0.42"/>
      <path d="M20 132 C 78 74, 126 188, 220 84" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity="0.68"/>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
