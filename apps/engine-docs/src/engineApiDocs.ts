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
  /** Stable docs id; method ids mirror source JSDoc @name without the Venus. prefix. */
  id: string
  /** Rendered API name; mirrors the source JSDoc name section. */
  title: string
  /** Short list-card summary. */
  summary: string
  /** Full description; mirrors source JSDoc @description. */
  readableDescription: string
  /** Parameter table rows; mirror source JSDoc @param entries. */
  parameters?: EngineApiParameter[]
  properties?: string[]
  propertyGroups?: EngineApiPropertyGroup[]
  methods?: EngineApiMethod[]
  /** Usage CodeBox; mirrors source JSDoc @example Usage. */
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

  if (['type', 'id', 'name', 'visible', 'locked', 'data'].includes(name)) {
    return 'Identity'
  }

  if (['transform', 'rotation', 'x', 'y', 'width', 'height', 'cx', 'cy', 'rx', 'ry', 'ellipseGeometry'].includes(name)) {
    return 'Transform'
  }

  if (['appearance', 'blendMode', 'fill', 'fills', 'stroke', 'strokes', 'strokeWidth', 'strokeAlign', 'strokeDashArray', 'strokeCap', 'strokeJoin', 'opacity', 'visual', 'effects'].includes(name)) {
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
  const processed: EngineApiCategory[] = categories.map((category) => ({
    ...category,
    apis: category.apis.map((api) => ({
      ...api,
      propertyGroups: api.propertyGroups ?? (api.properties ? createPropertyGroups(api.properties) : undefined),
    })),
  }))

  // Target order: start → models → modules → methods → (rest)
  const order = ['start', 'models', 'modules', 'methods', 'venus-parameters', 'backend-strategy', 'events', 'debug', 'qa']
  const byId = new Map(processed.map((c) => [c.id, c]))
  return order.map((id) => byId.get(id)).filter((c): c is EngineApiCategory => c != null)
}

