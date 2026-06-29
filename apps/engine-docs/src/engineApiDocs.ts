export interface EngineApiParameter {
  name: string
  type: string
  defaultValue?: string
  description: string
}

export interface EngineApiMethod {
  name: string
  description: string
  parameters?: EngineApiParameter[]
}

export interface EngineApiPropertyGroup {
  title: string
  properties: string[]
}

export interface EngineApiDoc {
  id: string
  title: string
  summary: string
  readableDescription: string
  parameters?: EngineApiParameter[]
  properties?: string[]
  propertyGroups?: EngineApiPropertyGroup[]
  methods?: EngineApiMethod[]
  demo: string
  demoCaption: string
}

export interface EngineApiCategory {
  id: string
  title: string
  summary: string
  apis: EngineApiDoc[]
}

const propertyGroupTitles = [
  'Identity',
  'Transform',
  'Appearance',
  'Effects',
  'Type Specific',
] as const

const classifyPropertyGroup = (property: string): (typeof propertyGroupTitles)[number] => {
  const name = property.split(':')[0].split('?')[0]

  if (['type', 'id', 'name', 'visible', 'locked'].includes(name)) {
    return 'Identity'
  }

  if (['transform', 'rotation', 'x', 'y', 'width', 'height'].includes(name)) {
    return 'Transform'
  }

  if (['appearance', 'blendMode', 'fill', 'fills', 'stroke', 'strokes', 'strokeWidth', 'strokeAlign', 'strokeDashArray', 'opacity'].includes(name)) {
    return 'Appearance'
  }

  if (['shadow', 'innerShadow', 'layerBlur'].includes(name)) {
    return 'Effects'
  }

  return 'Type Specific'
}

const createPropertyGroups = (properties: string[]): EngineApiPropertyGroup[] => {
  return propertyGroupTitles
    .map((title) => ({
      title,
      properties: properties.filter((property) => classifyPropertyGroup(property) === title),
    }))
    .filter((group) => group.properties.length > 0)
}

const withGroupedProperties = (categories: EngineApiCategory[]): EngineApiCategory[] => {
  return categories.map((category) => ({
    ...category,
    apis: category.apis.map((api) => ({
      ...api,
      propertyGroups: api.propertyGroups ?? (api.properties ? createPropertyGroups(api.properties) : undefined),
    })),
  }))
}

