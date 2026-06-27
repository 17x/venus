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

export interface EngineApiDoc {
  id: string
  title: string
  summary: string
  readableDescription: string
  parameters?: EngineApiParameter[]
  properties?: string[]
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

export const engineApiCategories: EngineApiCategory[] = [
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
    id: 'document-models',
    title: 'Document Models',
    summary: 'Each document object has its own API page and an editable canvas demo.',
    apis: [
      {
        id: 'rect-node',
        title: 'Rect',
        summary: 'Draws a rectangle or rounded rectangle.',
        readableDescription: 'Rect is the simplest filled shape. Use it for panels, cards, boxes, handles, and rectangular hit regions. Rounded corners are controlled by cornerRadius.',
        properties: ['type: rect', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'x?: number', 'y?: number', 'width: number', 'height: number', 'fill?: string', 'fillOpacity via rgba fill', 'stroke?: string', 'strokeOpacity via rgba stroke', 'strokeWidth?: number, 0 means no stroke', 'opacity?: number', 'shadow?: EngineShadow', 'cornerRadius?: number', 'cornerRadii?: topLeft, topRight, bottomRight, bottomLeft'],
        demo: `venus.add({type: 'rect', x: 64, y: 48, width: 220, height: 132})`,
        demoCaption: 'The preview renders a rounded rectangle with editable fill, stroke, size, and radius.',
      },
      {
        id: 'ellipse-node',
        title: 'Ellipse',
        summary: 'Draws an ellipse inside a rectangular bounds box.',
        readableDescription: 'Ellipse uses the same x, y, width, and height box model as rect. Hit testing should use ellipse geometry, not only its AABB.',
        properties: ['type: ellipse', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'x?: number', 'y?: number', 'width: number', 'height: number', 'fill?: string', 'fillOpacity via rgba fill', 'stroke?: string', 'strokeOpacity via rgba stroke', 'strokeWidth?: number, 0 means no stroke', 'opacity?: number', 'shadow?: EngineShadow', 'ellipseStartAngle?: number', 'ellipseEndAngle?: number'],
        demo: `venus.add({type: 'ellipse', x: 96, y: 64, width: 240, height: 140})`,
        demoCaption: 'The preview renders an ellipse whose bounds, fill, and stroke are editable.',
      },
      {
        id: 'line-node',
        title: 'Line',
        summary: 'Draws a stroked line segment.',
        readableDescription: 'Line is stroke-first. The width and height fields describe the segment delta from x/y, and hit testing should expand by strokeWidth plus pointer tolerance.',
        properties: ['type: line', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'x?: number', 'y?: number', 'width: number as endX - startX', 'height: number as endY - startY', 'stroke?: string', 'strokeOpacity via rgba stroke', 'strokeWidth?: number, 0 means no stroke', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'line', x: 72, y: 92, width: 300, height: 120})`,
        demoCaption: 'The preview renders a line segment with editable position, delta, and stroke.',
      },
      {
        id: 'text-node',
        title: 'Text',
        summary: 'Draws plain text with basic typography controls.',
        readableDescription: 'Text is a document object, not a canvas label. It has its own position, content, fill color, and typography fields so editors can select, inspect, and serialize it.',
        properties: ['type: text', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'x?: number', 'y?: number', 'width?: number', 'height?: number', 'text: string with line breaks', 'runs?: EngineTextRun[] for selected-range styling', 'fill?: string', 'fontSize?: number', 'fontWeight?: number', 'lineHeight?: number', 'opacity?: number', 'shadow?: EngineShadow'],
        demo: `venus.add({type: 'text', x: 80, y: 150, text: 'Venus Text'})`,
        demoCaption: 'The preview renders editable text content, color, size, and weight.',
      },
      {
        id: 'group-node',
        title: 'Group',
        summary: 'Groups children so they can move, render, and hit-test as a composed subtree.',
        readableDescription: 'Groups are scene tree containers. The group stores its own transform, children stay as nested VenusNode objects with stable ids, and Venus keeps an internal id index for lookup. Child coordinates remain group-local; rendering, hit testing, and geometry cache compose parent-to-child matrices in tree order.',
        properties: ['type: group', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'x?: number as legacy parent translateX', 'y?: number as legacy parent translateY', 'opacity?: number applied to the subtree', 'shadow?: EngineShadow', 'children: VenusNode[] as nested scene tree objects with stable ids in group-local coordinates'],
        demo: `venus.add({type: 'group', x: 32, y: 24, children: [...]})`,
        demoCaption: 'The preview moves a group parent while editing child appearance.',
      },
      {
        id: 'clip-node',
        title: 'Clip',
        summary: 'Constrains child rendering to a clip path.',
        readableDescription: 'Clip is group-like composition with a clipPath and nested children. The clip node stores its own transform, clipPath remains an editable child-like shape, and children keep local coordinates inside the clipped subtree.',
        properties: ['type: clip', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'opacity?: number applied to clipped subtree', 'clipPath: rect or ellipse VenusNode in the current facade', 'children: VenusNode[] as nested scene tree objects clipped by clipPath'],
        demo: `venus.add({type: 'clip', clipPath, children})`,
        demoCaption: 'The preview updates the clip path bounds and child colors live.',
      },
      {
        id: 'mask-node',
        title: 'Mask',
        summary: 'Uses mask-like composition for children.',
        readableDescription: 'Mask currently uses the same tree shape as clip: a transformed container with a mask path and nested children. It remains separate so alpha or luminance mask semantics can be added without changing document ownership.',
        properties: ['type: mask', 'id?: string', 'name?: string', 'visible?: boolean', 'locked?: boolean', 'blendMode?: string', 'transform?: Transform2D with x, y, rotation, scaleX, scaleY, skewX, skewY, flipX, flipY, origin', 'opacity?: number applied to masked subtree', 'clipPath: VenusNode currently equivalent to clipPath', 'children: VenusNode[] as nested scene tree objects currently clipped like clip children'],
        demo: `venus.add({type: 'mask', clipPath, children})`,
        demoCaption: 'The preview updates mask-style composition through the current Venus facade.',
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
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Selects the renderer backend.'},
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
    id: 'methods',
    title: 'Methods',
    summary: 'Instance methods, ordered from setup to document mutation.',
    apis: [
      {
        id: 'venus-add',
        title: 'venus.add',
        summary: 'Adds one document object to the current scene.',
        readableDescription: 'Use venus.add after the engine has been mounted. The method accepts any supported VenusNode and returns the engine node used by rendering, hit testing, events, snapshots, and diagnostics.',
        parameters: [
          {name: 'node', type: 'VenusNode', description: 'Document node to append to the current scene.'},
          {name: 'node.id', type: 'string', defaultValue: 'generated', description: 'Stable identity used by selection, events, and serialization.'},
          {name: 'node.type', type: 'rect | ellipse | line | text | group | clip | mask', description: 'The document object family.'},
        ],
        methods: [
          {name: 'venus.add', description: 'Adds one document object to the current scene.', parameters: [{name: 'node', type: 'VenusNode', description: 'A supported document model object.'}]},
        ],
        demo: `venus.add({
  type: 'ellipse',
  x: 72,
  y: 48,
  width: 180,
  height: 112,
  fill: '#f97316',
  stroke: '#7c2d12',
  strokeWidth: 3,
})`,
        demoCaption: 'The preview shows a single document node rendered from venus.add.',
      },
      {
        id: 'document-index',
        title: 'document id index',
        summary: 'Looks up scene tree nodes by id while preserving nested children.',
        readableDescription: 'Venus stores groups, clips, and masks as nested node trees. The runtime also maintains an internal id index so editor code can look up a node or parent without changing the serialized tree shape.',
        parameters: [
          {name: 'id', type: 'string', description: 'Stable node id to look up.'},
        ],
        methods: [
          {name: 'venus.document.getNodeById', description: 'Returns the document node for an id, or null when it is missing.', parameters: [{name: 'id', type: 'string', description: 'Node id.'}]},
          {name: 'venus.document.getParentId', description: 'Returns the parent node id for a nested node, or null for a root node.', parameters: [{name: 'id', type: 'string', description: 'Node id.'}]},
        ],
        demo: `const group = {
  id: 'group-1',
  type: 'group',
  children: [{id: 'rect-1', type: 'rect', width: 120, height: 80}],
}

venus.add(group)
const rect = venus.document.getNodeById('rect-1')`,
        demoCaption: 'The preview keeps the group as a nested tree and indexes children by id.',
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
        readableDescription: 'Hit testing is not one boolean. It should explain candidate order, AABB checks, geometry checks, stroke expansion, fill rules, transforms, closed paths, and clip/mask visibility.',
        parameters: [
          {name: 'point', type: '{x: number, y: number}', description: 'Point to test in the current interaction coordinate space.'},
          {name: 'options.phase', type: 'hover | click', defaultValue: 'click', description: 'Separates temporary hover feedback from committed click selection.'},
          {name: 'options.includeLocked', type: 'boolean', defaultValue: 'false', description: 'Whether locked nodes should be considered.'},
          {name: 'options.clipBehavior', type: 'visible | source', defaultValue: 'visible', description: 'Whether clipped content uses visible pixels or source geometry.'},
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
        readableDescription: 'Camera APIs should feel separate from object transforms. A rectangle stays at the same document position; the camera decides how that document is projected into the canvas.',
        methods: [
          {name: 'venus.camera.zoomTo', description: 'Sets the viewport scale around an optional anchor point.', parameters: [{name: 'scale', type: 'number', description: 'Target zoom scale.'}, {name: 'anchor', type: '{x: number, y: number}', description: 'Optional screen anchor.'}]},
          {name: 'venus.camera.panBy', description: 'Moves the viewport without moving document objects.', parameters: [{name: 'delta', type: '{x: number, y: number}', description: 'Screen-space movement in pixels.'}]},
          {name: 'venus.camera.fitBounds', description: 'Fits document bounds into the viewport.', parameters: [{name: 'bounds', type: 'AABB', description: 'Document-space bounds to fit.'}, {name: 'padding', type: 'number | {top, right, bottom, left}', defaultValue: '0', description: 'Optional viewport padding.'}]},
          {name: 'venus.camera.project', description: 'Converts document coordinates to screen coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Document-space point.'}]},
          {name: 'venus.camera.unproject', description: 'Converts screen coordinates back to document coordinates.', parameters: [{name: 'point', type: '{x: number, y: number}', description: 'Screen-space point.'}]},
        ],
        demo: `venus.camera.fitBounds(venus.document.bounds(), {padding: 32})`,
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
        readableDescription: 'Performance flags are not part of the minimal path. They should be documented after users understand the model because each flag changes how much work the engine does per frame.',
        parameters: [
          {name: 'culling', type: 'boolean', defaultValue: 'false', description: 'Skips offscreen objects when enabled.'},
          {name: 'lod', type: 'boolean', defaultValue: 'false', description: 'Enables level-of-detail behavior.'},
          {name: 'render.backend', type: 'canvas2d | webgl | auto', defaultValue: 'auto', description: 'Renderer backend selection.'},
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
        readableDescription: 'Animation should be an engine ability, not an app-side timer hack. It changes model properties over time and lets the engine decide when to render frames.',
        parameters: [
          {name: 'target', type: 'string | VenusNode', description: 'Node id or node reference to animate.'},
          {name: 'keyframes', type: 'Array<Record<string, unknown>>', description: 'Property snapshots over time.'},
          {name: 'options.duration', type: 'number', description: 'Animation duration in milliseconds.'},
          {name: 'options.easing', type: 'string | function', defaultValue: 'linear', description: 'Timing curve.'},
          {name: 'options.onUpdate', type: 'function', defaultValue: 'undefined', description: 'Optional update callback.'},
        ],
        methods: [{name: 'animation.cancel', description: 'Stops the running animation.'}],
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
          {name: 'venus.on', description: 'Register a handler for one event channel and return an unsubscribe function.', parameters: [{name: 'eventName', type: 'VenusEventName', description: 'Event channel such as mounted, document:changed, render:after, hit, or destroyed.'}, {name: 'handler', type: '(event) => void', description: 'Callback invoked when the event fires.'}]},
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
        readableDescription: 'Debugging should answer why a thing rendered, did not render, or could not be clicked. The API should expose useful diagnostics without leaking backend implementation as the main user model.',
        methods: [
          {name: 'venus.debug.enable', description: 'Turns on selected diagnostics.', parameters: [{name: 'options.showBounds', type: 'boolean', defaultValue: 'false', description: 'Draws geometry bounds overlays.'}, {name: 'options.showHitCandidates', type: 'boolean', defaultValue: 'false', description: 'Displays hit-test candidates.'}, {name: 'options.showCache', type: 'boolean', defaultValue: 'false', description: 'Displays cache diagnostics.'}]},
          {name: 'venus.debug.inspect', description: 'Returns current engine diagnostics.'},
          {name: 'venus.debug.measureFrame', description: 'Profiles the next render frame.'},
        ],
        demo: `venus.debug.enable({showBounds: true})`,
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
        readableDescription: 'Normal users should not need to set revision in the minimal public API. If low-level snapshots expose it, it means “which version of the document is this?” The engine can increment it when the document changes so geometry cache, render cache, and replay logic know what is stale.',
        demo: `const snapshot = venus.document.snapshot(); console.log(snapshot.revision)`,
        demoCaption: 'The preview shows revision as document history metadata, not a drawing property.',
      },
    ],
  },
]
