import {createEngine} from '@venus/engine'
import {buildThreeEditorEngineGraph} from './buildThreeEditorEngineGraph'
import {createEngineCameraController} from '@venus/engine'
import type {EngineCameraState as ThreeEditorCameraState} from '@venus/engine'
import type {EngineCameraFrameBounds} from '@venus/engine'
import {createRawInputToCameraCommandAdapter} from './rawInputToCameraCommandAdapter'
import {createTextureSamplerFromUrl, type TextureSampler} from '../materials/webTextureSampler'
import {
  DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
  type ThreeEditorLightingMode,
  type ThreeEditorOverlayState,
} from './threeEditorRuntimeContracts'

const STAGE_WIDTH = 720
const STAGE_HEIGHT = 460
const DEFAULT_YAW = 0
const DEFAULT_PITCH = 0
const PICK_TOLERANCE = 10

/**
 * Mounts a rebuilt 3D-editor runtime where rendering is delegated to engine graph synthesis.
 */
export const mountThreeEditorRuntime = (): void => {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('playground root element is missing')
  }

  root.innerHTML = `
    <div class="vector-shell" data-vector-shell="playground-local">
      <header class="vector-topbar">
        <div class="vector-topbar-title-wrap">
          <h1 class="vector-topbar-title">Venus Playground</h1>
          <p class="vector-topbar-subtitle">Runtime rebuilt with engine-owned rendering contract</p>
        </div>
        <div class="vector-topbar-meta">3D Editor Runtime / Engine Graph First</div>
      </header>
      <div class="vector-workbench">
        <aside class="vector-side-panel vector-side-panel-left">
          <h2 class="command-title">3D Editor Commands</h2>
          <p class="command-subtitle">Playground / Runtime vNext</p>
          <p id="scenario-description" class="scenario-description">3d-editor-validation (engine graph)</p>
          <div class="command-group" id="command-group"></div>
        </aside>
        <main class="vector-stage-shell">
          <div class="vector-stage-viewport">
            <div class="canvas-frame">
              <canvas id="playground-canvas" class="playground-canvas"></canvas>
              <canvas id="global-gizmo-overlay" style="position:absolute;top:12px;right:12px;width:110px;height:110px;pointer-events:none"></canvas>
            </div>
          </div>
        </main>
        <aside class="vector-side-panel vector-side-panel-right">
          <h2 class="panel-title">Runtime Model</h2>
          <ul class="panel-list">
            <li>Rendering delegated to engine graph</li>
            <li>Interaction mapped via bridge</li>
            <li>No runtime screen-space projection pass</li>
            <li>Deterministic command-driven state</li>
          </ul>
          <div class="panel-section">
            <h3 class="panel-section-title">Document Model</h3>
            <ul id="doc-model-list" class="doc-model-list"></ul>
          </div>
          <div class="panel-section">
            <h3 class="panel-section-title">Camera</h3>
            <p id="camera-state" class="panel-kv">yaw 0 | pitch 0 | distance 1.00</p>
          </div>
          <div class="panel-section">
            <h3 class="panel-section-title">Hit Test</h3>
            <p id="hit-state" class="panel-kv">hover none | selected none</p>
          </div>
        </aside>
      </div>
      <footer class="vector-statusbar">
        <div class="status-line" id="status-line">Initializing...</div>
      </footer>
    </div>
  `

  const canvas = root.querySelector<HTMLCanvasElement>('#playground-canvas')
  const commandGroup = root.querySelector<HTMLDivElement>('#command-group')
  const statusLine = root.querySelector<HTMLDivElement>('#status-line')
  const cameraStateLine = root.querySelector<HTMLParagraphElement>('#camera-state')
  const hitStateLine = root.querySelector<HTMLParagraphElement>('#hit-state')
  const documentModelList = root.querySelector<HTMLUListElement>('#doc-model-list')
  const globalGizmoOverlay = root.querySelector<HTMLCanvasElement>('#global-gizmo-overlay')
  if (!canvas || !commandGroup || !statusLine || !cameraStateLine || !hitStateLine || !documentModelList || !globalGizmoOverlay) {
    throw new Error('playground runtime mount failed')
  }

  let sceneRevision = 1
  let viewportState = {
    viewportWidth: STAGE_WIDTH,
    viewportHeight: STAGE_HEIGHT,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  }
  let cameraState: ThreeEditorCameraState = {
    yaw: DEFAULT_YAW,
    pitch: DEFAULT_PITCH,
    distance: 720,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  }
  let overlayState: ThreeEditorOverlayState = {
    axesEnabled: false,
    gridEnabled: true,
    gizmoEnabled: true,
    depthLayeringEnabled: false,
    visibilityMaskEnabled: false,
    lightingMode: 'lit',
  }
  let editorLightState = {
    directionalIntensity: 1.3,
    ambientIntensity: 0.28,
    lightAzimuthDeg: 42,
    timeOfDayHours: 14,
    cloudCover: 0.12,
    precipitation: 0,
    fogDensity: 0.06,
  }
  let hoverEntityId: string | null = null
  let selectedEntityId: string | null = null
  let worldObjects = DEFAULT_THREE_EDITOR_WORLD_OBJECTS.map((object) => ({...object}))
  let textureSamplers: {floor?: TextureSampler; panel?: TextureSampler} = {}
  let gizmoDragState:
    | null
    | {
      pointerId: number
      entityId: string
      axis: 'x' | 'y' | 'z'
      mode: 'translate' | 'rotate' | 'scale'
      startX: number
      startY: number
      objectStartX: number
      objectStartY: number
      objectStartZ: number
    } = null

  canvas.width = STAGE_WIDTH
  canvas.height = STAGE_HEIGHT

  const engine = createEngine({
    surface: {
      width: viewportState.viewportWidth,
      height: viewportState.viewportHeight,
      canvas: {
        width: canvas.width,
        height: canvas.height,
        getContext: (contextId: '2d' | 'webgl' | 'webgl2') => {
          if (contextId === '2d') {
            return canvas.getContext('2d')
          }
          if (contextId === 'webgl') {
            return canvas.getContext('webgl')
          }
          return canvas.getContext('webgl2')
        },
      },
    },
    backend: 'webgl',
    strict3d: true,
  })
  void Promise.all([
    createTextureSamplerFromUrl('/textures/asphalt_cc0_oga.png'),
    createTextureSamplerFromUrl('/textures/grass_cc0_oga.png'),
  ]).then(([floor, panel]) => {
    textureSamplers = {floor, panel}
    void renderInteractiveScene()
  }).catch(() => {
    textureSamplers = {}
  })

  /**
   * Rebuilds runtime graph nodes from current state and submits them to engine.
   */
  const applyRuntimeGraph = (): void => {
    if (overlayState.lightingMode === 'lit') {
      engine.runtime.lighting.applyEnvironment({
        timeOfDayHours: editorLightState.timeOfDayHours,
        directionDeg: editorLightState.lightAzimuthDeg,
        cloudCover: editorLightState.cloudCover,
        precipitation: editorLightState.precipitation,
        fogDensity: editorLightState.fogDensity,
        directionalIntensity: editorLightState.directionalIntensity,
        ambientIntensity: editorLightState.ambientIntensity,
        additionalLights: [],
      })
    } else if (overlayState.lightingMode === 'inherit') {
      engine.runtime.lighting.applyProfile('studio')
    } else {
      engine.runtime.lighting.clearCollection()
    }
    const graph = buildThreeEditorEngineGraph({
      cameraState,
      overlayState,
      worldObjects,
      selectedEntityId,
      hoverEntityId,
      textureSamplers,
    })
    sceneRevision += 1
    engine.setGraph({
      revision: sceneRevision,
      nodes: graph.nodes,
      materials: graph.materials,
    })
  }

  /**
   * Refreshes right-side document model with deterministic object and helper rows.
   */
  const refreshDocumentModel = (): void => {
    documentModelList.innerHTML = ''
    worldObjects.forEach((object) => {
      const item = document.createElement('li')
      const isSelected = selectedEntityId === object.id
      const isHovered = hoverEntityId === object.id
      item.className = `doc-model-item${isSelected ? ' doc-model-item-active' : ''}${isHovered ? ' doc-model-item-hover' : ''}`
      item.textContent = `${object.label} [face] | layer objects | t(${object.x.toFixed(0)}, ${object.y.toFixed(0)}, ${object.z.toFixed(0)})`
      item.addEventListener('click', () => {
        selectedEntityId = object.id
        hoverEntityId = object.id
        void renderInteractiveScene()
      })
      documentModelList.append(item)
    })
  }

  /**
   * Refreshes camera and hit-test telemetry rows.
   */
  const refreshInspectorTelemetry = (): void => {
    cameraStateLine.textContent = [
      `yaw ${cameraState.yaw.toFixed(1)}`,
      `pitch ${cameraState.pitch.toFixed(1)}`,
      `distance ${cameraState.distance.toFixed(2)}`,
      `target (${cameraState.targetX.toFixed(0)}, ${cameraState.targetY.toFixed(0)}, ${cameraState.targetZ.toFixed(0)})`,
    ].join(' | ')
    hitStateLine.textContent = [
      `hover ${hoverEntityId ?? 'none'}`,
      `selected ${selectedEntityId ?? 'none'}`,
    ].join(' | ')
  }

  /**
   * Refreshes bottom status line from engine and runtime diagnostics.
   */
  const refreshStatus = (): void => {
    const diagnostics = engine.getDiagnostics()
    const stats = engine.getStats()
    const graphNodes = engine.getGraph().nodes
    const nodeCount = diagnostics.framePlan?.sceneNodeCount ?? graphNodes.length
    statusLine.textContent = [
      'scenario 3d-editor-validation',
      `nodes ${nodeCount}`,
      `overlay3d ${graphNodes.length}`,
      `scale ${viewportState.scale.toFixed(3)}`,
      `offsetX ${viewportState.offsetX.toFixed(1)}`,
      `offsetY ${viewportState.offsetY.toFixed(1)}`,
      `draw ${stats.lastExecutionDrawCount ?? 0}`,
      `yaw ${cameraState.yaw.toFixed(1)}`,
      `pitch ${cameraState.pitch.toFixed(1)}`,
      `hover ${hoverEntityId ?? 'none'}`,
      `selected ${selectedEntityId ?? 'none'}`,
      `depth3d ${overlayState.depthLayeringEnabled ? 'on' : 'off'}`,
      `visibilityMask ${overlayState.visibilityMaskEnabled ? 'on' : 'off'}`,
      `grid ${overlayState.gridEnabled ? 'on' : 'off'}`,
      `gizmo ${overlayState.gizmoEnabled ? 'on' : 'off'}`,
      `lighting ${overlayState.lightingMode}`,
      `time ${editorLightState.timeOfDayHours.toFixed(1)}`,
      `cloud ${editorLightState.cloudCover.toFixed(2)}`,
      `rain ${editorLightState.precipitation.toFixed(2)}`,
      `fog ${editorLightState.fogDensity.toFixed(2)}`,
      `activeLights ${engine.runtime.lighting.getCollection().lights.length}`,
    ].join(' | ')
  }

  /**
   * Runs one engine render and keeps telemetry synchronized.
   */
  const renderNow = async (): Promise<void> => {
    await engine.render()
    drawGlobalGizmoOverlay()
    refreshDocumentModel()
    refreshInspectorTelemetry()
    refreshStatus()
  }

  const drawGlobalGizmoOverlay = (): void => {
    const canvas2d = globalGizmoOverlay
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const cssW = 110
    const cssH = 110
    canvas2d.width = Math.floor(cssW * dpr)
    canvas2d.height = Math.floor(cssH * dpr)
    const ctx = canvas2d.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = 'rgba(10,15,28,.6)'
    ctx.fillRect(0, 0, cssW, cssH)
    const centerX = 54
    const centerY = 56
    const len = 34
    const yaw = (cameraState.yaw * Math.PI) / 180
    const pitch = (cameraState.pitch * Math.PI) / 180
    const cosYaw = Math.cos(yaw)
    const sinYaw = Math.sin(yaw)
    const cosPitch = Math.cos(pitch)
    const sinPitch = Math.sin(pitch)
    const vectors = [
      {color: '#ef4444', x: cosYaw, y: sinYaw * sinPitch},
      {color: '#22c55e', x: 0, y: -cosPitch},
      {color: '#3b82f6', x: -sinYaw, y: cosYaw * sinPitch},
    ]
    for (const vector of vectors) {
      ctx.strokeStyle = vector.color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + vector.x * len, centerY + vector.y * len)
      ctx.stroke()
    }
  }

  /**
   * Applies graph updates and renders one synchronized runtime frame.
   */
  const renderInteractiveScene = async (): Promise<void> => {
    applyRuntimeGraph()
    await renderNow()
  }

  const cameraController = createEngineCameraController({
    initialState: cameraState,
    // Runtime owns browser timing APIs and injects them into engine through a scheduler contract.
    scheduler: {
      requestFrame: (callback) => window.requestAnimationFrame(() => callback()),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    },
    onCameraStateChanged: (nextState) => {
      cameraState = {...nextState}
    },
    onRenderRequested: renderInteractiveScene,
  })

  ;(globalThis as Record<string, unknown>).__venusPlayground3d = {
    getCameraState: (): ThreeEditorCameraState => ({...cameraState}),
    setCameraState: async (nextState: Partial<ThreeEditorCameraState>): Promise<void> => {
      cameraController.setState({
        ...cameraState,
        ...nextState,
      })
      await renderInteractiveScene()
    },
  }

  const rawInputAdapter = createRawInputToCameraCommandAdapter({
    isActive: () => true,
    onCommand: (command) => {
      cameraController.applyCommand(command)
    },
    onHoverMoved: async (point) => {
      const nextHoverEntityId = resolveHoveredEntityIdFromPoint(point)
      if (nextHoverEntityId === hoverEntityId) {
        return
      }
      hoverEntityId = nextHoverEntityId
      await renderInteractiveScene()
    },
    onCommitSelection: async (payload) => {
      if (payload.didDrag) {
        return
      }
      const pickedEntityId = payload.point ? resolveHoveredEntityIdFromPoint(payload.point) : hoverEntityId
      if (!payload.additive) {
        selectedEntityId = pickedEntityId
        hoverEntityId = pickedEntityId
        await renderInteractiveScene()
        return
      }
      if (selectedEntityId && selectedEntityId === pickedEntityId) {
        selectedEntityId = null
        hoverEntityId = null
        await renderInteractiveScene()
        return
      }
      selectedEntityId = pickedEntityId
      hoverEntityId = pickedEntityId
      await renderInteractiveScene()
    },
  })

  /**
   * Resolves one canvas-local point from browser pointer coordinates with pixel-ratio awareness.
   * @param clientX Pointer client x coordinate.
   * @param clientY Pointer client y coordinate.
   */
  const resolveCanvasPoint = (clientX: number, clientY: number): {x: number; y: number} => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  /**
   * Resolves runtime document entity id from one engine node id hit result.
   * @param nodeId Engine graph node id from pick result.
   */
  const resolveEntityIdFromNodeId = (nodeId: string): string | null => {
    if (nodeId.startsWith('object-')) {
      return nodeId.slice('object-'.length)
    }
    if (nodeId.startsWith('selected-gizmo-')) {
      const body = nodeId.slice('selected-gizmo-'.length)
      const marker = body.indexOf('-t')
      if (marker > 0) {
        return body.slice(0, marker)
      }
      const markerR = body.indexOf('-r')
      if (markerR > 0) {
        return body.slice(0, markerR)
      }
      const markerS = body.indexOf('-s')
      if (markerS > 0) {
        return body.slice(0, markerS)
      }
    }
    if (nodeId === 'axis-x' || nodeId === 'axis-y' || nodeId === 'axis-z') {
      return nodeId
    }
    return null
  }

  const resolveGizmoAxisFromNodeId = (nodeId: string): 'x' | 'y' | 'z' | null => {
    if (nodeId.includes('-tx') || nodeId.includes('-sx')) return 'x'
    if (nodeId.includes('-ty') || nodeId.includes('-sy')) return 'y'
    if (nodeId.includes('-tz') || nodeId.includes('-sz')) return 'z'
    return null
  }
  const resolveGizmoModeFromNodeId = (nodeId: string): 'translate' | 'rotate' | 'scale' | null => {
    if (nodeId.includes('-tx') || nodeId.includes('-ty') || nodeId.includes('-tz')) return 'translate'
    if (nodeId.includes('-rx-') || nodeId.includes('-ry-') || nodeId.includes('-rz-')) return 'rotate'
    if (nodeId.includes('-sx') || nodeId.includes('-sy') || nodeId.includes('-sz')) return 'scale'
    return null
  }

  /**
   * Resolves one preferred entity from ordered pick hits while prioritizing mesh object entities.
   * @param hitIds Ordered engine node id list from one pick result.
   */
  const resolvePreferredEntityId = (hitIds: ReadonlyArray<string>): string | null => {
    let fallbackEntityId: string | null = null
    for (const hitId of hitIds) {
      const entityId = resolveEntityIdFromNodeId(hitId)
      if (!entityId) {
        continue
      }
      if (entityId.startsWith('mesh-')) {
        return entityId
      }
      if (!fallbackEntityId) {
        fallbackEntityId = entityId
      }
    }
    return fallbackEntityId
  }

  /**
   * Resolves hovered runtime entity from one canvas-local pointer point using engine pick API.
   * @param point Canvas-local pointer point.
   */
  const resolveHoveredEntityIdFromPoint = (point: {x: number; y: number}): string | null => {
    const directPickResult = engine.pick(point, {tolerance: PICK_TOLERANCE})
    const directPreferredEntityId = resolvePreferredEntityId(directPickResult.hits.map((hit) => hit.id))
    if (directPreferredEntityId) {
      return directPreferredEntityId
    }
    const worldPoint = engine.screenToWorld(point)
    const worldPickResult = engine.pick(worldPoint, {tolerance: PICK_TOLERANCE})
    const worldPreferredEntityId = resolvePreferredEntityId(worldPickResult.hits.map((hit) => hit.id))
    if (worldPreferredEntityId) {
      return worldPreferredEntityId
    }

    // Fallback: project object bounds into screen space when strict3d pick cannot resolve mesh ids.
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
    const normalize = (x: number, y: number, z: number): {x: number; y: number; z: number} => {
      const len = Math.hypot(x, y, z)
      if (len <= 0.0001) {
        return {x: 0, y: 0, z: 1}
      }
      return {x: x / len, y: y / len, z: z / len}
    }
    const cross = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ): {x: number; y: number; z: number} => {
      return {
        x: ay * bz - az * by,
        y: az * bx - ax * bz,
        z: ax * by - ay * bx,
      }
    }
    const dot = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ): number => ax * bx + ay * by + az * bz

    const projectWorldToCanvas = (
      worldX: number,
      worldY: number,
      worldZ: number,
    ): {x: number; y: number; depth: number; visible: boolean} => {
      const yaw = toRadians(cameraState.yaw)
      const pitch = toRadians(cameraState.pitch)
      const cosYaw = Math.cos(yaw)
      const sinYaw = Math.sin(yaw)
      const cosPitch = Math.cos(pitch)
      const sinPitch = Math.sin(pitch)

      const distance = Math.max(1, cameraState.distance)
      const targetX = cameraState.targetX
      const targetY = cameraState.targetY
      const targetZ = cameraState.targetZ
      const perspectiveFovY = cameraState.perspectiveFovY ?? 50
      const near = cameraState.near ?? 0.1
      const far = cameraState.far ?? 5000

      const cameraX = targetX + distance * sinYaw * cosPitch
      const cameraY = targetY - distance * sinPitch
      const cameraZ = targetZ + distance * cosYaw * cosPitch

      const forward = normalize(targetX - cameraX, targetY - cameraY, targetZ - cameraZ)
      const rightRaw = cross(0, 1, 0, forward.x, forward.y, forward.z)
      const right = normalize(rightRaw.x, rightRaw.y, rightRaw.z)
      const upRaw = cross(forward.x, forward.y, forward.z, right.x, right.y, right.z)
      const up = normalize(upRaw.x, upRaw.y, upRaw.z)

      const relX = worldX - cameraX
      const relY = worldY - cameraY
      const relZ = worldZ - cameraZ
      const viewX = dot(relX, relY, relZ, right.x, right.y, right.z)
      const viewY = dot(relX, relY, relZ, up.x, up.y, up.z)
      const viewZ = dot(relX, relY, relZ, forward.x, forward.y, forward.z)
      if (viewZ <= near || viewZ >= far) {
        return {x: 0, y: 0, depth: viewZ, visible: false}
      }

      const width = Math.max(1, canvas.width)
      const height = Math.max(1, canvas.height)
      const aspect = width / height
      const tanHalfFov = Math.tan((perspectiveFovY * Math.PI / 180) * 0.5)
      const clipX = viewX / (viewZ * tanHalfFov * Math.max(0.0001, aspect))
      const clipY = viewY / (viewZ * tanHalfFov)
      const screenX = (clipX * 0.5 + 0.5) * width
      const screenY = (0.5 - clipY * 0.5) * height
      return {x: screenX, y: screenY, depth: viewZ, visible: true}
    }

    let bestEntityId: string | null = null
    let bestDepth = Number.POSITIVE_INFINITY
    let bestDistance = Number.POSITIVE_INFINITY
    for (const object of worldObjects) {
      const width = object.width ?? (object.radius ? object.radius * 2 : 120)
      const depth = object.depth ?? (object.radius ? object.radius * 2 : 120)
      const height = object.height ?? 120
      const center = projectWorldToCanvas(object.x, object.y + height * 0.5, object.z)
      if (!center.visible) {
        continue
      }
      const corner = projectWorldToCanvas(object.x + width * 0.5, object.y + height * 0.5, object.z + depth * 0.5)
      const projectedRadius = corner.visible
        ? Math.max(14, Math.hypot(corner.x - center.x, corner.y - center.y))
        : 24
      const pixelDistance = Math.hypot(point.x - center.x, point.y - center.y)
      if (pixelDistance > projectedRadius) {
        continue
      }
      if (center.depth < bestDepth || (Math.abs(center.depth - bestDepth) < 0.001 && pixelDistance < bestDistance)) {
        bestDepth = center.depth
        bestDistance = pixelDistance
        bestEntityId = object.id
      }
    }

    return bestEntityId
  }

  /**
   * Wraps async command handlers so button callbacks remain concise.
   * @param action Async command handler executed from one command button.
   */
  const run = (action: () => Promise<void>): (() => void) => {
    return () => {
      void action()
    }
  }

  /**
   * Cycles semantic lighting mode in deterministic command order.
   * @param mode Current lighting mode.
   */
  const cycleLightingMode = (mode: ThreeEditorLightingMode): ThreeEditorLightingMode => {
    if (mode === 'lit') {
      return 'unlit'
    }
    if (mode === 'unlit') {
      return 'inherit'
    }
    return 'lit'
  }

  /**
   * Resolves one object bounds envelope compatible with box/cone/pipe/image runtime object kinds.
   * @param object Runtime world object from scenario contract.
   */
  const resolveObjectBounds = (
    object: (typeof worldObjects)[number],
  ): EngineCameraFrameBounds => {
    const width = object.width ?? (object.radius ? object.radius * 2 : 120)
    const depth = object.depth ?? (object.radius ? object.radius * 2 : 120)
    const height = object.height ?? 120
    return {
      minX: object.x - width * 0.5,
      minY: object.y,
      minZ: object.z - depth * 0.5,
      maxX: object.x + width * 0.5,
      maxY: object.y + height,
      maxZ: object.z + depth * 0.5,
    }
  }

  /**
   * Resolves axis-aligned world bounds from runtime object contracts for frame-all commands.
   * @param objects Runtime world objects projected into engine graph nodes.
   */
  const resolveWorldBounds = (
    objects: ReadonlyArray<(typeof worldObjects)[number]>,
  ): EngineCameraFrameBounds => {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY
    objects.forEach((object) => {
      const bounds = resolveObjectBounds(object)
      minX = Math.min(minX, bounds.minX)
      minY = Math.min(minY, bounds.minY)
      minZ = Math.min(minZ, bounds.minZ)
      maxX = Math.max(maxX, bounds.maxX)
      maxY = Math.max(maxY, bounds.maxY)
      maxZ = Math.max(maxZ, bounds.maxZ)
    })
    return {
      minX,
      minY,
      minZ,
      maxX,
      maxY,
      maxZ,
    }
  }

  /**
   * Resolves camera frame bounds for currently selected object entity.
   * @param entityId Selected runtime entity id.
   */
  const resolveSelectionBounds = (entityId: string | null): EngineCameraFrameBounds | null => {
    if (!entityId) {
      return null
    }
    const object = worldObjects.find((candidate) => candidate.id === entityId)
    if (!object) {
      return null
    }
    return resolveObjectBounds(object)
  }

  /**
   * Frames the currently selected object when available, otherwise frames the full scene.
   */
  const frameSelectionOrAll = async (): Promise<void> => {
    const selectionBounds = resolveSelectionBounds(selectedEntityId)
    cameraController.applyCommand({
      type: 'frameBounds',
      bounds: selectionBounds ?? resolveWorldBounds(worldObjects),
    })
  }

  const commandDefinitions: Array<{label: string; onClick: () => void}> = [
    {label: 'Render Frame', onClick: run(renderNow)},
    {
      label: 'Frame All',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'frameBounds',
          bounds: resolveWorldBounds(worldObjects),
        })
      }),
    },
    {
      label: 'Frame Selected',
      onClick: run(frameSelectionOrAll),
    },
    {
      label: 'Reset Camera',
      onClick: run(async () => {
        cameraState = {
          yaw: DEFAULT_YAW,
          pitch: DEFAULT_PITCH,
          distance: 720,
          targetX: 0,
          targetY: 0,
          targetZ: 0,
        }
        cameraController.setState(cameraState)
        await renderInteractiveScene()
      }),
    },
    {
      label: 'View Front',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'setPreset',
          preset: 'front',
          preserveDistance: true,
        })
      }),
    },
    {
      label: 'View Top',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'setPreset',
          preset: 'top',
          preserveDistance: true,
        })
      }),
    },
    {
      label: 'View Right',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'setPreset',
          preset: 'right',
          preserveDistance: true,
        })
      }),
    },
    {
      label: 'View Isometric',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'setPreset',
          preset: 'isometric',
          preserveDistance: true,
        })
      }),
    },
    {
      label: 'Toggle Grid',
      onClick: run(async () => {
        overlayState = {...overlayState, gridEnabled: !overlayState.gridEnabled}
        await renderInteractiveScene()
      }),
    },
    {
      label: 'Toggle Corner Gizmo',
      onClick: run(async () => {
        overlayState = {...overlayState, gizmoEnabled: !overlayState.gizmoEnabled}
        await renderInteractiveScene()
      }),
    },
    {
      label: 'Toggle Depth Layering',
      onClick: run(async () => {
        overlayState = {...overlayState, depthLayeringEnabled: !overlayState.depthLayeringEnabled}
        await renderInteractiveScene()
      }),
    },
    {
      label: 'Toggle Visibility Mask',
      onClick: run(async () => {
        overlayState = {...overlayState, visibilityMaskEnabled: !overlayState.visibilityMaskEnabled}
        await renderInteractiveScene()
      }),
    },
    {
      label: 'Cycle Lighting',
      onClick: run(async () => {
        overlayState = {...overlayState, lightingMode: cycleLightingMode(overlayState.lightingMode)}
        await renderInteractiveScene()
      }),
    },
    {
      label: 'Clear Selection',
      onClick: run(async () => {
        hoverEntityId = null
        selectedEntityId = null
        await renderInteractiveScene()
      }),
    },
  ]

  commandDefinitions.forEach((command) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'command-button'
    button.textContent = command.label
    button.addEventListener('click', command.onClick)
    commandGroup.append(button)
  })

  const cameraSettingsPanel = document.createElement('div')
  cameraSettingsPanel.style.marginTop = '10px'
  cameraSettingsPanel.style.paddingTop = '8px'
  cameraSettingsPanel.style.borderTop = '1px solid #2a2a4a'
  commandGroup.append(cameraSettingsPanel)

  const appendSlider = (
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (value: number) => void,
  ) => {
    const row = document.createElement('label')
    row.className = 'setting-row'
    const text = document.createElement('span')
    text.textContent = `${label}: ${value.toFixed(2)}`
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(value)
    input.addEventListener('input', () => {
      const next = Number.parseFloat(input.value)
      if (!Number.isFinite(next)) return
      text.textContent = `${label}: ${next.toFixed(2)}`
      onInput(next)
      void renderInteractiveScene()
    })
    row.append(text, input)
    cameraSettingsPanel.append(row)
  }

  appendSlider('Cam Yaw', -180, 180, 1, cameraState.yaw, (value) => {
    cameraState = {...cameraState, yaw: value}
    cameraController.setState(cameraState)
  })
  appendSlider('Cam Pitch', -85, 85, 1, cameraState.pitch, (value) => {
    cameraState = {...cameraState, pitch: value}
    cameraController.setState(cameraState)
  })
  appendSlider('Cam Dist', 120, 2200, 10, cameraState.distance, (value) => {
    cameraState = {...cameraState, distance: value}
    cameraController.setState(cameraState)
  })
  appendSlider('Light Dir I', 0, 3, 0.05, editorLightState.directionalIntensity, (value) => {
    editorLightState = {...editorLightState, directionalIntensity: value}
  })
  appendSlider('Light Amb I', 0, 1, 0.02, editorLightState.ambientIntensity, (value) => {
    editorLightState = {...editorLightState, ambientIntensity: value}
  })
  appendSlider('Light Dir', 0, 359, 1, editorLightState.lightAzimuthDeg, (value) => {
    editorLightState = {...editorLightState, lightAzimuthDeg: value}
  })
  appendSlider('Time', 0, 23.9, 0.1, editorLightState.timeOfDayHours, (value) => {
    editorLightState = {...editorLightState, timeOfDayHours: value}
  })
  appendSlider('Cloud', 0, 1, 0.01, editorLightState.cloudCover, (value) => {
    editorLightState = {...editorLightState, cloudCover: value}
  })
  appendSlider('Rain', 0, 1, 0.01, editorLightState.precipitation, (value) => {
    editorLightState = {...editorLightState, precipitation: value}
  })
  appendSlider('Fog', 0, 1, 0.01, editorLightState.fogDensity, (value) => {
    editorLightState = {...editorLightState, fogDensity: value}
  })

  /**
   * Handles canvas resize and view fitting so engine surface stays in sync with CSS layout.
   */
  const handleResize = async (): Promise<void> => {
    const rect = canvas.getBoundingClientRect()
    const nextWidth = Math.max(1, Math.floor(rect.width || STAGE_WIDTH))
    const nextHeight = Math.max(1, Math.floor(rect.height || STAGE_HEIGHT))
    if (nextWidth === canvas.width && nextHeight === canvas.height) {
      return
    }
    canvas.width = nextWidth
    canvas.height = nextHeight
    viewportState = {
      ...viewportState,
      viewportWidth: nextWidth,
      viewportHeight: nextHeight,
    }
    engine.resize(nextWidth, nextHeight)
    viewportState = engine.getView()
    await renderInteractiveScene()
  }

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })

  canvas.addEventListener('pointerdown', (event) => {
    const point = resolveCanvasPoint(event.clientX, event.clientY)
    const pickResult = engine.pick(point, {tolerance: PICK_TOLERANCE})
    const gizmoHit = pickResult.hits.map((entry) => entry.id).find((id) => id.startsWith('selected-gizmo-')) ?? null
    if (gizmoHit) {
      const axis = resolveGizmoAxisFromNodeId(gizmoHit)
      const mode = resolveGizmoModeFromNodeId(gizmoHit)
      const entityId = selectedEntityId
      const object = entityId ? worldObjects.find((entry) => entry.id === entityId) : null
      if (axis && mode && entityId && object) {
        gizmoDragState = {
          pointerId: event.pointerId,
          entityId,
          axis,
          mode,
          startX: point.x,
          startY: point.y,
          objectStartX: object.x,
          objectStartY: object.y,
          objectStartZ: object.z,
        }
        canvas.setPointerCapture(event.pointerId)
        return
      }
    }
    void rawInputAdapter.handlePointerDown(
      point,
      {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      },
    )
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', (event) => {
    const point = resolveCanvasPoint(event.clientX, event.clientY)
    const dragState = gizmoDragState
    if (dragState && dragState.pointerId === event.pointerId) {
      const object = worldObjects.find((entry) => entry.id === dragState.entityId)
      if (object) {
        const dx = point.x - dragState.startX
        const dy = point.y - dragState.startY
        const moveScale = Math.max(0.05, cameraState.distance * 0.0022)
        if (dragState.mode === 'translate') {
          if (dragState.axis === 'x') {
            object.x = dragState.objectStartX + dx * moveScale
          } else if (dragState.axis === 'y') {
            object.y = dragState.objectStartY - dy * moveScale
          } else {
            object.z = dragState.objectStartZ - dy * moveScale
          }
        } else if (dragState.mode === 'rotate') {
          const delta = (dx - dy) * 0.25
          object.rotationYDeg = (object.rotationYDeg ?? 0) + delta
          dragState.startX = point.x
          dragState.startY = point.y
        } else if (dragState.mode === 'scale') {
          const factor = Math.max(0.15, 1 + (dx - dy) * 0.005)
          if (dragState.axis === 'x') {
            object.scaleX = Math.max(0.15, factor)
          } else if (dragState.axis === 'y') {
            object.scaleY = Math.max(0.15, factor)
          } else {
            object.scaleZ = Math.max(0.15, factor)
          }
        }
        void renderInteractiveScene()
      }
      return
    }
    void rawInputAdapter.handlePointerMove(
      point,
      {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      },
    )
  })

  canvas.addEventListener('pointerup', (event) => {
    if (gizmoDragState && gizmoDragState.pointerId === event.pointerId) {
      gizmoDragState = null
      canvas.releasePointerCapture(event.pointerId)
      return
    }
    void rawInputAdapter.handlePointerUp({
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      button: event.button,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    })
    canvas.releasePointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointerleave', () => {
    gizmoDragState = null
    void rawInputAdapter.handlePointerLeave()
  })

  canvas.addEventListener(
    'wheel',
    (event) => {
      const point = resolveCanvasPoint(event.clientX, event.clientY)
      const handled = rawInputAdapter.handleWheel(
        point,
        {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
        },
      )
      if (handled) {
        event.preventDefault()
      }
    },
    {passive: false},
  )

  /**
   * Handles keyboard shortcuts aligned with mainstream 3D editor camera/navigation controls.
   * @param event Keyboard event dispatched on window.
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return
    }

    const key = event.key.toLowerCase()
    if (key === 'f') {
      event.preventDefault()
      void frameSelectionOrAll()
      return
    }
    if (key === '1') {
      event.preventDefault()
      cameraController.applyCommand({type: 'setPreset', preset: 'front', preserveDistance: true})
      return
    }
    if (key === '3') {
      event.preventDefault()
      cameraController.applyCommand({type: 'setPreset', preset: 'right', preserveDistance: true})
      return
    }
    if (key === '7') {
      event.preventDefault()
      cameraController.applyCommand({type: 'setPreset', preset: 'top', preserveDistance: true})
      return
    }
    if (key === '5') {
      event.preventDefault()
      cameraController.applyCommand({type: 'setPreset', preset: 'isometric', preserveDistance: true})
      return
    }
    if (key === 'g') {
      event.preventDefault()
      overlayState = {...overlayState, gridEnabled: !overlayState.gridEnabled}
      void renderInteractiveScene()
      return
    }
    if (key === 'x') {
      event.preventDefault()
      hoverEntityId = null
      selectedEntityId = null
      void renderInteractiveScene()
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  window.addEventListener('resize', () => {
    void handleResize()
  })

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('keydown', handleKeyDown)
    rawInputAdapter.dispose()
    cameraController.dispose()
    delete (globalThis as Record<string, unknown>).__venusPlayground3d
  })

  engine.resize(viewportState.viewportWidth, viewportState.viewportHeight)
  viewportState = engine.getView()
  applyRuntimeGraph()
  void renderNow()
}
