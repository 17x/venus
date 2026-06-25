import {
  createEngine,
  type EngineSceneSnapshot,
} from '../src/index.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#engine-canvas')
const status = document.querySelector<HTMLDivElement>('#status')

if (!canvas || !status) {
  throw new Error('Engine demo expected #engine-canvas and #status elements')
}

const viewport = {
  viewportWidth: canvas.clientWidth,
  viewportHeight: canvas.clientHeight,
  offsetX: 24,
  offsetY: 24,
  scale: 1,
}

const image = new Image()
image.src = createDemoImageDataUrl()

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

image.addEventListener('load', () => {
  void render('image ready')
})

window.addEventListener('resize', () => {
  resizeCanvas()
  void render('resized')
})

canvas.addEventListener('pointerdown', (event) => {
  const scenePoint = toScenePoint(event)
  const hit = engine.hitTest(scenePoint, 6)
  status.textContent = hit
    ? `Hit ${hit.nodeId} at ${Math.round(scenePoint.x)}, ${Math.round(scenePoint.y)}`
    : `Empty at ${Math.round(scenePoint.x)}, ${Math.round(scenePoint.y)}`
})

canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  const nextScale = Math.min(2.4, Math.max(0.5, viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
  viewport.scale = nextScale
  engine.setViewport(viewport)
  void render(`zoom ${nextScale.toFixed(2)}x`)
}, {passive: false})

resizeCanvas()
void render('ready')

/**
 * Renders one frame and publishes compact demo diagnostics.
 */
async function render(reason: string) {
  const stats = await engine.renderFrame()
  status.textContent = `${reason}: ${stats.visibleCount} visible, ${stats.drawCount} drawn, backend ${engine.getDiagnostics().backend}`
}

/**
 * Keeps the canvas backing store aligned with CSS size and device pixel ratio.
 */
function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(rect.width * ratio))
  canvas.height = Math.max(1, Math.round(rect.height * ratio))
  viewport.viewportWidth = rect.width
  viewport.viewportHeight = rect.height
  engine.resize({
    viewportWidth: rect.width,
    viewportHeight: rect.height,
    outputWidth: canvas.width,
    outputHeight: canvas.height,
  })
}

/**
 * Converts pointer coordinates into engine scene coordinates.
 */
function toScenePoint(event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect()
  return {
    x: (event.clientX - bounds.left - viewport.offsetX) / viewport.scale,
    y: (event.clientY - bounds.top - viewport.offsetY) / viewport.scale,
  }
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
