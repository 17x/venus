import {createEngine} from '@venus/engine'
import {
  REMOTE_SCENARIO_DEFINITIONS,
  resolveRemoteScenarioFromRoute,
  type RemoteScenarioDefinition,
} from './remoteScenarioCatalog'
import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

/**
 * Resolves current hash sub-route path used by playground route dispatching.
 */
function resolveHashSubRoutePath(): string {
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!rawHash) {
    return ''
  }
  const hashPath = rawHash.split('?')[0]
  if (!hashPath) {
    return ''
  }
  return hashPath.startsWith('/') ? hashPath : `/${hashPath}`
}

/**
 * Attempts to mount a remote-data scenario subpage based on current pathname.
 */
export async function tryMountRemoteScenarioPage(): Promise<boolean> {
  const hashSubRoutePath = resolveHashSubRoutePath()
  const scenario = resolveRemoteScenarioFromRoute(hashSubRoutePath || window.location.pathname)
  if (!scenario) {
    return false
  }

  await mountRemoteScenarioPage(scenario)
  return true
}

/**
 * Mounts one remote-data-driven scenario page and runs the initial render sequence.
 * @param scenario Remote scenario definition resolved from pathname route.
 */
async function mountRemoteScenarioPage(scenario: RemoteScenarioDefinition): Promise<void> {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('playground root element is missing')
  }

  root.innerHTML = `
    <div class="remote-demo-shell">
      <header class="remote-demo-header">
        <div>
          <h1 class="remote-demo-title">${scenario.title}</h1>
          <p class="remote-demo-subtitle">${scenario.summary}</p>
          <p class="remote-demo-meta">Dataset: ${scenario.datasetUrl}</p>
        </div>
        <nav class="remote-demo-nav" id="remote-demo-nav"></nav>
      </header>
      <main class="remote-demo-stage">
        <div class="remote-demo-toolbar">
          <button type="button" class="command-button" id="remote-reload">Reload Remote Data</button>
          <button type="button" class="command-button" id="remote-fit">Fit View</button>
          <span class="remote-demo-status" id="remote-status">Initializing...</span>
        </div>
        <div class="canvas-frame remote-canvas-frame">
          <canvas id="remote-canvas" class="playground-canvas"></canvas>
        </div>
      </main>
    </div>
  `

  const nav = root.querySelector<HTMLDivElement>('#remote-demo-nav')
  const canvas = root.querySelector<HTMLCanvasElement>('#remote-canvas')
  const reloadButton = root.querySelector<HTMLButtonElement>('#remote-reload')
  const fitButton = root.querySelector<HTMLButtonElement>('#remote-fit')
  const status = root.querySelector<HTMLSpanElement>('#remote-status')
  if (!nav || !canvas || !reloadButton || !fitButton || !status) {
    throw new Error('remote scenario UI mount failed')
  }

  populateScenarioNav(nav, scenario)

  let revision = 1
  let sceneSnapshot = createLoadingSnapshot(revision, scenario)
  let viewport = {
    viewportWidth: 1280,
    viewportHeight: 760,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  }

  const engine = createEngine({
    surface: {
      width: viewport.viewportWidth,
      height: viewport.viewportHeight,
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
  engine.setGraph({
    revision: sceneSnapshot.revision,
    nodes: sceneSnapshot.nodes,
  })

  /**
   * Refreshes status line using current scene/viewport/runtime diagnostics.
   */
  const refreshStatus = (): void => {
    const diagnostics = engine.getDiagnostics()
    const stats = engine.getStats()
    status.textContent = [
      `nodes ${engine.getGraph().nodes.length}`,
      `scale ${viewport.scale.toFixed(3)}`,
      `offsetX ${viewport.offsetX.toFixed(1)}`,
      `offsetY ${viewport.offsetY.toFixed(1)}`,
      `draw ${stats.lastExecutionDrawCount ?? 0}`,
      `webglPath ${diagnostics.backendDiagnostics?.webglRenderPath ?? 'none'}`,
    ].join(' | ')
  }

  /**
   * Renders one frame and updates telemetry text.
   */
  const renderNow = async (): Promise<void> => {
    await engine.render()
    viewport = engine.getView()
    refreshStatus()
  }

  /**
   * Fits scene bounds into canvas viewport while keeping margins stable.
   */
  const fitView = async (): Promise<void> => {
    const frameRect = canvas.getBoundingClientRect()
    const viewportWidth = Math.max(1, Math.floor(frameRect.width))
    const viewportHeight = Math.max(1, Math.floor(frameRect.height))
    const outputDpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(viewportWidth * outputDpr))
    canvas.height = Math.max(1, Math.round(viewportHeight * outputDpr))

    engine.resize(viewportWidth, viewportHeight)

    const nextScale = Math.min((viewportWidth * 0.9) / sceneSnapshot.width, (viewportHeight * 0.86) / sceneSnapshot.height)
    viewport = engine.setView({
      viewportWidth,
      viewportHeight,
      scale: nextScale,
      offsetX: (viewportWidth - sceneSnapshot.width * nextScale) * 0.5,
      offsetY: (viewportHeight - sceneSnapshot.height * nextScale) * 0.5,
    })

    await renderNow()
  }

  /**
   * Fetches public data and rebuilds scene snapshot for the active remote scenario.
   */
  const reloadRemoteData = async (): Promise<void> => {
    status.textContent = 'Fetching public data...'
    try {
      revision += 1
      const payload = await fetchRemotePayload(scenario)
      sceneSnapshot = scenario.buildScene(revision, payload)
      engine.setGraph({
        revision: sceneSnapshot.revision,
        nodes: sceneSnapshot.nodes,
      })
      await fitView()
      status.textContent = `Loaded public data from ${new URL(scenario.datasetUrl).host}`
      refreshStatus()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      status.textContent = `Remote load failed: ${message}`
    }
  }

  reloadButton.addEventListener('click', () => {
    void reloadRemoteData()
  })
  fitButton.addEventListener('click', () => {
    void fitView()
  })

  const handleResize = () => {
    void fitView()
  }
  window.addEventListener('resize', handleResize)

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', handleResize)
    engine.dispose()
  })

  await fitView()
  await reloadRemoteData()
}