const rawEngineApiCategories: EngineApiCategory[] = [
  {
    id: 'start',
    title: 'Start',
    summary: 'Create a Venus instance, mount a canvas, add one object, and render it.',
    apis: [
      {
        id: 'new-venus',
        title: 'Create and render',
        summary: 'The smallest working path is constructor, mount, add, render.',
        readableDescription: 'Start stays tiny. Import Venus, create one instance, mount a canvas, add one document object with venus.add, and render the scene. Constructor tuning and method details appear after this first path.',
        parameters: [
          {name: 'canvas', type: 'HTMLCanvasElement', description: 'The canvas element Venus renders into.'},
          {name: 'node', type: 'VenusNode', description: 'The first document object to add to the scene.'},
        ],
        demo: `import {Venus} from '@venus/engine'

const venus = new Venus()
venus.mount(document.querySelector('canvas')!)
venus.add({
  type: 'rect',
  x: 40,
  y: 32,
  width: 180,
  height: 96,
  fill: '#2563eb',
})

await venus.render()`,
        demoCaption: 'The preview shows the smallest flow: construct, mount, add a rectangle, render.',
      },
    ],
  },
  {
    id: 'base-modules',
    title: 'Base and Modules',
    summary: 'Start from the base runtime and add short capability modules when needed.',
    apis: [
      {
        id: 'base-entry',
        title: 'Base entry',
        summary: '@venus/engine/base exposes the minimal Venus runtime and constructor-time module contract.',
        readableDescription: 'Use the base entry when package size and explicit capability boundaries matter. Add modules per instance instead of using a global registry.',
        parameters: [
          {name: 'modules', type: 'readonly VenusModule[]', defaultValue: '[]', description: 'Capability modules installed once during Venus construction.'},
        ],
        properties: [
          'VENUS_MODULE_NAMES: render|camera|hitTest|select|snap|animate|debug|scale|effects|history|export',
          'VENUS_INTERNAL_SERVICE_NAMES: document|sceneStore|geometry|spatial|geometryCache|invalidation|viewport|renderPlan|scheduler|resource|backendBridge',
          'registered services: document, viewport, invalidation',
          'VenusRegisteredServiceMap: typed get() contracts for registered services',
          'venus.inspect().modules: installed modules and last install error',
        ],
        methods: [
          {
            name: 'createVenus',
            description: 'Creates a Venus base runtime with optional capability modules.',
            parameters: [
              {name: 'parameters', type: 'VenusParameters', defaultValue: '{}', description: 'Runtime options including optional modules.'},
            ],
          },
          {
            name: 'defineVenusModule',
            description: 'Defines one capability module and validates that it uses a reserved short name.',
            parameters: [
              {name: 'module', type: 'VenusModule', description: 'Module object with name, optional dependsOn, optional requires, and install callback.'},
            ],
          },
          {
            name: 'venus.modules',
            description: 'Returns installed capability module names for this instance.',
          },
        ],
        demo: `import {createVenus, defineVenusModule} from '@venus/engine/base'

const debugNames = defineVenusModule({
  name: 'debug',
  dependsOn: [],
  requires: ['document'],
  install({venus, services}) {
    const document = services.require('document')
    venus.on('render:after', () => console.log(venus.modules()))
    venus.on('render:after', () => console.log(document.bounds()))
  },
})

const venus = createVenus({
  modules: [debugNames],
})

venus.mount(document.querySelector('canvas')!)
venus.add({type: 'rect', x: 72, y: 56, width: 160, height: 96})
await venus.render()`,
        demoCaption: 'The preview uses the base entry with no optional capability modules installed.',
      },
      {
        id: 'module-services',
        title: 'Module services',
        summary: 'Read typed internal services from a module without importing private engine files.',
        readableDescription: 'Registered service names are typed through VenusRegisteredServiceMap. Use get() for optional services and require() when the module cannot operate without a service. Use dependsOn for user-module dependencies, and requires on the module definition to fail before install runs. Returned service objects are stable shallow-frozen facades.',
        properties: [
          'module.dependsOn?: VenusModuleName[]',
          'module.requires?: VenusInternalServiceName[]',
          'services.get("document"): VenusDocumentService | null',
          'services.get("viewport"): VenusViewportService | null',
          'services.get("invalidation"): VenusInvalidationService | null',
          'services.require("viewport"): VenusViewportService',
          'services.require("invalidation"): VenusInvalidationService',
          'services.get("geometryCache"): unknown | null until registered',
        ],
        demo: `const module = defineVenusModule({
  name: 'debug',
  requires: ['invalidation'],
  install({services}) {
    const document = services.get('document')
    const invalidation = services.require('invalidation')
    console.log(document?.bounds())
    console.log(invalidation.classify(['appearance.fills']))
  },
})`,
        demoCaption: 'Registered services are typed; planned services remain nullable.',
      },
    ],
  },
  {
    id: 'document-models',
    title: 'Document Models',
    summary: 'Each document object has its own API page and an editable canvas demo.',
    apis: [
      {
        id: 'rect-node',
        title: 'Rect',
        summary: 'Draws a rectangle or rounded rectangle.',
        readableDescription: 'Rect is the simplest filled shape. Use it for panels, cards, boxes, handles, and rectangular hit regions. Rounded corners are controlled by cornerRadius.',
        properties: ['type: rect', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number', 'height: number', 'fill?: string', 'fills?: VenusPaint[] as ordered paint list (preferred over fill)', 'stroke?: string', 'strokes?: VenusPaint[] as ordered paint list (preferred over stroke)', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'opacity?: number', 'shadow?: EngineShadow', 'cornerRadius?: number', 'cornerRadii?: topLeft, topRight, bottomRight, bottomLeft'],
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132})`,
        demoCaption: 'The preview renders a rounded rectangle with editable fill, stroke, size, and radius.',
      },
      {
        id: 'ellipse-node',
        title: 'Ellipse',
        summary: 'Draws an ellipse inside a rectangular bounds box.',
        readableDescription: 'Ellipse uses the same x, y, width, and height box model as rect. Hit testing uses ellipse geometry rather than only its AABB.',
        properties: ['type: ellipse', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number', 'height: number', 'fill?: string', 'fills?: VenusPaint[] as ordered paint list (preferred over fill)', 'stroke?: string', 'strokes?: VenusPaint[] as ordered paint list (preferred over stroke)', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'opacity?: number', 'shadow?: EngineShadow', 'ellipseStartAngle?: number', 'ellipseEndAngle?: number'],
        demo: `venus.add({type: 'ellipse', x: 96, y: 64, width: 240, height: 140})`,
        demoCaption: 'The preview renders an ellipse whose bounds, fill, and stroke are editable.',
      },
      {
        id: 'line-node',
        title: 'Line',
        summary: 'Draws a stroked line segment.',
        readableDescription: 'Line is stroke-first. The width and height fields describe the segment delta from x/y, and hit testing expands by strokeWidth plus pointer tolerance.',
        properties: ['type: line', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number as endX - startX', 'height: number as endY - startY', 'stroke?: string', 'strokes?: VenusPaint[] as ordered paint list (preferred over stroke)', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'line', x: 72, y: 92, width: 300, height: 120})`,
        demoCaption: 'The preview renders a line segment with editable position, delta, and stroke.',
      },
      {
        id: 'text-node',
        title: 'Text',
        summary: 'Draws plain text with basic typography controls.',
        readableDescription: 'Text is a document object, not a canvas label. It has its own position, content, fill color, and typography fields so editors can select, inspect, and serialize it.',
        properties: ['type: text', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width?: number', 'height?: number', 'text: string with line breaks', 'runs?: EngineTextRun[] for selected-range styling', 'fill?: string', 'fills?: VenusPaint[] as ordered paint list (preferred over fill)', 'fontSize?: number', 'fontWeight?: number', 'lineHeight?: number', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'text', x: 80, y: 150, text: 'Venus Text'})`,
        demoCaption: 'The preview renders editable text content, color, size, and weight.',
      },
      {
        id: 'group-node',
        title: 'Group',
        summary: 'Groups children so they can move, render, and hit-test as a composed subtree.',
        readableDescription: 'Groups are scene tree containers. The group stores its own transform, children stay as nested VenusNode objects with stable ids, and Venus keeps an internal id index for lookup. Child coordinates remain group-local; rendering, hit testing, and geometry cache compose parent-to-child matrices in tree order.',
        properties: ['type: group', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number as legacy parent translateX', 'y?: number as legacy parent translateY', 'opacity?: number applied to the subtree', 'shadow?: EngineShadow', 'children: VenusNode[] as nested scene tree objects with stable ids in group-local coordinates'],
        demo: `venus.add({type: 'group', x: 32, y: 24, children: [...]})`,
        demoCaption: 'The preview moves a group parent while editing child appearance.',
      },
      {
        id: 'clip-node',
        title: 'Clip',
        summary: 'Constrains child rendering to a clip path.',
        readableDescription: 'Clip is group-like composition with a clipPath and nested children. The clip node stores its own transform, clipPath remains an editable child-like shape, and children keep local coordinates inside the clipped subtree.',
        properties: ['type: clip', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'opacity?: number applied to clipped subtree', 'clipPath: rect or ellipse VenusNode in the current facade', 'children: VenusNode[] as nested scene tree objects clipped by clipPath'],
        demo: `venus.add({type: 'clip', clipPath, children})`,
        demoCaption: 'The preview updates the clip path bounds and child colors live.',
      },
      {
        id: 'mask-node',
        title: 'Mask',
        summary: 'Uses mask-like composition for children.',
        readableDescription: 'Mask currently uses the same tree shape as clip: a transformed container with a mask path and nested children. It remains separate so alpha or luminance mask semantics can be added without changing document ownership.',
        properties: ['type: mask', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'opacity?: number applied to masked subtree', 'clipPath: VenusNode currently equivalent to clipPath', 'children: VenusNode[] as nested scene tree objects currently clipped like clip children'],
        demo: `venus.add({type: 'mask', clipPath, children})`,
        demoCaption: 'The preview updates mask-style composition through the current Venus facade.',
      },
      {
        id: 'polygon-node',
        title: 'Polygon',
        summary: 'Draws closed point-list polygon geometry.',
        readableDescription: 'Polygon draws ordered points as a closed shape. Fill and stroke apply when present. The closed flag defaults to true for polygon, so omitted closed values still render closed polygons.',
        properties: ['type: polygon', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number', 'height: number', 'points?: {x: number, y: number}[] as ordered vertices', 'closed?: boolean (defaults to true)', 'fill?: string', 'fills?: VenusPaint[] as ordered paint list (preferred over fill)', 'stroke?: string', 'strokes?: VenusPaint[] as ordered paint list (preferred over stroke)', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'polygon', x: 72, y: 56, width: 220, height: 168, points: [{x: 182, y: 56}, {x: 292, y: 120}, {x: 254, y: 224}, {x: 110, y: 224}, {x: 72, y: 120}], fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 3})`,
        demoCaption: 'The preview renders an editable polygon with fill, stroke, and vertex controls.',
      },
      {
        id: 'path-node',
        title: 'Path',
        summary: 'Draws custom point or bezier path geometry.',
        readableDescription: 'Path supports both straight-line points and bezier curve geometry. Closed and open paths behave differently for fill and hit-test. Arrowheads apply to open paths.',
        properties: ['type: path', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number', 'height: number', 'points?: {x: number, y: number}[] as straight-line vertices', 'bezierPoints?: {anchor: {x,y}, cp1?: {x,y}|null, cp2?: {x,y}|null}[]', 'closed?: boolean', 'strokeStartArrowhead?: none|triangle|diamond|circle|bar', 'strokeEndArrowhead?: none|triangle|diamond|circle|bar', 'fill?: string', 'fills?: VenusPaint[] as ordered paint list (preferred over fill)', 'stroke?: string', 'strokes?: VenusPaint[] as ordered paint list (preferred over stroke)', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'path', x: 64, y: 64, width: 280, height: 180, points: [{x: 64, y: 160}, {x: 200, y: 64}, {x: 344, y: 160}, {x: 200, y: 244}], stroke: '#7c3aed', strokeWidth: 5, closed: true})`,
        demoCaption: 'The preview renders an editable path with bezier, arrowhead, and closure controls.',
      },
      {
        id: 'image-node',
        title: 'Image',
        summary: 'Renders an asset-backed raster image with crop and smoothing controls.',
        readableDescription: 'Image connects an assetId to a renderable quad. The engine resolves the asset through host-provided resource loading. Source cropping and smoothing are renderer hints.',
        properties: ['type: image', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'appearance?: VenusAppearance', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as compatibility transform field', 'x?: number', 'y?: number', 'width: number', 'height: number', 'assetId: string', 'sourceRect?: {x, y, width, height}', 'naturalSize?: {width, height}', 'imageSmoothing?: boolean', 'opacity?: number'],
        demo: `venus.add({type: 'image', x: 80, y: 56, width: 240, height: 160, assetId: 'demo-image'})`,
        demoCaption: 'The preview shows an image placeholder rendered through the engine image node.',
      },
    ],
  },
  {
    id: 'venus-parameters',
    title: 'Venus Parameters',
    summary: 'Constructor settings are optional. Performance features stay off until the app needs them.',
    apis: [
      {
        id: 'constructor-parameters',
        title: 'Venus Parameters',
        summary: 'Configure optional engine capabilities at construction time.',
        readableDescription: 'Constructor parameters live in the method reference instead of the first drawing example. Defaults are conservative: no culling, no LOD, and no special render tuning unless the app opts in.',
        parameters: [
          {name: 'culling', type: 'boolean', defaultValue: 'false', description: 'Skips drawing objects outside the viewport when enabled.'},
          {name: 'lod', type: 'boolean', defaultValue: 'false', description: 'Enables level-of-detail behavior for large or zoomed scenes.'},
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Tries WebGL first and falls back to Canvas2D when initialization fails.'},
          {name: 'render.antialias', type: 'boolean', defaultValue: 'true', description: 'Requests antialiasing from the selected backend.'},
          {name: 'render.quality', type: 'interactive | full', defaultValue: 'full', description: 'Chooses the render quality lane.'},
        ],
        demo: `const venus = new Venus({
  culling: false,
  lod: false,
  render: {
    backend: 'canvas2d',
    antialias: true,
    quality: 'full',
  },
})`,
        demoCaption: 'The preview lists constructor parameters as opt-in rendering choices.',
      },
    ],
  },
  {
    id: 'backend-strategy',
    title: 'Backend Strategy',
    summary: 'WebGL is the primary presentation path; Canvas2D is available for fallback and fidelity rasterization.',
    apis: [
      {
        id: 'render-backends',
        title: 'Render backends',
        summary: 'Select the backend explicitly or let auto mode fall back when WebGL cannot initialize.',
        readableDescription: 'The document model stays backend-neutral. WebGL handles the primary presentation path. Canvas2D can render directly for deterministic pages, or rasterize high-fidelity content that WebGL later composites as a texture.',
        parameters: [
          {name: 'render.backend', type: 'auto | webgl | canvas2d', defaultValue: 'auto', description: 'Auto tries WebGL first, then falls back to Canvas2D when initialization fails.'},
          {name: 'render.antialias', type: 'boolean', defaultValue: 'true', description: 'Requests antialiasing from the selected backend.'},
          {name: 'render.quality', type: 'interactive | full', defaultValue: 'full', description: 'Selects the render quality lane.'},
        ],
        properties: [
          'WebGL packets: large scene presentation, transforms, opacity, texture composition',
          'Canvas2D direct: deterministic docs, tests, fallback rendering',
          'Canvas2D-to-texture: text, shadows, blur, masks, complex paint, image preprocessing',
          'venus.inspect().backendFallback: last automatic WebGL-to-Canvas2D fallback',
          'backend:fallback event: emitted only when auto mode successfully falls back',
        ],
        demo: `const venus = new Venus({
  render: {backend: 'auto'},
})

venus.on('backend:fallback', (event) => {
  console.log(event.from, event.to, event.reason)
})

venus.mount(document.querySelector('canvas')!)
venus.add({type: 'rect', x: 72, y: 56, width: 180, height: 96})
await venus.render()

console.log(venus.inspect().backendFallback)`,
        demoCaption: 'The preview renders with a deterministic Canvas2D docs backend while the API describes production backend selection.',
      },
      {
        id: 'animation-invalidation',
        title: 'Animation invalidation',
        summary: 'Animation mutates document properties; invalidation chooses the cheapest render path.',
        readableDescription: 'Animation never calls WebGL or Canvas2D directly. It updates backend-neutral node fields, classifies the mutation, and lets render scheduling decide whether to reuse geometry, reuse texture, rerasterize fidelity content, or rebuild geometry.',
        parameters: [
          {name: 'transform changes', type: 'x | y | rotation | scale | skew', description: 'Reuse geometry or cached texture and update matrices or packets.'},
          {name: 'composite changes', type: 'opacity | blendMode', description: 'Reuse geometry or texture and update composition state.'},
          {name: 'paint/effect changes', type: 'fill | stroke | shadow | blur | mask', description: 'Rebuild packets or rerasterize a Canvas2D fidelity texture.'},
          {name: 'geometry/content changes', type: 'size | points | path | text', description: 'Rebuild bounds, geometry, hit data, and affected caches.'},
        ],
        demo: `venus.animate('card', [
  {x: 72, rotation: 0},
  {x: 220, rotation: 18},
], {duration: 600, easing: 'easeOut'})`,
        demoCaption: 'The preview uses transform animation, which reuses geometry rather than rerasterizing paint every frame.',
      },
    ],
  },
  {
    id: 'methods',
    title: 'Methods',
    summary: 'All instance methods, flat with no namespace prefixes.',
    apis: [
      {
        id: 'add',
        title: 'add',
        summary: 'Adds one document node and returns the engine-facing render node.',
        readableDescription: 'Call add after mount. Accepts any supported VenusNode type. Returns the engine node used by rendering, hit testing, events, and diagnostics.',
        parameters: [
          {name: 'node', type: 'VenusNode', description: 'Document node to append to the current scene.'},
        ],
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132, fill: '#dbeafe'})`,
        demoCaption: 'Adds a rectangle and returns the engine render node.',
      },
      {
        id: 'bounds',
        title: 'bounds',
        summary: 'Returns the union bounding box of all document nodes.',
        readableDescription: 'Computes the axis-aligned bounding box that encloses every root-level node. Useful for fitting the viewport or computing document dimensions.',
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132})\nconst box = venus.bounds()\n// {x: 64, y: 48, width: 220, height: 132}`,
        demoCaption: 'Returns the document bounding box.',
      },
      {
        id: 'children',
        title: 'children',
        summary: 'Returns all root-level document nodes.',
        readableDescription: 'Returns the current top-level node list. Nested children inside groups, clips, and masks are not flattened.',
        demo: `const roots = venus.children()\n// VenusNode[]`,
        demoCaption: 'Returns root-level nodes without flattening nested subtrees.',
      },
      {
        id: 'getNodeById',
        title: 'getNodeById',
        summary: 'Looks up a document node by its stable id.',
        readableDescription: 'Venus maintains an internal id index across groups, clips, and masks. Returns null when the id is not found.',
        parameters: [
          {name: 'id', type: 'string', description: 'Stable node id to look up.'},
        ],
        demo: `venus.add({id: 'card', type: 'rect', width: 160, height: 96})\nconst node = venus.getNodeById('card')`,
        demoCaption: 'Returns the node with matching id, or null.',
      },
      {
        id: 'getParentId',
        title: 'getParentId',
        summary: 'Returns the parent node id for a nested node.',
        readableDescription: 'For nodes inside groups, clips, or masks, returns the container id. Root nodes return null.',
        parameters: [
          {name: 'id', type: 'string', description: 'Child node id.'},
        ],
        demo: `const parentId = venus.getParentId('rect-1')\n// string | null`,
        demoCaption: 'Returns the parent container id, or null for root nodes.',
      },
      {
        id: 'snapshot',
        title: 'snapshot',
        summary: 'Returns a render-facing scene snapshot for the current document.',
        readableDescription: 'Produces an EngineSceneSnapshot suitable for serialization, cache key derivation, or feeding into the lower-level engine API.',
        demo: `const snap = venus.snapshot()\nconsole.log(snap.revision, snap.nodes.length)`,
        demoCaption: 'Returns the current scene as an engine snapshot.',
      },
      {
        id: 'fitBounds',
        title: 'fitBounds',
        summary: 'Fits the given document-space bounds into the viewport.',
        readableDescription: 'Computes scale and offset so the target bounds fill the canvas. Optional padding adds breathing room.',
        parameters: [
          {name: 'bounds', type: '{x, y, width, height}', description: 'Document-space bounds to fit.'},
          {name: 'padding', type: 'number | {top, right, bottom, left}', defaultValue: '0', description: 'Optional viewport padding.'},
        ],
        demo: `venus.fitBounds(venus.bounds(), 32)`,
        demoCaption: 'Fits document bounds into the viewport with 32px padding.',
      },
      {
        id: 'zoomTo',
        title: 'zoomTo',
        summary: 'Sets the viewport scale around an optional screen anchor.',
        readableDescription: 'Changes the zoom level without modifying document geometry. The anchor point stays fixed on screen during the zoom.',
        parameters: [
          {name: 'scale', type: 'number', description: 'Target zoom scale.'},
          {name: 'anchor', type: '{x, y}', description: 'Optional screen anchor point.'},
        ],
        demo: `venus.zoomTo(2.0, {x: 200, y: 150})`,
        demoCaption: 'Zooms to 2x around the center of the canvas.',
      },
      {
        id: 'panBy',
        title: 'panBy',
        summary: 'Moves the viewport by a screen-space delta.',
        readableDescription: 'Shifts the visible area without changing document coordinates. Positive x moves the viewport right (content appears to move left).',
        parameters: [
          {name: 'delta', type: '{x, y}', description: 'Screen-space movement amount.'},
        ],
        demo: `venus.panBy({x: 50, y: -30})`,
        demoCaption: 'Pans the viewport right 50 and up 30.',
      },
      {
        id: 'project',
        title: 'project',
        summary: 'Converts a document-space point to screen coordinates.',
        readableDescription: 'Applies the current camera transform to map a document coordinate to its screen pixel position.',
        parameters: [
          {name: 'point', type: '{x, y}', description: 'Document-space coordinate.'},
        ],
        demo: `const screen = venus.project({x: 260, y: 160})\n// {x: number, y: number}`,
        demoCaption: 'Converts document coordinates to screen space.',
      },
      {
        id: 'unproject',
        title: 'unproject',
        summary: 'Converts a screen-space point back to document coordinates.',
        readableDescription: 'Inverse of project. Maps a pixel position on the canvas back to document space, accounting for zoom and pan.',
        parameters: [
          {name: 'point', type: '{x, y}', description: 'Screen-space coordinate.'},
        ],
        demo: `const doc = venus.unproject({x: 200, y: 150})\n// {x: number, y: number}`,
        demoCaption: 'Converts screen coordinates back to document space.',
      },
      {
        id: 'enableDebug',
        title: 'enableDebug',
        summary: 'Enables selected diagnostics and returns the active flags.',
        readableDescription: 'Turns on engine overlay visualizations for bounds and hit-test candidates. Returns current debug configuration.',
        parameters: [
          {name: 'options.showBounds', type: 'boolean', defaultValue: 'false', description: 'Draws geometry bounds overlays.'},
          {name: 'options.showHitCandidates', type: 'boolean', defaultValue: 'false', description: 'Displays hit-test candidates.'},
          {name: 'options.showCache', type: 'boolean', defaultValue: 'false', description: 'Includes normalized cache diagnostics in inspect().cache.'},
        ],
        demo: `venus.enableDebug({showBounds: true})`,
        demoCaption: 'Enables bounds overlays for visual debugging.',
      },
      {
        id: 'inspect',
        title: 'inspect',
        summary: 'Returns current Venus and engine diagnostics snapshot.',
        readableDescription: 'Collects revision, mount state, module diagnostics, debug flags, viewport state, cache diagnostics, backend fallback diagnostics, last frame timing, and mounted engine diagnostics into a structured object.',
        demo: `const diag = venus.inspect()\n// VenusRuntimeInspection`,
        demoCaption: 'Returns engine diagnostics for inspection.',
      },
      {
        id: 'measureFrame',
        title: 'measureFrame',
        summary: 'Profiles the next render frame and returns timing data.',
        readableDescription: 'Triggers a render frame with instrumentation enabled and reports the frame time in milliseconds.',
        demo: `const timing = await venus.measureFrame()\n// VenusFrameMeasurement | null`,
        demoCaption: 'Profiles the next frame and reports timing.',
      },
      {
        id: 'mount',
        title: 'mount',
        summary: 'Mounts the engine onto an HTML canvas element.',
        readableDescription: 'Binds Venus to a canvas, creates the internal engine instance, initialises the render backend, and loads the initial scene snapshot.',
        parameters: [
          {name: 'canvas', type: 'HTMLCanvasElement', description: 'The canvas element to render into.'},
        ],
        demo: `venus.mount(document.querySelector('canvas')!)\nvenus.add({type: 'rect', width: 200, height: 120})\nawait venus.render()`,
        demoCaption: 'Mounts the engine onto a canvas and renders the first frame.',
      },
      {
        id: 'resize',
        title: 'resize',
        summary: 'Resizes the canvas output and updates viewport dimensions.',
        readableDescription: 'Sets the canvas pixel buffer size (accounting for device pixel ratio) and updates the internal viewport so the scene renders at the new size.',
        parameters: [
          {name: 'size.width', type: 'number', description: 'New logical width.'},
          {name: 'size.height', type: 'number', description: 'New logical height.'},
        ],
        demo: `venus.resize({width: 800, height: 600})\nawait venus.render()`,
        demoCaption: 'Resizes the viewport and re-renders.',
      },
      {
        id: 'render',
        title: 'render',
        summary: 'Renders the current scene to the mounted canvas.',
        readableDescription: 'Takes the current document state, builds an engine scene snapshot, and executes one render frame. Emits render:before and render:after events.',
        demo: `venus.add({type: 'rect', width: 160, height: 96})\nawait venus.render()`,
        demoCaption: 'Renders the current document to the canvas.',
      },
      {
        id: 'hitTest',
        title: 'hitTest',
        summary: 'Finds the topmost document node under a point.',
        readableDescription: 'Tests a screen-space point against the scene, respecting node order, transforms, and visibility. Returns the hit result with node identity and hit metadata.',
        parameters: [
          {name: 'point', type: '{x, y}', description: 'Point to test in screen space.'},
          {name: 'options.phase', type: 'hover | click', defaultValue: 'click', description: 'Sets the default tolerance for pointer hover or committed click selection.'},
          {name: 'options.tolerance', type: 'number', defaultValue: '0 for click, 6 for hover', description: 'Screen-pixel tolerance used by stroke, line, and path hit testing.'},
          {name: 'options.includeLocked', type: 'boolean', defaultValue: 'false', description: 'When false, locked hits are skipped and the next eligible hit is returned.'},
        ],
        demo: `const hit = venus.hitTest({x: 200, y: 150}, {phase: 'click'})`,
        demoCaption: 'Returns the topmost node under the given point.',
      },
      {
        id: 'on',
        title: 'on',
        summary: 'Subscribes to a Venus lifecycle or interaction event.',
        readableDescription: 'Registers a handler for events like mounted, document:changed, backend:fallback, render:after, hit, and destroyed. Returns an unsubscribe function.',
        parameters: [
          {name: 'eventName', type: 'VenusEventName', description: 'Event channel to subscribe to.'},
          {name: 'handler', type: '(event) => void', description: 'Callback invoked when the event fires.'},
        ],
        demo: `const off = venus.on('render:after', () => console.log('frame done'))\n// later: off()`,
        demoCaption: 'Subscribes to render:after and returns an unsubscribe function.',
      },
      {
        id: 'off',
        title: 'off',
        summary: 'Removes a previously registered event handler.',
        readableDescription: 'Unsubscribes a specific handler from an event channel. Use the returned function from on() as the preferred way to unsubscribe.',
        parameters: [
          {name: 'eventName', type: 'VenusEventName', description: 'Event channel to unsubscribe from.'},
          {name: 'handler', type: '(event) => void', description: 'The same function reference passed to on().'},
        ],
        demo: `const handler = () => {}\nvenus.on('hit', handler)\nvenus.off('hit', handler)`,
        demoCaption: 'Removes a specific handler from the hit event channel.',
      },
      {
        id: 'modules',
        title: 'modules',
        summary: 'Returns installed capability module names.',
        readableDescription: 'Reports the short user capability modules installed on this Venus instance.',
        demo: `const installed = venus.modules()\n// ['camera', 'hitTest']`,
        demoCaption: 'Returns module names installed during construction.',
      },
      {
        id: 'animate',
        title: 'animate',
        summary: 'Returns an animation controller for property transitions.',
        readableDescription: 'Animates numeric document properties on a node id. The minimal runtime supports x, y, opacity, and rotation, then rebuilds the scene and schedules rendering during the animation.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Document node id to animate.'},
          {name: 'keyframes', type: '[VenusAnimationKeyframe, VenusAnimationKeyframe]', description: 'Start and end property snapshots.'},
          {name: 'options.duration', type: 'number', defaultValue: '300', description: 'Animation duration in milliseconds.'},
          {name: 'options.easing', type: 'linear | easeIn | easeOut | easeInOut', defaultValue: 'linear', description: 'Timing curve.'},
        ],
        demo: `const anim = venus.animate('card', [{x: 40}, {x: 220}], {duration: 600})\nanim.cancel()`,
        demoCaption: 'Returns an animation controller.',
      },
      {
        id: 'destroy',
        title: 'destroy',
        summary: 'Disposes the engine instance and releases all resources.',
        readableDescription: 'Cleans up the internal engine, removes canvas binding, clears event listeners, and emits the destroyed event. Call when the host component unmounts.',
        demo: `venus.destroy()`,
        demoCaption: 'Releases all engine resources.',
      },
    ],
  },
  {
    id: 'hittest',
    title: 'Hit Test',
    summary: 'Separate hover and click while respecting AABB, stroke, fill, transforms, closed geometry, group, clip, and mask.',
    apis: [
      {
        id: 'hit-test',
        title: 'hitTest',
        summary: 'Finds the topmost document object under a point.',
        readableDescription: 'Hit testing resolves the topmost visible node at a screen-space point. The demo keeps hover and clicked results in separate panels while calling `venus.hitTest(point, options)` with phase-specific defaults.',
        parameters: [
          {name: 'point', type: '{x: number, y: number}', description: 'Point to test in the current interaction coordinate space.'},
          {name: 'options.phase', type: 'hover | click', defaultValue: 'click', description: 'Hover defaults to a wider tolerance; click defaults to exact selection.'},
          {name: 'options.tolerance', type: 'number', defaultValue: '0 for click, 6 for hover', description: 'Overrides the phase default.'},
          {name: 'options.includeLocked', type: 'boolean', defaultValue: 'false', description: 'Returns locked hits only when enabled; otherwise they are skipped.'},
        ],
        demo: `const hover = venus.hitTest(pointer, {phase: 'hover'})
const clicked = venus.hitTest(pointer, {phase: 'click'})`,
        demoCaption: 'The preview separates hover feedback from clicked selection.',
      },
    ],
  },
  {
    id: 'camera',
    title: 'Camera',
    summary: 'Move between document coordinates and screen coordinates with pan, zoom, fit, and projection methods.',
    apis: [
      {
        id: 'camera-controls',
        title: 'Camera Controls',
        summary: 'Controls the viewport without changing document geometry.',
        readableDescription: 'Camera APIs are separate from object transforms. A rectangle keeps the same document position; the camera projects that document space into the canvas.',
        methods: [
          {name: 'venus.zoomTo', description: 'Sets the viewport scale around an optional anchor point.', parameters: [{name: 'scale', type: 'number', description: 'Target zoom scale.'}, {name: 'anchor', type: '{x: number, y: number}', description: 'Optional screen anchor.'}]},
          {name: 'venus.panBy', description: 'Moves the viewport without moving document objects.', parameters: [{name: 'delta', type: '{x: number, y: number}', description: 'Screen-space movement in pixels.'}]},
          {name: 'venus.fitBounds', description: 'Fits document bounds into the viewport.', parameters: [{name: 'bounds', type: 'AABB', description: 'Document-space bounds to fit.'}, {name: 'padding', type: 'number | {top, right, bottom, left}', defaultValue: '0', description: 'Optional viewport padding.'}]},
          {name: 'venus.project', description: 'Converts document coordinates to screen coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Document-space point.'}]},
          {name: 'venus.unproject', description: 'Converts screen coordinates back to document coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Screen-space point.'}]},
        ],
        demo: `venus.fitBounds(venus.bounds(), 32)`,
        demoCaption: 'The preview shows document space projected through a camera viewport.',
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance Settings',
    summary: 'Turn on heavier features only after the app needs them.',
    apis: [
      {
        id: 'performance-options',
        title: 'Culling, LOD, and Render Options',
        summary: 'Configures renderer behavior for large scenes and high-frequency interactions.',
        readableDescription: 'Performance flags are not part of the minimal path. Each flag changes how much work the engine does per frame, so tune them after the document model is working.',
        parameters: [
          {name: 'culling', type: 'boolean', defaultValue: 'false', description: 'Skips offscreen objects when enabled.'},
          {name: 'lod', type: 'boolean', defaultValue: 'false', description: 'Enables level-of-detail behavior.'},
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Renderer backend selection. Auto tries WebGL first and falls back to Canvas2D if initialization fails.'},
          {name: 'render.antialias', type: 'boolean', defaultValue: 'true', description: 'Backend antialiasing preference.'},
          {name: 'render.quality', type: 'interactive | full', defaultValue: 'full', description: 'Render quality lane.'},
        ],
        demo: `const venus = new Venus({culling: true, lod: true})`,
        demoCaption: 'The preview shows optional performance switches layered on top of the default engine.',
      },
    ],
  },
  {
    id: 'animation',
    title: 'Animation',
    summary: 'Give document objects time-based behavior without coupling animation to renderer backends.',
    apis: [
      {
        id: 'animate',
        title: 'animate',
        summary: 'Animates object properties and schedules rendering.',
        readableDescription: 'Animation is an engine ability. It changes model properties over time and lets the engine decide when to render frames.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Document node id to animate.'},
          {name: 'keyframes', type: '[VenusAnimationKeyframe, VenusAnimationKeyframe]', description: 'Start and end snapshots for x, y, opacity, or rotation.'},
          {name: 'options.duration', type: 'number', defaultValue: '300', description: 'Animation duration in milliseconds.'},
          {name: 'options.easing', type: 'linear | easeIn | easeOut | easeInOut', defaultValue: 'linear', description: 'Timing curve.'},
        ],
        methods: [
          {name: 'animation.cancel', description: 'Stops the running animation without applying the final keyframe.'},
          {name: 'animation.pause', description: 'Pauses future animation ticks.'},
          {name: 'animation.play', description: 'Resumes a paused animation.'},
        ],
        demo: `venus.animate('card', [{x: 40}, {x: 220}], {duration: 600})`,
        demoCaption: 'The preview shows a document object moving across frames.',
      },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    summary: 'Observe lifecycle and interaction events without coupling UI code to renderer internals.',
    apis: [
      {
        id: 'event-system',
        title: 'Event System',
        summary: 'Subscribes to internal lifecycle and interaction events.',
        readableDescription: 'Events let an app observe what the engine is doing without coupling UI code to renderer internals. Use them for status panels, analytics, debug overlays, autosave, and interaction feedback.',
        methods: [
          {name: 'venus.on', description: 'Register a handler for one event channel and return an unsubscribe function.', parameters: [{name: 'eventName', type: 'VenusEventName', description: 'Event channel such as mounted, document:changed, backend:fallback, render:after, hit, or destroyed.'}, {name: 'handler', type: '(event) => void', description: 'Callback invoked when the event fires.'}]},
          {name: 'venus.off', description: 'Remove a handler manually when you do not use the returned unsubscribe function.', parameters: [{name: 'eventName', type: 'VenusEventName', description: 'The event channel to unsubscribe from.'}, {name: 'handler', type: '(event) => void', description: 'The same function reference passed to on.'}]},
        ],
        demo: `const unsubscribe = venus.on('render:after', console.log)`,
        demoCaption: 'The preview is still rendered by Venus; event listeners observe the same instance lifecycle.',
      },
      {
        id: 'events-demo',
        title: 'Events Demo',
        summary: 'Clicks buttons to trigger Venus events and inspect payloads.',
        readableDescription: 'This page demonstrates the event system with a real Venus instance. Each button calls a normal Venus API, and the event panel shows which internal event fired.',
        demo: `button.onclick = async () => { venus.add({type: 'rect', width: 120, height: 80}); await venus.render() }`,
        demoCaption: 'The interactive panel logs events from the same Venus instance that renders the canvas.',
      },
    ],
  },
  {
    id: 'debug',
    title: 'Debug',
    summary: 'Inspect diagnostics, cache state, hit-test candidates, and renderer activity.',
    apis: [
      {
        id: 'debug-tools',
        title: 'Debug Tools',
        summary: 'Exposes engine internals in a controlled way for development and QA.',
        readableDescription: 'Debugging answers why a thing rendered, did not render, or could not be clicked. The API exposes diagnostics without making backend implementation the main user model.',
        methods: [
          {name: 'venus.enableDebug', description: 'Turns on selected diagnostics.', parameters: [{name: 'options.showBounds', type: 'boolean', defaultValue: 'false', description: 'Draws geometry bounds overlays.'}, {name: 'options.showHitCandidates', type: 'boolean', defaultValue: 'false', description: 'Displays hit-test candidates.'}, {name: 'options.showCache', type: 'boolean', defaultValue: 'false', description: 'Includes normalized cache diagnostics in inspect().cache.'}]},
          {name: 'venus.inspect', description: 'Returns current engine diagnostics.'},
          {name: 'venus.measureFrame', description: 'Profiles the next render frame.'},
        ],
        demo: `venus.enableDebug({showBounds: true})`,
        demoCaption: 'The preview overlays bounds and candidate markers for debugging.',
      },
    ],
  },
  {
    id: 'qa',
    title: 'Q&A',
    summary: 'Answer common API design questions before users run into them.',
    apis: [
      {
        id: 'revision',
        title: 'What is revision?',
        summary: 'Revision is an internal version counter for cache invalidation, snapshots, replay, and deterministic tests.',
        readableDescription: 'Normal users do not set revision in the minimal public API. Low-level snapshots expose it as document version metadata so geometry cache, render cache, and replay logic know what is stale.',
        demo: `const snapshot = venus.snapshot(); console.log(snapshot.revision)`,
        demoCaption: 'The preview shows revision as document history metadata, not a drawing property.',
      },
    ],
  },
]

export const engineApiCategories: EngineApiCategory[] = withGroupedProperties(rawEngineApiCategories)