const rawEngineApiCategories: EngineApiCategory[] = [
  {
    id: 'start',
    title: 'Start',
    summary: 'Create a Venus instance, mount a canvas, and add one object.',
    apis: [
      {
        id: 'new-venus',
        title: 'Create and render',
        summary: 'The smallest working path is constructor, mount, and add.',
        readableDescription: 'Start stays tiny. Import Venus, create one instance, mount a canvas, and add one document object with venus.add. The facade schedules rendering when document properties change; constructor tuning and method details appear after this first path.',
        demo: `import {Venus} from '@venus/engine'

const venus = new Venus()
venus.mount(document.querySelector('canvas')!)
venus.add({
  type: 'rect',
  x: 110,
  y: 102,
  width: 180,
  height: 96,
  fill: '#2563eb',
})`,
        demoCaption: 'The preview shows the smallest flow: construct, mount, and add a rectangle.',
      },
    ],
  },
  {
    id: 'modules',
    title: 'Modules',
    summary: 'Start from the base runtime and add capability modules only when the host app needs them.',
    apis: [
      {
        id: 'base-entry',
        title: 'Base entry',
        summary: '@venus/engine/base exposes the minimal Venus runtime and constructor-time module contract.',
        readableDescription: 'Use the base entry when package size and explicit capability boundaries matter. Add modules per instance instead of using a global registry. The catalog separates implemented core module files from reserved module names that define future extension boundaries.',
        parameters: [
          {name: 'modules', type: 'readonly VenusModule[]', defaultValue: '[]', description: 'Capability modules installed once during Venus construction.'},
        ],
        properties: [
          'VENUS_MODULE_NAMES: render|camera|hitTest|interaction|animate|debug|effects|history|export',
          'VENUS_MODULE_CATALOG: module name + category + status + summary',
          'core-module files: render, camera, hitTest, interaction, animate, debug, effects, history, export',
          'core-facade modules: none',
          'reserved modules: none',
          'VENUS_INTERNAL_SERVICE_NAMES: document|spatial|geometryCache|invalidation|viewport|scheduler',
          'registered services: document, viewport, invalidation, spatial, geometryCache, scheduler',
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
venus.add({type: 'rect', x: 72, y: 56, width: 160, height: 96})`,
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
          'services.get("geometryCache"): VenusGeometryCacheService | null',
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
      {
        id: 'hit-test',
        title: 'Hit Test Module',
        summary: 'Adds pointer hit testing while keeping the base document model renderer-neutral.',
        readableDescription: 'Install hit testing when the host needs selection or hover feedback. The module projects the pointer through camera state, walks the document tree, and resolves the topmost visible node with phase-specific tolerance.',
        parameters: [
          {name: 'point', type: '{x: number, y: number}', description: 'Point to test in the current interaction coordinate space.'},
          {name: 'options.phase', type: 'hover | click', defaultValue: 'click', description: 'Hover defaults to a wider tolerance; click defaults to exact selection.'},
          {name: 'options.tolerance', type: 'number', defaultValue: '0 for click, 6 for hover', description: 'Overrides the phase default.'},
          {name: 'options.includeLocked', type: 'boolean', defaultValue: 'false', description: 'Returns locked hits only when enabled; otherwise they are skipped.'},
        ],
        demo: `import {createVenus} from '@venus/engine/base'
import {hitTestModule} from '@venus/engine/hit-test'

const venus = createVenus({modules: [hitTestModule]})
const hover = venus.hitTest(pointer, {phase: 'hover'})
const clicked = venus.hitTest(pointer, {phase: 'click'})`,
        demoCaption: 'The module demo separates hover feedback from clicked selection.',
      },
      {
        id: 'camera-controls',
        title: 'Camera Module',
        summary: 'Adds pan, zoom, fit, project, and unproject without changing document geometry.',
        readableDescription: 'Camera APIs are a viewport capability. Shapes keep their document coordinates while the camera projects document space into the canvas.',
        methods: [
          {name: 'venus.zoomTo', description: 'Sets the viewport scale around an optional anchor point.', parameters: [{name: 'scale', type: 'number', description: 'Target zoom scale.'}, {name: 'anchor', type: '{x: number, y: number}', description: 'Optional screen anchor.'}]},
          {name: 'venus.panBy', description: 'Moves the viewport without moving document objects.', parameters: [{name: 'delta', type: '{x: number, y: number}', description: 'Screen-space movement in pixels.'}]},
          {name: 'venus.fitBounds', description: 'Fits document bounds into the viewport.', parameters: [{name: 'bounds', type: 'AABB', description: 'Document-space bounds to fit.'}, {name: 'padding', type: 'number | {top, right, bottom, left}', defaultValue: '0', description: 'Optional viewport padding.'}]},
          {name: 'venus.project', description: 'Converts document coordinates to screen coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Document-space point.'}]},
          {name: 'venus.unproject', description: 'Converts screen coordinates back to document coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Screen-space point.'}]},
        ],
        demo: `import {createVenus} from '@venus/engine/base'
import {cameraModule} from '@venus/engine/camera'

const venus = createVenus({modules: [cameraModule]})
venus.fitBounds(venus.bounds(), 32)
venus.zoomTo(2, {x: 200, y: 150})`,
        demoCaption: 'The preview shows document space projected through a camera viewport.',
      },
      {
        id: 'performance-options',
        title: 'Performance Module',
        summary: 'Adds large-scene switches such as culling, LOD, and render quality tuning.',
        readableDescription: 'Performance settings are optional capability boundaries. Turn them on after the document model is correct, then tune renderer work for large scenes and high-frequency interactions.',
        parameters: [
          {name: 'culling', type: 'boolean', defaultValue: 'false', description: 'Skips offscreen objects when enabled.'},
          {name: 'lod', type: 'boolean', defaultValue: 'false', description: 'Enables level-of-detail behavior.'},
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Renderer backend selection. Auto tries WebGL first and falls back to Canvas2D if initialization fails.'},
          {name: 'render.quality', type: 'interactive | full', defaultValue: 'full', description: 'Render quality lane.'},
        ],
        demo: `import {createVenus} from '@venus/engine/base'
import {performanceModule} from '@venus/engine/performance'

const venus = createVenus({
  modules: [performanceModule],
  culling: true,
  lod: true,
})`,
        demoCaption: 'The preview shows optional performance switches layered on top of the default engine.',
      },
      {
        id: 'animate',
        title: 'Animation Module',
        summary: 'Adds time-based property transitions without coupling animation to renderer backends.',
        readableDescription: 'Animation changes model properties over time and lets invalidation decide when a frame can reuse geometry, reuse textures, or rebuild data.',
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
        demo: `import {createVenus} from '@venus/engine/base'
import {animationModule} from '@venus/engine/animation'

const venus = createVenus({modules: [animationModule]})
venus.animate('card', [{x: 40}, {x: 220}], {duration: 600})`,
        demoCaption: 'The preview shows a document object moving across frames.',
      },
    ],
  },
  {
    id: 'models',
    title: 'Models',
    summary: 'Each model has its own API page with minimal creation, unique properties, and editable canvas demo.',
    apis: [
      {
        id: 'rect',
        title: 'Rect',
        summary: 'Draws a rectangle or rounded rectangle.',
        readableDescription: 'Rect is a bounds-authored engine shape. Minimal creation is type, width, and height; x/y default to 0 and mean the local top-left of the rendered box. Rounded corners can be represented as path arcs when exporting to path geometry.',
        properties: ['type: rect', 'minimal: type + width + height', 'pathExpansion: rectangle path with optional rounded-corner arcs', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as local top-left x', 'y?: number as local top-left y', 'width: number as rendered bounds width', 'height: number as rendered bounds height', 'fill?: string as compatibility fill shortcut', 'fills?: VenusPaint[] as ordered fill paint list', 'stroke?: string as compatibility stroke shortcut', 'strokes?: VenusPaint[] as ordered stroke paint list', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'strokeCap?: butt|round|square', 'strokeJoin?: miter|round|bevel', 'opacity?: number', 'shadow?: EngineShadow', 'cornerRadius?: number', 'cornerRadii?: topLeft, topRight, bottomRight, bottomLeft'],
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132})`,
        demoCaption: 'The preview renders a rounded rectangle with editable fill, stroke, size, and radius.',
      },
      {
        id: 'ellipse',
        title: 'Ellipse',
        summary: 'Draws an ellipse inside a rectangular bounds box.',
        readableDescription: 'Ellipse is a bounds-authored engine shape. Minimal creation is type, width, and height; x/y default to the local top-left of its containing box. Arc fields can turn the ellipse into an open or closed arc path, and ellipseDrawWedgeLine controls radial edges to center.',
        properties: ['type: ellipse', 'minimal: type + width + height', 'pathExpansion: full ellipse or arc path', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as local top-left x', 'y?: number as local top-left y', 'width: number as containing bounds width', 'height: number as containing bounds height', 'fill?: string as compatibility fill shortcut', 'fills?: VenusPaint[] as ordered fill paint list', 'stroke?: string as compatibility stroke shortcut', 'strokes?: VenusPaint[] as ordered stroke paint list', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'strokeCap?: butt|round|square', 'strokeJoin?: miter|round|bevel', 'opacity?: number', 'shadow?: EngineShadow', 'ellipseStartAngle?: number', 'ellipseEndAngle?: number', 'ellipseDrawWedgeLine?: boolean'],
        demo: `venus.add({type: 'ellipse', x: 96, y: 64, width: 240, height: 140})`,
        demoCaption: 'The preview renders an ellipse whose bounds, fill, and stroke are editable.',
      },
      {
        id: 'line',
        title: 'Line',
        summary: 'Draws a stroked line segment.',
        readableDescription: 'Line is a stroke-authored engine shape with two anchor points. Minimal creation is type and points. x/y plus width/height remain compatibility fields for start point and endpoint delta, but editing the anchor points is the preferred model.',
        properties: ['type: line', 'minimal: type + points', 'pathExpansion: open two-anchor path', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'points?: [{x,y}, {x,y}] as start and end anchors', 'x?: number as compatibility start x', 'y?: number as compatibility start y', 'width?: number as compatibility endX - startX', 'height?: number as compatibility endY - startY', 'stroke?: string as compatibility stroke shortcut', 'strokes?: VenusPaint[] as ordered stroke paint list', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'strokeCap?: butt|round|square', 'strokeJoin?: miter|round|bevel', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'line', points: [{x: 72, y: 92}, {x: 372, y: 212}]})`,
        demoCaption: 'The preview renders a line segment with editable start and end anchors.',
      },
      {
        id: 'text',
        title: 'Text',
        summary: 'Draws plain text with basic typography controls.',
        readableDescription: 'Text is a document node, not an EngineShapeNode path geometry. Minimal creation is type and text. x/y position the text box, while width/height are optional editor/layout bounds used by transforms and future layout.',
        properties: ['type: text', 'minimal: type + text', 'pathExpansion: not implemented; future text outlining belongs in text/font module', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as text box origin x', 'y?: number as text box origin y', 'width?: number as optional editor/layout width', 'height?: number as optional editor/layout height', 'text: string with line breaks', 'runs?: EngineTextRun[] for selected-range styling', 'fill?: string as compatibility text fill shortcut', 'fills?: VenusPaint[] as ordered text fill paint list', 'fontSize?: number', 'fontWeight?: number', 'lineHeight?: number', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'text', x: 80, y: 150, text: 'Venus Text'})`,
        demoCaption: 'The preview renders editable text content, color, size, and weight.',
      },
      {
        id: 'group',
        title: 'Group',
        summary: 'Groups children so they can move, render, and hit-test as a composed subtree.',
        readableDescription: 'Group is a structure-only container node. Minimal creation is type and children. Visual bounds are derived from children, so group does not own x/y/width/height. Use venus.group(ids) and venus.ungroup(id) for selection-level grouping.',
        properties: ['type: group', 'minimal: type + children', 'pathExpansion: not a path; composes child paths', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured subtree style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string', 'opacity?: number applied to the subtree', 'shadow?: EngineShadow', 'children: VenusNode[] as nested scene tree objects in the parent coordinate space'],
        demo: `venus.add({type: 'group', children: [...]})`,
        demoCaption: 'The preview moves a group parent while editing child appearance.',
      },
      {
        id: 'clip',
        title: 'Clip',
        summary: 'Constrains child rendering to a clip path.',
        readableDescription: 'Clip is a container node. Minimal creation is type, clipPath, and children. Its visual bounds come from clipPath first and children second; x/y/width/height are not owned by the container itself.',
        properties: ['type: clip', 'minimal: type + clipPath + children', 'pathExpansion: clipPath can expand if its node type supports it', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured subtree style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'opacity?: number applied to clipped subtree', 'clipPath: rect or ellipse VenusNode in the current facade', 'children: VenusNode[] as nested scene tree objects clipped by clipPath'],
        demo: `venus.add({type: 'clip', clipPath, children})`,
        demoCaption: 'The preview updates the clip path bounds and child colors live.',
      },
      {
        id: 'mask',
        title: 'Mask',
        summary: 'Uses mask-like composition for children.',
        readableDescription: 'Mask is a container node with clip-like behavior today. Minimal creation is type, clipPath, and children. It stays separate from clip so alpha/luminance mask semantics can be added without changing document ownership.',
        properties: ['type: mask', 'minimal: type + clipPath + children', 'pathExpansion: mask path can expand if its node type supports it', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured subtree style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'opacity?: number applied to masked subtree', 'clipPath: VenusNode currently equivalent to clipPath', 'children: VenusNode[] as nested scene tree objects currently clipped like clip children'],
        demo: `venus.add({type: 'mask', clipPath, children})`,
        demoCaption: 'The preview updates mask-style composition through the current Venus facade.',
      },
      {
        id: 'polygon',
        title: 'Polygon',
        summary: 'Draws closed point-list polygon geometry.',
        readableDescription: 'Polygon is a point-authored engine shape. Minimal creation is type, width, height, and points. x/y/width/height are the editable bounds used by transforms and proxy resizing; points are the rendered vertices and are translated/scaled when bounds are patched.',
        properties: ['type: polygon', 'minimal: type + width + height + points', 'pathExpansion: closed point-list path', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as editor bounds x', 'y?: number as editor bounds y', 'width: number as editor bounds width', 'height: number as editor bounds height', 'points?: {x: number, y: number}[] as ordered vertices and render source', 'closed?: boolean (defaults to true)', 'fill?: string as compatibility fill shortcut', 'fills?: VenusPaint[] as ordered fill paint list', 'stroke?: string as compatibility stroke shortcut', 'strokes?: VenusPaint[] as ordered stroke paint list', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'strokeCap?: butt|round|square', 'strokeJoin?: miter|round|bevel', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'polygon', x: 72, y: 56, width: 220, height: 168, points: [{x: 182, y: 56}, {x: 292, y: 120}, {x: 254, y: 224}, {x: 110, y: 224}, {x: 72, y: 120}], fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 3})`,
        demoCaption: 'The preview renders an editable polygon with fill, stroke, and vertex controls.',
      },
      {
        id: 'path',
        title: 'Path',
        summary: 'Draws custom point or bezier path geometry.',
        readableDescription: 'Path is the native point or bezier path form. Minimal creation is type, width, height, and either points or bezierPoints. x/y/width/height are editor bounds; points and bezierPoints are the rendered geometry and are translated/scaled when bounds are patched. Open paths skip fill even if a fill shortcut is present.',
        properties: ['type: path', 'minimal: type + width + height + points|bezierPoints', 'pathExpansion: native path form', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured render style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string as multiply|screen|overlay|darken|lighten|colorDodge|colorBurn|hardLight|softLight|difference|exclusion', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as editor bounds x', 'y?: number as editor bounds y', 'width: number as editor bounds width', 'height: number as editor bounds height', 'points?: {x: number, y: number}[] as straight-line render vertices', 'bezierPoints?: {anchor: {x,y}, cp1?: {x,y}|null, cp2?: {x,y}|null}[] as bezier render vertices', 'closed?: boolean', 'strokeStartArrowhead?: none|triangle|diamond|circle|bar', 'strokeEndArrowhead?: none|triangle|diamond|circle|bar', 'fill?: string as compatibility fill shortcut for closed paths', 'fills?: VenusPaint[] as ordered fill paint list for closed paths', 'stroke?: string as compatibility stroke shortcut', 'strokes?: VenusPaint[] as ordered stroke paint list', 'strokeWidth?: number, 0 means no stroke', 'strokeAlign?: center|inside|outside', 'strokeDashArray?: number[] as alternating dash-gap lengths', 'strokeCap?: butt|round|square', 'strokeJoin?: miter|round|bevel', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'path', x: 64, y: 64, width: 280, height: 180, points: [{x: 64, y: 160}, {x: 200, y: 64}, {x: 344, y: 160}, {x: 200, y: 244}], stroke: '#7c3aed', strokeWidth: 5, closed: true})`,
        demoCaption: 'The preview renders an editable path with bezier, arrowhead, and closure controls.',
      },
      {
        id: 'image',
        title: 'Image',
        summary: 'Renders an asset-backed raster image with crop and smoothing controls.',
        readableDescription: 'Image is an asset-backed renderable node, not a path shape. Minimal creation is type, width, height, and assetId. x/y/width/height define the rendered image quad.',
        properties: ['type: image', 'minimal: type + width + height + assetId', 'pathExpansion: not path-expandable; renders as image quad', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'data?: Record<string, unknown> as host metadata', 'appearance?: VenusAppearance as structured opacity/blend/effects style', 'constraints?: VenusConstraints', 'exportSettings?: readonly VenusExportSetting[]', 'blendMode?: string', 'transform?: VenusTransform2D', 'rotation?: number as top-level rotation field', 'x?: number as image quad top-left x', 'y?: number as image quad top-left y', 'width: number as image quad width', 'height: number as image quad height', 'assetId: string', 'sourceRect?: {x, y, width, height}', 'naturalSize?: {width, height}', 'imageSmoothing?: boolean', 'opacity?: number'],
        demo: `venus.add({type: 'image', x: 80, y: 56, width: 240, height: 160, assetId: 'demo-image'})`,
        demoCaption: 'The preview shows an image placeholder rendered through the engine image node.',
      },
      {
        id: 'common-props',
        title: 'Common Properties',
        summary: 'Every Venus node type inherits these properties through the VenusNodeProxy base class. Use direct assignment to modify them.',
        readableDescription: 'All document model kinds share identity, editable bounds, transform, appearance, and effect properties through VenusNodeProxy. Bounds setters are direct geometry for bounds-authored nodes; for line/path/polygon they rewrite authored endpoints or points. The structured best-practice render surface is appearance.*, while flat fill/stroke/strokeWidth fields remain compatibility shortcuts.',
        properties: [
          // Identity
          'r.id: string (readonly)', 'r.type: string (readonly)',
          'r.name: string | undefined', 'r.visible: boolean', 'r.locked: boolean',
          // Geometry
          'r.x: number (top-left, start point, or container translate depending on node type)', 'r.y: number (top-left, start point, or container translate depending on node type)', 'r.width: number (rendered bounds or editor bounds)', 'r.height: number (rendered bounds or editor bounds)',
          'r.rotation: number', 'r.transform: VenusTransform2D | undefined',
          // Appearance
          'r.appearance: VenusAppearance | undefined via update({appearance})',
          'r.opacity: number (0–1)', 'r.blendMode: VenusBlendMode | undefined',
          'appearance.fills: VenusPaint[] structured fill layers',
          'appearance.strokes: VenusStroke[] structured stroke layers with visible, width, align, dash, cap, join, paints',
          'r.fill: string | undefined compatibility shortcut', 'r.stroke: string | undefined compatibility shortcut',
          'r.strokeWidth: number compatibility shortcut', 'r.strokeAlign: center | inside | outside | undefined',
          'r.strokeDashArray: readonly number[] | undefined',
          'strokeCap: butt | round | square through update({strokeCap})',
          'strokeJoin: miter | round | bevel through update({strokeJoin})',
          // Effects
          'appearance.effects: dropShadow | innerShadow | layerBlur structured effects',
          'r.shadow: {color, blur, offsetX, offsetY} | undefined',
          'r.innerShadow: {color, blur} | undefined',
          'r.layerBlur: number (0 = off)',
          // Batch update
          'r.update(patch): apply multiple properties at once',
          'r.setPosition(x, y): set both x and y',
          'r.setSize(w, h): set both width and height',
          // Mutation
          'r.remove(): delete this node',
        ],
        demo: `const r = venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132})

// Direct assignment — each setter commits to the store
r.width = 280
r.fill = '#3b82f6'
r.stroke = '#1e40af'
r.strokeWidth = 3
r.cornerRadius = 16
r.opacity = 0.9

// Batch update — one store commit for multiple changes
r.update({fill: '#ef4444', strokeWidth: 4, opacity: 0.7})

// Remove when done
r.remove()`,
        demoCaption: 'Common properties are inherited by all node kinds. Use direct proxy assignment for single changes, or update() for batches.',
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
        readableDescription: 'Constructor parameters live in the method reference instead of the first drawing example. Defaults are conservative: no implicit fill, no implicit stroke, no culling, no LOD, and no special render tuning unless the app opts in.',
        parameters: [
          {name: 'defaultFillColor', type: 'string', defaultValue: 'transparent', description: 'Runtime fill colour used only when a node has no explicit fill or fills.'},
          {name: 'defaultStrokeColor', type: 'string', defaultValue: 'transparent', description: 'Runtime stroke colour used only when a stroked node has no explicit stroke or strokes.'},
          {name: 'culling', type: 'boolean', defaultValue: 'false', description: 'Skips drawing objects outside the viewport when enabled.'},
          {name: 'lod', type: 'boolean', defaultValue: 'false', description: 'Enables level-of-detail behavior for large or zoomed scenes.'},
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Tries WebGL first and falls back to Canvas2D when initialization fails.'},
          {name: 'render.antialias', type: 'boolean', defaultValue: 'true', description: 'Requests antialiasing from the selected backend.'},
          {name: 'render.quality', type: 'interactive | full', defaultValue: 'full', description: 'Chooses the render quality lane.'},
        ],
        demo: `const venus = new Venus({
  defaultFillColor: 'transparent',
  defaultStrokeColor: 'transparent',
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

console.log(venus.inspect().backendFallback)`,
        demoCaption: 'The preview renders with a deterministic Canvas2D docs backend while the API describes production backend selection.',
      },
      {
        id: 'animation-invalidation',
        title: 'Animation invalidation',
        summary: 'Animation mutates document properties; invalidation chooses the cheapest render path.',
        readableDescription: 'Animation never calls WebGL or Canvas2D directly. It updates backend-neutral node fields, classifies the mutation, and lets render scheduling decide whether to reuse geometry, reuse texture, rerasterize fidelity content, or rebuild geometry.',
        parameters: [
          {name: 'transform changes', type: 'transform.x | transform.y | rotation', description: 'Reuse geometry or cached texture and update matrices or packets. Scale and skew are represented by geometry/path edits.'},
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
        summary: 'Adds one document node and returns a typed mutable proxy.',
        readableDescription: 'Call add after mount. Accepts any supported VenusNode type. Returns a typed VenusNodeProxy so the node can be edited through direct property assignment.',
        parameters: [
          {name: 'node', type: 'VenusNode', description: 'Document node to append to the current scene.'},
        ],
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132, fill: '#dbeafe'})`,
        demoCaption: 'Adds a rectangle and returns a typed node proxy.',
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
        readableDescription: 'Venus maintains an internal id index across groups, clips, and masks. Returns a mutable proxy for the node, or null when the id is not found.',
        parameters: [
          {name: 'id', type: 'string', description: 'Stable node id to look up.'},
        ],
        demo: `venus.add({id: 'card', type: 'rect', width: 160, height: 96})\nconst node = venus.getNodeById('card')`,
        demoCaption: 'Returns a proxy for the node with matching id, or null.',
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
        demo: `venus.mount(document.querySelector('canvas')!)\nvenus.add({type: 'rect', width: 200, height: 120})`,
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
        demo: `venus.resize({width: 800, height: 600})`,
        demoCaption: 'Resizes the viewport and re-renders.',
      },
      {
        id: 'render',
        title: 'render',
        summary: 'Renders the current scene to the mounted canvas.',
        readableDescription: 'Takes the current document state, builds an engine scene snapshot, and executes one render frame. Emits render:before and render:after events.',
        demo: `venus.add({type: 'rect', width: 160, height: 96})\nvenus.render()`,
        demoCaption: 'Renders the current document to the canvas.',
      },
      {
        id: 'setDefaultFillColor',
        title: 'setDefaultFillColor',
        summary: 'Sets the runtime fill used when nodes omit fill data.',
        readableDescription: 'Updates the Venus runtime default fill colour. The default is transparent, and the value is only projected into render nodes when a document node has no explicit fill or fills.',
        parameters: [
          {name: 'color', type: 'string', description: 'CSS colour used as the runtime default fill.'},
        ],
        demo: `venus.setDefaultFillColor('transparent')`,
        demoCaption: 'Changes runtime default fill without mutating document nodes.',
      },
      {
        id: 'setDefaultStrokeColor',
        title: 'setDefaultStrokeColor',
        summary: 'Sets the runtime stroke used when stroked nodes omit stroke data.',
        readableDescription: 'Updates the Venus runtime default stroke colour. The default is transparent, and the value is only projected into render nodes when a node has stroke width but no explicit stroke or strokes.',
        parameters: [
          {name: 'color', type: 'string', description: 'CSS colour used as the runtime default stroke.'},
        ],
        demo: `venus.setDefaultStrokeColor('#111827')`,
        demoCaption: 'Changes runtime default stroke without mutating document nodes.',
      },
      {
        id: 'hitTest',
        title: 'hitTest',
        summary: 'Finds the topmost document node under a point.',
        readableDescription: 'Tests a screen-space point against the scene, respecting node order, transforms, visibility, and locked state. Returns the topmost eligible hit with node identity, bounds, center, anchor, region, and target metadata.',
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
        id: 'hitTestAll',
        title: 'hitTestAll',
        summary: 'Returns every hit under a point in paint order.',
        readableDescription: 'Uses the same hit engine as hitTest, but returns all eligible hits in topmost-first order. Each result includes target kind values such as shape.stroke, shape.anchor, shape.center, shape.fill, or shape.bounds.',
        parameters: [
          {name: 'point', type: '{x, y}', description: 'Point to test in screen space.'},
          {name: 'options.phase', type: 'hover | click', defaultValue: 'click', description: 'Sets the default tolerance for pointer hover or committed click selection.'},
          {name: 'options.tolerance', type: 'number', defaultValue: '0 for click, 6 for hover', description: 'Screen-pixel tolerance used by stroke, line, path, anchor, and center hit classification.'},
          {name: 'options.includeLocked', type: 'boolean', defaultValue: 'false', description: 'When false, locked hits are skipped.'},
        ],
        demo: `const hits = venus.hitTestAll({x: 200, y: 150}, {phase: 'hover'})`,
        demoCaption: 'Returns all hit candidates with detailed target metadata.',
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
      {
        id: 'update',
        title: 'update',
        summary: 'Updates a document node by id with a shallow property patch.',
        readableDescription: 'Applies a partial VenusNode patch to one node. Triggers a targeted render-node rebuild. VenusNodeProxy setters (r.width = 200) call update() automatically.',
        parameters: [
          {name: 'id', type: 'string', description: 'Stable node id to update.'},
          {name: 'patch', type: 'Partial<VenusNode>', description: 'Properties to shallow-merge into the document node.'},
        ],
        demo: `venus.update('card', {width: 280, fill: '#ff0000', opacity: 0.8})`,
        demoCaption: 'Updates multiple properties in one call with one store rebuild.',
      },
      {
        id: 'remove',
        title: 'remove',
        summary: 'Removes a root-level document node by id.',
        readableDescription: 'Deletes a root node from the document. Emits document:changed. For selection grouping use group()/ungroup(); for low-level container edits use addChild()/removeChild().',
        parameters: [
          {name: 'id', type: 'string', description: 'Stable node id to remove.'},
        ],
        demo: `venus.add({id: 'temp', type: 'rect', width: 80, height: 40})\nvenus.remove('temp')`,
        demoCaption: 'Removes a node. Use proxy.remove() for the Figma-style equivalent.',
      },
      {
        id: 'getLayerIndex',
        title: 'getLayerIndex',
        summary: 'Returns a node index inside its current sibling layer list.',
        readableDescription: 'Layer order is the order of siblings in the document tree. Larger indexes render above smaller indexes. Nested group, clip, and mask children are indexed within their own parent.',
        parameters: [
          {name: 'id', type: 'string', description: 'Document node id.'},
        ],
        demo: `const index = venus.getLayerIndex('card')`,
        demoCaption: 'Returns the node position among siblings.',
      },
      {
        id: 'moveLayer',
        title: 'moveLayer',
        summary: 'Moves a node to a sibling layer index.',
        readableDescription: 'Reorders one node within its current parent. The node cannot cross group, clip, or mask boundaries through this API; use ungroup/group or addChild/removeChild for tree edits.',
        parameters: [
          {name: 'id', type: 'string', description: 'Document node id.'},
          {name: 'index', type: 'number', description: 'Target sibling index. Values are clamped.'},
        ],
        demo: `venus.moveLayer('card', 0)`,
        demoCaption: 'Moves a node to the back of its sibling list.',
      },
      {
        id: 'bringForward',
        title: 'bringForward',
        summary: 'Moves a node one sibling step toward the front.',
        readableDescription: 'Equivalent to moving the node one index higher within its current sibling list.',
        parameters: [{name: 'id', type: 'string', description: 'Document node id.'}],
        demo: `venus.bringForward('card')`,
        demoCaption: 'Raises the node by one sibling slot.',
      },
      {
        id: 'sendBackward',
        title: 'sendBackward',
        summary: 'Moves a node one sibling step toward the back.',
        readableDescription: 'Equivalent to moving the node one index lower within its current sibling list.',
        parameters: [{name: 'id', type: 'string', description: 'Document node id.'}],
        demo: `venus.sendBackward('card')`,
        demoCaption: 'Lowers the node by one sibling slot.',
      },
      {
        id: 'bringToFront',
        title: 'bringToFront',
        summary: 'Moves a node above all current siblings.',
        readableDescription: 'Moves a node to the highest sibling index in its current parent.',
        parameters: [{name: 'id', type: 'string', description: 'Document node id.'}],
        demo: `venus.bringToFront('card')`,
        demoCaption: 'Moves the node to the front of its sibling list.',
      },
      {
        id: 'sendToBack',
        title: 'sendToBack',
        summary: 'Moves a node below all current siblings.',
        readableDescription: 'Moves a node to index 0 in its current parent.',
        parameters: [{name: 'id', type: 'string', description: 'Document node id.'}],
        demo: `venus.sendToBack('card')`,
        demoCaption: 'Moves the node to the back of its sibling list.',
      },
      {
        id: 'undo',
        title: 'undo',
        summary: 'Restores the previous document snapshot.',
        readableDescription: 'Applies the previous document snapshot from the in-memory history stack. Runtime renderer defaults are not document history entries.',
        demo: `venus.undo()`,
        demoCaption: 'Restores the previous document state when available.',
      },
      {
        id: 'redo',
        title: 'redo',
        summary: 'Reapplies the next document snapshot.',
        readableDescription: 'Applies the next snapshot from the redo stack after undo.',
        demo: `venus.redo()`,
        demoCaption: 'Reapplies a document state when available.',
      },
      {
        id: 'canUndo',
        title: 'canUndo',
        summary: 'Reports whether undo is available.',
        readableDescription: 'Returns true when the undo stack contains at least one previous document snapshot.',
        demo: `if (venus.canUndo()) venus.undo()`,
        demoCaption: 'Checks undo availability before applying it.',
      },
      {
        id: 'canRedo',
        title: 'canRedo',
        summary: 'Reports whether redo is available.',
        readableDescription: 'Returns true when the redo stack contains at least one future document snapshot.',
        demo: `if (venus.canRedo()) venus.redo()`,
        demoCaption: 'Checks redo availability before applying it.',
      },
      {
        id: 'clearHistory',
        title: 'clearHistory',
        summary: 'Clears undo and redo stacks.',
        readableDescription: 'Clears in-memory document history without changing the current document.',
        demo: `venus.clearHistory()`,
        demoCaption: 'Drops history state while preserving the current document.',
      },
      {
        id: 'group',
        title: 'group',
        summary: 'Groups sibling nodes under a new group.',
        readableDescription: 'Creates a structure-only group from direct siblings under the same parent. Child geometry is preserved in the parent coordinate space, visual bounds stay stable, and cross-parent grouping is rejected.',
        parameters: [
          {name: 'ids', type: 'readonly string[]', description: 'Sibling node ids to group.'},
          {name: 'options', type: 'VenusGroupOptions', defaultValue: '{}', description: 'Optional group metadata such as id, name, appearance, opacity, or shadow.'},
        ],
        demo: `const a = venus.add({type: 'rect', x: 40, y: 40, width: 80, height: 60})\nconst b = venus.add({type: 'ellipse', x: 150, y: 52, width: 72, height: 48})\nconst g = venus.group([a.id, b.id], {name: 'Selection'})`,
        demoCaption: 'Short selection API for creating a group while preserving visual position.',
      },
      {
        id: 'ungroup',
        title: 'ungroup',
        summary: 'Lifts a group\'s children back into its parent.',
        readableDescription: 'Replaces a structure-only group with its children in the same parent. Children already live in parent coordinate space, so ungrouping is a pure tree operation.',
        parameters: [
          {name: 'id', type: 'string', description: 'Group node id to ungroup.'},
        ],
        demo: `const children = venus.ungroup('selection-group')`,
        demoCaption: 'Returns proxies for the lifted children.',
      },
      {
        id: 'addChild',
        title: 'addChild',
        summary: 'Adds a child node to a group, clip, or mask container.',
        readableDescription: 'Appends a new VenusNode to the parent\'s children array. The child coordinates are parent-local. Returns a typed proxy for the new child.',
        parameters: [
          {name: 'parentId', type: 'string', description: 'Parent group/clip/mask id.'},
          {name: 'child', type: 'VenusNode', description: 'Child document node to append.'},
        ],
        demo: `const g = venus.add({id: 'g', type: 'group', children: []})\nconst child = venus.addChild('g', {type: 'rect', width: 60, height: 40, fill: '#22c55e'})\nchild.x = 20`,
        demoCaption: 'Adds a child to a group. Use g.addChild(...) on the proxy for convenience.',
      },
      {
        id: 'removeChild',
        title: 'removeChild',
        summary: 'Removes a child node from a group, clip, or mask container.',
        readableDescription: 'Filters the child out of the parent\'s children array. Use the parent proxy\'s removeChild() for the Figma-style equivalent.',
        parameters: [
          {name: 'parentId', type: 'string', description: 'Parent group/clip/mask id.'},
          {name: 'childId', type: 'string', description: 'Child node id to remove.'},
        ],
        demo: `const g = venus.add({id: 'g2', type: 'group', children: [{id: 'c1', type: 'rect', width: 40, height: 30}]})\nvenus.removeChild('g2', 'c1')`,
        demoCaption: 'Removes a child from a group.',
      },
      {
        id: 'select',
        title: 'select',
        summary: 'Selects one or more document node ids.',
        readableDescription: 'Adds node ids to the current selection. Accepts a single id string or an array of ids. Already-selected ids are silently ignored.',
        parameters: [
          {name: 'ids', type: 'string | readonly string[]', description: 'Node id(s) to select.'},
        ],
        demo: `venus.select('rect-1')\nvenus.select(['rect-1', 'ellipse-2'])`,
        demoCaption: 'Selects nodes by id.',
      },
      {
        id: 'deselect',
        title: 'deselect',
        summary: 'Deselects one or more document node ids.',
        readableDescription: 'Removes one or more node ids from the current interaction-module selection set. Unknown ids are ignored.',
        parameters: [
          {name: 'ids', type: 'string | readonly string[]', description: 'Node id(s) to deselect.'},
        ],
        demo: `venus.deselect('rect-1')`,
        demoCaption: 'Removes nodes from the selection.',
      },
      {
        id: 'selectAll',
        title: 'selectAll',
        summary: 'Selects every root-level document node.',
        readableDescription: 'Adds every root-level document node id to the current selection. Nested descendants remain selected through their parent structure unless selected separately.',
        demo: `venus.selectAll()`,
        demoCaption: 'Selects all root nodes.',
      },
      {
        id: 'clearSelection',
        title: 'clearSelection',
        summary: 'Clears the current selection.',
        readableDescription: 'Empties the current selection set managed by the interaction module and notifies selection listeners.',
        demo: `venus.clearSelection()`,
        demoCaption: 'Deselects everything.',
      },
      {
        id: 'isSelected',
        title: 'isSelected',
        summary: 'Reports whether one node id is selected.',
        readableDescription: 'Checks the interaction-module selection set for one document node id without mutating selection state.',
        parameters: [
          {name: 'id', type: 'string', description: 'Node id to check.'},
        ],
        demo: `const active = venus.isSelected('rect-1')`,
        demoCaption: 'Returns true when the node id is selected.',
      },
      {
        id: 'onSelectionChange',
        title: 'onSelectionChange',
        summary: 'Subscribes to selection changes.',
        readableDescription: 'Registers a callback on the interaction module. The callback receives a read-only snapshot of selected ids, and the returned function unsubscribes it.',
        parameters: [
          {name: 'handler', type: '(selection: ReadonlySet<string>) => void', description: 'Callback invoked after selection changes.'},
        ],
        demo: `const off = venus.onSelectionChange((selection) => console.log([...selection]))`,
        demoCaption: 'Observes selection changes and returns an unsubscribe function.',
      },
      {
        id: 'applyDropShadow',
        title: 'applyDropShadow',
        summary: 'Applies a drop shadow effect to a node.',
        readableDescription: 'Adds or replaces the visible drop shadow effect for one node through the effects module.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
          {name: 'shadow', type: '{ color?, offsetX?, offsetY?, blur? }', description: 'Shadow parameters.'},
        ],
        demo: `venus.applyDropShadow('rect-1', { color: '#00000040', offsetX: 4, offsetY: 4, blur: 8 })`,
        demoCaption: 'Adds a drop shadow.',
      },
      {
        id: 'removeDropShadow',
        title: 'removeDropShadow',
        summary: 'Removes a node drop shadow.',
        readableDescription: 'Clears the drop shadow effect from one node while preserving other effect layers.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
        ],
        demo: `venus.removeDropShadow('rect-1')`,
        demoCaption: 'Removes only the drop shadow effect.',
      },
      {
        id: 'applyInnerShadow',
        title: 'applyInnerShadow',
        summary: 'Applies an inner shadow effect to a node.',
        readableDescription: 'Adds or replaces the visible inner shadow effect for one node through the effects module.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
          {name: 'shadow', type: '{ color?, blur? }', description: 'Inner shadow parameters.'},
        ],
        demo: `venus.applyInnerShadow('rect-1', { color: '#00000030', blur: 4 })`,
        demoCaption: 'Adds an inner shadow.',
      },
      {
        id: 'removeInnerShadow',
        title: 'removeInnerShadow',
        summary: 'Removes a node inner shadow.',
        readableDescription: 'Clears the inner shadow effect from one node while preserving other effect layers.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
        ],
        demo: `venus.removeInnerShadow('rect-1')`,
        demoCaption: 'Removes only the inner shadow effect.',
      },
      {
        id: 'applyLayerBlur',
        title: 'applyLayerBlur',
        summary: 'Applies a layer blur effect to a node.',
        readableDescription: 'Adds or replaces the visible layer blur effect for one node through the effects module.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
          {name: 'blur', type: '{ amount: number }', description: 'Layer blur parameters.'},
        ],
        demo: `venus.applyLayerBlur('rect-1', { amount: 4 })`,
        demoCaption: 'Adds a layer blur.',
      },
      {
        id: 'removeLayerBlur',
        title: 'removeLayerBlur',
        summary: 'Removes a node layer blur.',
        readableDescription: 'Clears the layer blur effect from one node while preserving other effect layers.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
        ],
        demo: `venus.removeLayerBlur('rect-1')`,
        demoCaption: 'Removes only the layer blur effect.',
      },
      {
        id: 'clearEffects',
        title: 'clearEffects',
        summary: 'Clears all visual effects from a node.',
        readableDescription: 'Removes all effect layers controlled by the effects module from one node.',
        parameters: [
          {name: 'nodeId', type: 'string', description: 'Target node id.'},
        ],
        demo: `venus.clearEffects('rect-1')`,
        demoCaption: 'Removes all shadows and blurs.',
      },
      {
        id: 'toPNG',
        title: 'toPNG',
        summary: 'Exports the current canvas as a PNG data URL.',
        readableDescription: 'Delegates to the export module and serializes the mounted canvas to a PNG data URL.',
        parameters: [
          {name: 'options.scale', type: 'number', defaultValue: '1', description: 'Output scale factor.'},
          {name: 'options.background', type: 'string', defaultValue: 'transparent', description: 'Optional background color composited before export.'},
        ],
        demo: `const url = await venus.toPNG({ scale: 2 })`,
        demoCaption: 'Exports canvas to PNG.',
      },
      {
        id: 'toJPEG',
        title: 'toJPEG',
        summary: 'Exports the current canvas as a JPEG data URL.',
        readableDescription: 'Delegates to the export module and serializes the mounted canvas to a JPEG data URL with quality and background options.',
        parameters: [
          {name: 'options.scale', type: 'number', defaultValue: '1', description: 'Output scale factor.'},
          {name: 'options.quality', type: 'number', defaultValue: '0.92', description: 'JPEG quality from 0 to 1.'},
          {name: 'options.background', type: 'string', defaultValue: '#ffffff', description: 'Background color used because JPEG has no alpha channel.'},
        ],
        demo: `const url = await venus.toJPEG({ quality: 0.9, background: '#ffffff' })`,
        demoCaption: 'Exports canvas to JPEG.',
      },
      {
        id: 'toSVG',
        title: 'toSVG',
        summary: 'Exports the current document as an SVG string.',
        readableDescription: 'Delegates to the export module and serializes the current document model to SVG markup.',
        parameters: [
          {name: 'options.embedImages', type: 'boolean', defaultValue: 'false', description: 'Whether to embed images as data URIs.'},
        ],
        demo: `const svg = await venus.toSVG({ embedImages: true })`,
        demoCaption: 'Exports document to SVG.',
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
        demo: `button.onclick = () => { venus.add({type: 'rect', width: 120, height: 80}) }`,
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
