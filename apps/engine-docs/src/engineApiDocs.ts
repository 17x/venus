export interface EngineApiDoc {
  id: string
  title: string
  signature: string
  summary: string
  readableDescription: string
  properties: string[]
  demo: string
  demoCaption: string
}

export interface EngineApiCategory {
  id: string
  title: string
  summary: string
  apis: EngineApiDoc[]
}

export const engineApiCategories: EngineApiCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    summary: 'Small entry points for users who want to draw something in a few lines after importing the library.',
    apis: [
      {
        id: 'create-engine',
        title: 'createEngine',
        signature: 'createEngine(options: EngineCreateOptions): Engine',
        summary: 'Creates an engine instance, binds it to a canvas, loads an initial scene, and exposes render commands.',
        readableDescription: 'Use this when an app first mounts a drawing surface. The canvas is the output target, the initial scene is the document model, and the returned engine is the object you call for rendering, viewport, diagnostics, and interaction work.',
        properties: [
          'canvas: HTMLCanvasElement',
          'initialScene: EngineSceneSnapshot',
          'render.quality: full | draft',
          'render.webglAntialias: boolean',
          'culling: boolean',
          'lod.enabled: boolean',
        ],
        demo: `import {createEngine} from '@venus/engine'

const canvas = document.querySelector('canvas')!
const engine = createEngine({
  canvas,
  initialScene: {
    revision: 1,
    width: 320,
    height: 200,
    nodes: [{
      id: 'hello-rect',
      type: 'shape',
      shape: 'rect',
      x: 40,
      y: 32,
      width: 180,
      height: 96,
      fill: '#2563eb',
    }],
  },
})

await engine.renderFrame()`,
        demoCaption: 'The canvas preview shows the initial scene becoming rendered pixels after the engine is created.',
      },
      {
        id: 'engine-options',
        title: 'EngineCreateOptions',
        signature: 'EngineCreateOptions',
        summary: 'Defines the initial canvas, scene, rendering quality, culling, LOD, and backend behavior for an engine instance.',
        readableDescription: 'Treat options as the engine instance initializer. It should be explicit enough that a user can understand which behaviors are enabled before the first frame is rendered.',
        properties: [
          'canvas: HTMLCanvasElement',
          'initialScene.revision: number',
          'initialScene.width / height: number',
          'initialScene.nodes: EngineSceneNode[]',
          'render.quality?: full | draft',
          'culling?: boolean',
          'lod.enabled?: boolean',
        ],
        demo: `const engine = createEngine({
  canvas,
  initialScene,
  culling: true,
  lod: {enabled: false},
  render: {
    quality: 'full',
    webglAntialias: true,
  },
})`,
        demoCaption: 'The canvas preview lists the initialization fields that shape the engine instance.',
      },
      {
        id: 'render-frame',
        title: 'renderFrame',
        signature: 'engine.renderFrame(): Promise<void>',
        summary: 'Renders the current document scene through the configured backend.',
        readableDescription: 'Call this after scene or viewport changes. It is the method that turns the current model state into visible pixels without exposing renderer internals to the app.',
        properties: [
          'Uses the current viewport',
          'Uses the current scene revision',
          'Updates diagnostics after rendering',
        ],
        demo: `engine.loadScene(nextScene)
engine.setViewport({
  viewportWidth: 800,
  viewportHeight: 480,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
})

await engine.renderFrame()`,
        demoCaption: 'The canvas preview shows the render pipeline moving scene data into the visible output area.',
      },
    ],
  },
  {
    id: 'document-objects',
    title: 'Document Objects',
    summary: 'Core scene nodes that must render, hit-test, cache geometry, and stay backend-independent.',
    apis: [
      {
        id: 'rect',
        title: 'Rectangle Shape',
        signature: "EngineShapeNode & {shape: 'rect'}",
        summary: 'Draws a rectangle with optional rounded corners, fill, stroke, transforms, opacity, and cached bounds.',
        readableDescription: 'Use rectangles for panels, cards, boxes, and selection backgrounds. Hit testing should consider fill, stroke width, corner radius, rotation, and the transformed AABB.',
        properties: [
          'id: string',
          'type: shape',
          'shape: rect',
          'x, y, width, height: number',
          'cornerRadius?: number',
          'fill?: string',
          'stroke?: string',
          'strokeWidth?: number',
          'opacity?: number',
          'rotation?: number',
        ],
        demo: `engine.loadScene({
  revision: 2,
  width: 420,
  height: 260,
  nodes: [{
    id: 'rounded-card',
    type: 'shape',
    shape: 'rect',
    x: 48,
    y: 40,
    width: 220,
    height: 120,
    cornerRadius: 16,
    fill: '#0f766e',
    stroke: '#5eead4',
    strokeWidth: 3,
  }],
})`,
        demoCaption: 'The canvas preview shows a rounded rectangle with fill and stroke.',
      },
      {
        id: 'ellipse',
        title: 'Ellipse Shape',
        signature: "EngineShapeNode & {shape: 'ellipse'}",
        summary: 'Draws an ellipse using bounding-box geometry with fill, stroke, opacity, and transform support.',
        readableDescription: 'Use ellipses for nodes, avatars, handles, and pill-like graphics. The bounding box is rectangular, but hit testing must use the curved geometry when possible.',
        properties: [
          'id: string',
          'type: shape',
          'shape: ellipse',
          'x, y, width, height: number',
          'fill?: string',
          'stroke?: string',
          'strokeWidth?: number',
          'opacity?: number',
          'rotation?: number',
        ],
        demo: `engine.loadScene({
  revision: 3,
  width: 420,
  height: 260,
  nodes: [{
    id: 'status-node',
    type: 'shape',
    shape: 'ellipse',
    x: 96,
    y: 56,
    width: 180,
    height: 116,
    fill: '#7c2d12',
    stroke: '#fdba74',
    strokeWidth: 4,
  }],
})`,
        demoCaption: 'The canvas preview shows the ellipse geometry inside its logical bounds.',
      },
      {
        id: 'line',
        title: 'Line Shape',
        signature: "EngineShapeNode & {shape: 'line'}",
        summary: 'Draws an open segment and hit-tests its stroke-expanded geometry instead of fill.',
        readableDescription: 'Use lines for connectors and guides. Because the shape is open, click and hover should be based on the stroke-expanded segment rather than a filled area.',
        properties: [
          'id: string',
          'type: shape',
          'shape: line',
          'x, y, width, height: number',
          'stroke: string',
          'strokeWidth?: number',
          'opacity?: number',
          'rotation?: number',
        ],
        demo: `engine.loadScene({
  revision: 4,
  width: 420,
  height: 260,
  nodes: [{
    id: 'connector',
    type: 'shape',
    shape: 'line',
    x: 64,
    y: 72,
    width: 240,
    height: 96,
    stroke: '#e2e8f0',
    strokeWidth: 8,
  }],
})`,
        demoCaption: 'The canvas preview shows a thick line whose stroke area is the interactive area.',
      },
      {
        id: 'text',
        title: 'Text Node',
        signature: 'EngineTextNode',
        summary: 'Draws text with explicit style properties and measured bounds for picking and layout.',
        readableDescription: 'Use text nodes for labels and annotations. The engine should expose enough text metrics for selection boxes, layout alignment, and predictable hit testing.',
        properties: [
          'id: string',
          'type: text',
          'x, y: number',
          'text: string',
          'style.fontFamily?: string',
          'style.fontSize?: number',
          'style.fontWeight?: number',
          'style.fill?: string',
          'opacity?: number',
        ],
        demo: `engine.loadScene({
  revision: 5,
  width: 420,
  height: 260,
  nodes: [{
    id: 'label',
    type: 'text',
    x: 48,
    y: 88,
    text: 'Text renders through the engine',
    style: {
      fontFamily: 'IBM Plex Sans',
      fontSize: 24,
      fontWeight: 700,
      fill: '#f8fafc',
    },
  }],
})`,
        demoCaption: 'The canvas preview shows text with its measured bounds.',
      },
    ],
  },
  {
    id: 'interaction',
    title: 'Hit Testing',
    summary: 'Pointer queries split hover and clicked states while preserving AABB, geometry, stroke, and closed-shape detail.',
    apis: [
      {
        id: 'hover-hit',
        title: 'Hover Hit Test',
        signature: "engine.hitTest(point, {phase: 'hover'})",
        summary: 'Runs a non-committing pointer query for preview UI, cursor changes, and hover panels.',
        readableDescription: 'Use hover hit testing for temporary feedback. It should not commit selection state, but it must still explain which object is under the pointer.',
        properties: [
          'point.x, point.y: world coordinates',
          'phase: hover',
          'returns target node id',
          'includes candidate rejection reasons',
        ],
        demo: `canvas.addEventListener('pointermove', (event) => {
  const worldPoint = engine.toWorldPoint(event)
  const hover = engine.hitTest(worldPoint, {phase: 'hover'})

  hoverPanel.textContent = hover?.targetId ?? 'none'
})`,
        demoCaption: 'The canvas preview marks the object currently under the hover point.',
      },
      {
        id: 'clicked-hit',
        title: 'Clicked Hit Test',
        signature: "engine.hitTest(point, {phase: 'clicked'})",
        summary: 'Runs a click query for selection, command routing, and persistent interaction state.',
        readableDescription: 'Use clicked hit testing for committed interactions such as selection or command routing. It stays separate from hover so UI feedback and selection do not fight each other.',
        properties: [
          'point.x, point.y: world coordinates',
          'phase: clicked',
          'uses topmost eligible target',
          'keeps hover result independent',
        ],
        demo: `canvas.addEventListener('click', (event) => {
  const worldPoint = engine.toWorldPoint(event)
  const clicked = engine.hitTest(worldPoint, {phase: 'clicked'})

  selectionPanel.textContent = clicked?.targetId ?? 'none'
})`,
        demoCaption: 'The canvas preview marks the object selected by a clicked point.',
      },
    ],
  },
  {
    id: 'geometry-cache',
    title: 'Geometry Cache',
    summary: 'Geometry and bounds data live outside render backends so Canvas2D, WebGL, and future backends stay replaceable.',
    apis: [
      {
        id: 'bounds-cache',
        title: 'World Bounds',
        signature: 'engine.getGeometryCache().getWorldBounds(nodeId)',
        summary: 'Returns cached world-space bounds for render culling, picking, overlays, and diagnostics.',
        readableDescription: 'Use world bounds when overlays, culling, or diagnostics need stable geometry without asking a renderer backend to recalculate it.',
        properties: [
          'nodeId: string',
          'returns x, y, width, height',
          'invalidates when node revision changes',
          'does not call renderer APIs',
        ],
        demo: `const bounds = engine.getGeometryCache().getWorldBounds('rounded-card')

overlay.style.left = bounds.x + 'px'
overlay.style.top = bounds.y + 'px'
overlay.style.width = bounds.width + 'px'
overlay.style.height = bounds.height + 'px'`,
        demoCaption: 'The canvas preview shows rendered geometry plus its cached world-space bounds.',
      },
      {
        id: 'viewport-projection',
        title: 'Viewport Projection',
        signature: 'projectWorldPoint(point) / unprojectScreenPoint(point)',
        summary: 'Converts coordinates between screen and document space for UI overlays and pointer input.',
        readableDescription: 'Use projection APIs whenever pointer events, overlays, or viewport tools need to move between screen coordinates and document coordinates.',
        properties: [
          'world point: document coordinates',
          'screen point: viewport coordinates',
          'applies scale and offset',
          'stays renderer-independent',
        ],
        demo: `const worldPoint = engine.unprojectScreenPoint({
  x: event.clientX,
  y: event.clientY,
})

const screenPoint = engine.projectWorldPoint({
  x: 120,
  y: 80,
})`,
        demoCaption: 'The canvas preview shows a point moving between world and screen coordinate spaces.',
      },
    ],
  },
]