/**
 * Populates remote demo navigation links for all route-based scenario pages.
 * @param navContainer Target DOM container that receives anchor links.
 * @param activeScenario Currently active scenario definition.
 */
function populateScenarioNav(
  navContainer: HTMLDivElement,
  activeScenario: RemoteScenarioDefinition,
): void {
  const links = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => {
    const isActive = scenario.id === activeScenario.id
    return `<a class="remote-demo-link ${isActive ? 'remote-demo-link-active' : ''}" href="#${scenario.path}">${scenario.tags[0]}</a>`
  })
  navContainer.innerHTML = links.join('')
}

/**
 * Creates one deterministic loading snapshot before remote dataset hydration.
 * @param revision Monotonic revision used by the loading scene snapshot.
 * @param scenario Active scenario definition that owns the loading message.
 */
function createLoadingSnapshot(
  revision: number,
  scenario: RemoteScenarioDefinition,
): PlaygroundSceneSnapshot {
  return {
    revision,
    width: 1280,
    height: 760,
    nodes: [
      {
        id: 'loading-bg',
        type: 'shape',
        shape: 'rect',
        x: 24,
        y: 24,
        width: 1232,
        height: 712,
        cornerRadius: 16,
        fill: '#0b1728',
        stroke: '#1e3a8a',
        strokeWidth: 2,
      },
      {
        id: 'loading-title',
        type: 'text',
        x: 72,
        y: 112,
        text: scenario.title,
        style: {
          fontFamily: 'IBM Plex Sans',
          fontSize: 30,
          fontWeight: 600,
          fill: '#e2e8f0',
        },
      },
      {
        id: 'loading-text',
        type: 'text',
        x: 72,
        y: 156,
        text: 'Fetching free public dataset and building scene snapshot...',
        style: {
          fontFamily: 'IBM Plex Sans',
          fontSize: 16,
          fill: '#93c5fd',
        },
      },
    ],
  }
}

/**
 * Fetches remote scenario payload according to dataset format declaration.
 * @param scenario Remote scenario definition that owns endpoint and parser format.
 */
async function fetchRemotePayload(scenario: RemoteScenarioDefinition): Promise<unknown> {
  const response = await fetch(scenario.datasetUrl, {
    method: 'GET',
    headers: {
      Accept: scenario.datasetFormat === 'json' ? 'application/json,text/plain,*/*' : 'text/csv,text/plain,*/*',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  if (scenario.datasetFormat === 'json') {
    return await response.json()
  }

  return await response.text()
}
