import {createEngine} from '@venus/engine'
import {buildThreeEditorEngineGraph} from './buildThreeEditorEngineGraph'
import {createEngineCameraController} from '@venus/engine'
import type {EngineCameraState as ThreeEditorCameraState} from '@venus/engine'
import type {EngineCameraFrameBounds} from '@venus/engine'
import {createRawInputToCameraCommandAdapter} from './rawInputToCameraCommandAdapter'
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
  if (!canvas || !commandGroup || !statusLine || !cameraStateLine || !hitStateLine || !documentModelList) {
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
    axesEnabled: true,
    gridEnabled: true,
    gizmoEnabled: true,
    depthLayeringEnabled: false,
    visibilityMaskEnabled: false,
    lightingMode: 'lit',
  }
  let hoverEntityId: string | null = null
  let selectedEntityId: string | null = null

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
  })

  /**
   * Rebuilds runtime graph nodes from current state and submits them to engine.
   */
  const applyRuntimeGraph = (): void => {
    const nodes = buildThreeEditorEngineGraph({
      cameraState,
      overlayState,
      worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
      selectedEntityId,
      hoverEntityId,
    })
    sceneRevision += 1
    engine.setGraph({
      revision: sceneRevision,
      nodes,
    })
  }

  /**
   * Refreshes right-side document model with deterministic object and helper rows.
   */
  const refreshDocumentModel = (): void => {
    documentModelList.innerHTML = ''
    DEFAULT_THREE_EDITOR_WORLD_OBJECTS.forEach((object) => {
      const item = document.createElement('li')
      item.className = `doc-model-item${selectedEntityId === object.id ? ' doc-model-item-active' : ''}`
      item.textContent = `${object.label} [face] | layer objects | t(${object.x.toFixed(0)}, ${object.y.toFixed(0)}, ${object.z.toFixed(0)})`
      item.addEventListener('click', () => {
        selectedEntityId = object.id
        hoverEntityId = object.id
        void renderInteractiveScene()
      })
      documentModelList.append(item)
    })
    if (overlayState.axesEnabled) {
      appendHelperRow(documentModelList, 'X Axis')
      appendHelperRow(documentModelList, 'Y Axis')
      appendHelperRow(documentModelList, 'Z Axis')
    }
  }

  /**
   * Appends one helper row into document model list.
   * @param list Target DOM list receiving one helper row.
   * @param label Display label for helper row.
   */
  const appendHelperRow = (list: HTMLUListElement, label: string): void => {
    const item = document.createElement('li')
    item.className = 'doc-model-item'
    item.textContent = `${label} [line] | layer axes | helper`
    list.append(item)
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
      `axes ${overlayState.axesEnabled ? 'on' : 'off'}`,
      `grid ${overlayState.gridEnabled ? 'on' : 'off'}`,
      `gizmo ${overlayState.gizmoEnabled ? 'on' : 'off'}`,
      `lighting ${overlayState.lightingMode}`,
    ].join(' | ')
  }

  /**
   * Runs one engine render and keeps telemetry synchronized.
   */
  const renderNow = async (): Promise<void> => {
    await engine.render()
    refreshDocumentModel()
    refreshInspectorTelemetry()
    refreshStatus()
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
    if (nodeId === 'axis-x' || nodeId === 'axis-y' || nodeId === 'axis-z') {
      return nodeId
    }
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
    return resolvePreferredEntityId(worldPickResult.hits.map((hit) => hit.id))
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
   * Resolves axis-aligned world bounds from runtime object contracts for frame-all commands.
   * @param objects Runtime world objects projected into engine graph nodes.
   */
  const resolveWorldBounds = (
    objects: ReadonlyArray<(typeof DEFAULT_THREE_EDITOR_WORLD_OBJECTS)[number]>,
  ): EngineCameraFrameBounds => {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY
    objects.forEach((object) => {
      minX = Math.min(minX, object.x - object.width * 0.5)
      minY = Math.min(minY, object.y - object.height * 0.5)
      minZ = Math.min(minZ, object.z - object.depth * 0.5)
      maxX = Math.max(maxX, object.x + object.width * 0.5)
      maxY = Math.max(maxY, object.y + object.height * 0.5)
      maxZ = Math.max(maxZ, object.z + object.depth * 0.5)
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
    const object = DEFAULT_THREE_EDITOR_WORLD_OBJECTS.find((candidate) => candidate.id === entityId)
    if (!object) {
      return null
    }
    return {
      minX: object.x - object.width * 0.5,
      minY: object.y - object.height * 0.5,
      minZ: object.z - object.depth * 0.5,
      maxX: object.x + object.width * 0.5,
      maxY: object.y + object.height * 0.5,
      maxZ: object.z + object.depth * 0.5,
    }
  }

  /**
   * Frames the currently selected object when available, otherwise frames the full scene.
   */
  const frameSelectionOrAll = async (): Promise<void> => {
    const selectionBounds = resolveSelectionBounds(selectedEntityId)
    cameraController.applyCommand({
      type: 'frameBounds',
      bounds: selectionBounds ?? resolveWorldBounds(DEFAULT_THREE_EDITOR_WORLD_OBJECTS),
    })
  }

  const commandDefinitions: Array<{label: string; onClick: () => void}> = [
    {label: 'Render Frame', onClick: run(renderNow)},
    {
      label: 'Frame All',
      onClick: run(async () => {
        cameraController.applyCommand({
          type: 'frameBounds',
          bounds: resolveWorldBounds(DEFAULT_THREE_EDITOR_WORLD_OBJECTS),
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
      label: 'Toggle XYZ Axes',
      onClick: run(async () => {
        overlayState = {...overlayState, axesEnabled: !overlayState.axesEnabled}
        await renderInteractiveScene()
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
    engine.resize({
      width: nextWidth,
      height: nextHeight,
      fit: 'contain',
      padding: 20,
    })
    viewportState = engine.getView()
    await renderInteractiveScene()
  }

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })

  canvas.addEventListener('pointerdown', (event) => {
    const point = resolveCanvasPoint(event.clientX, event.clientY)
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
  })

  engine.resize({
    width: viewportState.viewportWidth,
    height: viewportState.viewportHeight,
    fit: 'contain',
    padding: 20,
  })
  viewportState = engine.getView()
  applyRuntimeGraph()
  void renderNow()
}
