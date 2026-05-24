import {createEngine} from '@venus/engine'
import {
	createScenarioCatalog,
	resolveInitialScenarioId,
	syncScenarioQuery,
	type PlaygroundScenario,
} from './scenarios/scenarioCatalog'
import {tryMountRemoteScenarioPage} from './demos/remoteScenarioPage'
import type {PlaygroundSceneSnapshot} from './types/playgroundScene'
import './index.css'

// Keep test scene dimensions compact so viewport behaviors are easy to observe.
const TEST_SCENE_WIDTH = 720
const TEST_SCENE_HEIGHT = 460

// Use small multiplicative zoom steps so repeated triggers stay visually smooth.
const ZOOM_IN_FACTOR = 10.02
const ZOOM_OUT_FACTOR = 10.98
const CONTINUOUS_ZOOM_INTERVAL_MS = 1

type ContinuousZoomDirection = 'in' | 'out'
type SemanticLightingMode = 'inherit' | 'lit' | 'unlit'

type SceneBounds = {
	width: number
	height: number
}

// Seed a deterministic baseline scene for quick runtime/manual verification.
const createInitialScene = (revision: number): PlaygroundSceneSnapshot => {
	return {
		revision,
		width: TEST_SCENE_WIDTH,
		height: TEST_SCENE_HEIGHT,
		nodes: [
			{
				id: 'bg-rect',
				type: 'shape',
				shape: 'rect',
				x: 24,
				y: 24,
				width: TEST_SCENE_WIDTH - 48,
				height: TEST_SCENE_HEIGHT - 48,
				cornerRadius: 18,
				fill: '#1f2937',
				stroke: '#334155',
				strokeWidth: 2,
			},
			{
				id: 'headline',
				type: 'text',
				x: 64,
				y: 60,
				text: 'Venus Engine Playground',
				style: {
					fontFamily: 'IBM Plex Sans',
					fontSize: 30,
					fontWeight: 600,
					fill: '#e2e8f0',
				},
			},
			{
				id: 'guide-text',
				type: 'text',
				x: 64,
				y: 110,
				text: 'No framework. Native DOM + @venus/engine.',
				style: {
					fontFamily: 'IBM Plex Sans',
					fontSize: 16,
					fill: '#93c5fd',
				},
			},
			{
				id: 'card-a',
				type: 'shape',
				shape: 'rect',
				x: 64,
				y: 170,
				width: 220,
				height: 150,
				cornerRadius: 14,
				fill: '#0f766e',
				stroke: '#2dd4bf',
				strokeWidth: 2,
			},
			{
				id: 'card-b',
				type: 'shape',
				shape: 'ellipse',
				x: 340,
				y: 180,
				width: 180,
				height: 130,
				fill: '#92400e',
				stroke: '#fbbf24',
				strokeWidth: 2,
			},
			{
				id: 'line-1',
				type: 'shape',
				shape: 'line',
				x: 284,
				y: 245,
				width: 56,
				height: 0,
				stroke: '#cbd5e1',
				strokeWidth: 3,
			},
		],
	}
}

/**
 * Pick a scenario snapshot from the catalog and keep initial bounds synchronized.
 * @param revision Monotonic scene revision used to build deterministic snapshots.
 */
const createInitialScenarioSnapshot = (
	revision: number,
): {
	sceneSnapshot: PlaygroundSceneSnapshot
	initialScenarioId: string
	initialScenarioDescription: string
	initialSceneBounds: SceneBounds
} => {
	const scenarioCatalog = createScenarioCatalog(revision)
	const initialScenarioId = resolveInitialScenarioId(scenarioCatalog)
	const initialScenario =
		scenarioCatalog.find((scenario) => scenario.id === initialScenarioId) ?? scenarioCatalog[0]
	const sceneSnapshot = initialScenario?.buildScene(revision) ?? createInitialScene(revision)
	return {
		sceneSnapshot,
		initialScenarioId: initialScenario?.id ?? '',
		initialScenarioDescription: initialScenario?.description ?? 'Unspecified scenario.',
		initialSceneBounds: {
			width: sceneSnapshot.width,
			height: sceneSnapshot.height,
		},
	}
}

// Build the playground shell in plain DOM to keep framework-free integration.
const mountPlayground = () => {
	const root = document.getElementById('root')
	if (!root) {
		throw new Error('playground root element is missing')
	}

	root.innerHTML = `
		<div class="playground-shell">
			<aside class="command-panel">
				<h1 class="command-title">Engine Commands</h1>
				<p class="command-subtitle">Playground / No Framework</p>
				<div class="scenario-group">
					<label class="scenario-label" for="scenario-select">Scenario</label>
					<select id="scenario-select" class="scenario-select"></select>
					<p id="scenario-description" class="scenario-description"></p>
				</div>
				<div class="command-group" id="command-group"></div>
			</aside>
			<main class="canvas-stage">
				<div class="canvas-frame">
					<canvas id="playground-canvas" class="playground-canvas"></canvas>
				</div>
				<div class="status-line" id="status-line">Initializing...</div>
			</main>
		</div>
	`

	const canvas = root.querySelector<HTMLCanvasElement>('#playground-canvas')
	const commandGroup = root.querySelector<HTMLDivElement>('#command-group')
	const scenarioSelect = root.querySelector<HTMLSelectElement>('#scenario-select')
	const scenarioDescription = root.querySelector<HTMLParagraphElement>('#scenario-description')
	const statusLine = root.querySelector<HTMLDivElement>('#status-line')
	if (!canvas || !commandGroup || !scenarioSelect || !scenarioDescription || !statusLine) {
		throw new Error('playground UI mount failed')
	}

	let sceneRevision = 1
	let scenarioCatalog = createScenarioCatalog(sceneRevision)
	const initialScenario = createInitialScenarioSnapshot(sceneRevision)
	let activeScenarioId = initialScenario.initialScenarioId
	let sceneBounds = initialScenario.initialSceneBounds
	let viewportState = {
		viewportWidth: TEST_SCENE_WIDTH,
		viewportHeight: TEST_SCENE_HEIGHT,
		scale: 1,
		offsetX: 0,
		offsetY: 0,
	}
	let continuousZoomDirection: ContinuousZoomDirection | null = null
	let continuousZoomTimer: number | null = null
	let semanticDepthLayeringEnabled = false
	let semanticVisibilityMaskEnabled = false
	let semanticLightingMode: SemanticLightingMode = 'lit'
	canvas.width = TEST_SCENE_WIDTH
	canvas.height = TEST_SCENE_HEIGHT

	// Keep runtime initialization explicit for easier command-path debugging.
	const engine = createEngine({
		surface: {
			width: viewportState.viewportWidth,
			height: viewportState.viewportHeight,
			canvas: {
				width: canvas.width,
				height: canvas.height,
				getContext: (contextId) => {
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
		revision: initialScenario.sceneSnapshot.revision,
		nodes: initialScenario.sceneSnapshot.nodes,
	})

	// Update status from runtime diagnostics so command effects are visible.
	const refreshStatus = () => {
		const diagnostics = engine.getDiagnostics()
		const stats = engine.getStats()
		const activeScenario = scenarioCatalog.find((scenario) => scenario.id === activeScenarioId)
		const nodeCount =
			diagnostics.framePlan?.sceneNodeCount ?? engine.getGraph().nodes.length
		statusLine.textContent = [
			`scenario ${activeScenario?.id ?? 'unknown'}`,
			`nodes ${nodeCount}`,
			`scale ${viewportState.scale.toFixed(3)}`,
			`offsetX ${viewportState.offsetX.toFixed(1)}`,
			`offsetY ${viewportState.offsetY.toFixed(1)}`,
			`draw ${stats.lastExecutionDrawCount ?? 0}`,
			`depth3d ${semanticDepthLayeringEnabled ? 'on' : 'off'}`,
			`visibilityMask ${semanticVisibilityMaskEnabled ? 'on' : 'off'}`,
			`lighting ${semanticLightingMode}`,
			`zoomLoop ${continuousZoomDirection ?? 'off'}`,
		].join(' | ')
	}

	// Restore semantic controls to defaults when loading/rebuilding scenario snapshots.
	const resetSemanticControlState = (): void => {
		semanticDepthLayeringEnabled = false
		semanticVisibilityMaskEnabled = false
		semanticLightingMode = 'lit'
	}

	/**
	 * Resolve one numeric extent from graph-node fields with deterministic fallback.
	 * @param node Mutable graph node payload projected from engine.getGraph().
	 * @param key Extent key to resolve from node payload.
	 */
	const resolveNodeExtent = (node: Record<string, unknown>, key: 'width' | 'height'): number => {
		const value = node[key]
		return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 64
	}

	// Project semantic3d controls into graph nodes and submit as one deterministic graph snapshot.
	const applySemantic3DProfile = async (): Promise<void> => {
		const currentGraph = engine.getGraph()
		const nextNodes = currentGraph.nodes.map((node, index) => {
			const nextNode = {...(node as Record<string, unknown>)}
			const resolvedWidth = resolveNodeExtent(nextNode, 'width')
			const resolvedHeight = resolveNodeExtent(nextNode, 'height')
			const semanticZ = semanticDepthLayeringEnabled ? index * 6 : 0
			const visible = semanticVisibilityMaskEnabled ? index % 4 !== 3 : true
			nextNode.z = semanticZ
			nextNode.renderOrder = semanticDepthLayeringEnabled ? index : 0
			nextNode.visible = visible
			nextNode.lightingMode = semanticLightingMode
			nextNode.materialId = `semantic-material-${index % 5}`
			nextNode.semantic3d = {
				bounds: {
					x: typeof nextNode.x === 'number' ? nextNode.x : 0,
					y: typeof nextNode.y === 'number' ? nextNode.y : 0,
					z: semanticZ,
					width: resolvedWidth,
					height: resolvedHeight,
					depth: semanticDepthLayeringEnabled ? 18 : 0,
				},
				transform: {
					x: typeof nextNode.x === 'number' ? nextNode.x : 0,
					y: typeof nextNode.y === 'number' ? nextNode.y : 0,
					z: semanticZ,
					rotationX: 0,
					rotationY: semanticDepthLayeringEnabled ? (index % 7) * 4 : 0,
					rotationZ: 0,
					scaleX: 1,
					scaleY: 1,
					scaleZ: 1,
				},
				sourceType: String(nextNode.type ?? 'shape'),
				renderOrder: semanticDepthLayeringEnabled ? index : 0,
				visible,
				lightingMode: semanticLightingMode,
				materialId: `semantic-material-${index % 5}`,
			}
			return nextNode
		}) as PlaygroundSceneSnapshot['nodes']

		sceneRevision += 1
		engine.setGraph({
			revision: sceneRevision,
			nodes: nextNodes,
		})
		await renderNow()
	}

	// Render once and refresh status after every command.
	const renderNow = async () => {
		await engine.render()
		viewportState = engine.getView()
		refreshStatus()
	}

	// Keep test scene centered with modest margins in the canvas frame.
	const fitSceneToViewport = async () => {
		const frameRect = canvas.getBoundingClientRect()
		const viewportWidth = Math.max(1, Math.floor(frameRect.width))
		const viewportHeight = Math.max(1, Math.floor(frameRect.height))
		const outputDpr = Math.min(window.devicePixelRatio || 1, 2)
		canvas.width = Math.max(1, Math.round(viewportWidth * outputDpr))
		canvas.height = Math.max(1, Math.round(viewportHeight * outputDpr))
		const nextScale = Math.min(
			(viewportWidth * 0.84) / sceneBounds.width,
			(viewportHeight * 0.84) / sceneBounds.height,
		)

		engine.resize(viewportWidth, viewportHeight)
		viewportState = engine.setView({
			viewportWidth,
			viewportHeight,
			scale: nextScale,
			offsetX: (viewportWidth - sceneBounds.width * nextScale) * 0.5,
			offsetY: (viewportHeight - sceneBounds.height * nextScale) * 0.5,
		})

		await renderNow()
	}

	// Apply zoom around viewport center to keep command effects predictable.
	/**
	 * Apply multiplicative zoom using the tracked viewport state as the source of truth.
	 * @param factor Multiplicative zoom factor.
	 */
	const zoomByFactor = async (factor: number) => {
		viewportState = engine.setView({
			scale: viewportState.scale * factor,
		})
		await renderNow()
	}

	// Stop any running zoom loop before switching command modes.
	const stopContinuousZoom = () => {
		if (continuousZoomTimer !== null) {
			window.clearInterval(continuousZoomTimer)
			continuousZoomTimer = null
		}
		continuousZoomDirection = null
		refreshActiveCommandButton()
	}

	// Start a fixed-rate zoom loop for stressing repeated zoom command paths.
	const startContinuousZoom = (direction: ContinuousZoomDirection) => {
		if (continuousZoomDirection === direction) {
			stopContinuousZoom()
			return
		}

		stopContinuousZoom()
		continuousZoomDirection = direction
		continuousZoomTimer = window.setInterval(() => {
			void zoomByFactor(direction === 'in' ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR)
		}, CONTINUOUS_ZOOM_INTERVAL_MS)
		refreshActiveCommandButton()
	}

	// Keep command button styles synced with current continuous command state.
	const refreshActiveCommandButton = () => {
		const buttons = commandGroup.querySelectorAll<HTMLButtonElement>('button[data-zoom-mode]')
		buttons.forEach((button) => {
			const zoomMode = button.dataset.zoomMode
			const isActive = zoomMode === continuousZoomDirection
			button.classList.toggle('command-button-active', isActive)
		})
		refreshStatus()
	}

	// Rebuild baseline data so command regressions always start from known state.
	const resetScene = async () => {
		sceneRevision += 1
		scenarioCatalog = createScenarioCatalog(sceneRevision)
		const activeScenario =
			scenarioCatalog.find((scenario) => scenario.id === activeScenarioId) ?? scenarioCatalog[0]
		if (!activeScenario) {
			return
		}
		const nextSnapshot = activeScenario.buildScene(sceneRevision)
		resetSemanticControlState()
		sceneBounds = {
			width: nextSnapshot.width,
			height: nextSnapshot.height,
		}
		scenarioDescription.textContent = activeScenario.description
		syncScenarioQuery(activeScenario.id)
		engine.setGraph({
			revision: nextSnapshot.revision,
			nodes: nextSnapshot.nodes,
		})
		await fitSceneToViewport()
	}

	/**
	 * Load the target scenario and recenter viewport around the new snapshot bounds.
	 * @param scenarioId Scenario identifier selected from the command panel.
	 */
	const loadScenario = async (scenarioId: string) => {
		const nextScenario = scenarioCatalog.find((scenario) => scenario.id === scenarioId)
		if (!nextScenario) {
			return
		}

		activeScenarioId = nextScenario.id
		sceneRevision += 1
		scenarioCatalog = createScenarioCatalog(sceneRevision)
		const activeScenario =
			scenarioCatalog.find((scenario) => scenario.id === activeScenarioId) ?? scenarioCatalog[0]
		if (!activeScenario) {
			return
		}

		const nextSnapshot = activeScenario.buildScene(sceneRevision)
		resetSemanticControlState()
		sceneBounds = {
			width: nextSnapshot.width,
			height: nextSnapshot.height,
		}
		scenarioDescription.textContent = `${activeScenario.description} (${activeScenario.tags.join(', ')})`
		syncScenarioQuery(activeScenario.id)
		scenarioSelect.value = activeScenario.id
		engine.setGraph({
			revision: nextSnapshot.revision,
			nodes: nextSnapshot.nodes,
		})
		await fitSceneToViewport()
	}

	// Wrap async command handlers so button callbacks stay concise.
	const run = (action: () => Promise<void>) => {
		return () => {
			void action()
		}
	}

	// Keep a compact command set plus dedicated continuous zoom stress controls.
	const commandDefinitions: Array<{
		label: string
		onClick: () => void
		zoomMode?: ContinuousZoomDirection
	}> = [
		{label: 'Load Scenario', onClick: run(async () => loadScenario(scenarioSelect.value))},
		{label: 'Render Once', onClick: run(renderNow)},
		{label: 'Reset Scene', onClick: run(resetScene)},
		{label: 'Reset View', onClick: run(fitSceneToViewport)},
		{label: 'Zoom In', onClick: run(async () => zoomByFactor(ZOOM_IN_FACTOR))},
		{label: 'Zoom Out', onClick: run(async () => zoomByFactor(ZOOM_OUT_FACTOR))},
		{
			label: 'Pan Left',
			onClick: run(async () => {
				viewportState = engine.setView({
					offsetX: viewportState.offsetX + 36,
				})
				await renderNow()
			}),
		},
		{
			label: 'Pan Right',
			onClick: run(async () => {
				viewportState = engine.setView({
					offsetX: viewportState.offsetX - 36,
				})
				await renderNow()
			}),
		},
		{
			label: 'Continuous Zoom In',
			onClick: () => startContinuousZoom('in'),
			zoomMode: 'in',
		},
		{
			label: 'Continuous Zoom Out',
			onClick: () => startContinuousZoom('out'),
			zoomMode: 'out',
		},
		{
			label: 'Toggle 3D Depth Layering',
			onClick: run(async () => {
				semanticDepthLayeringEnabled = !semanticDepthLayeringEnabled
				await applySemantic3DProfile()
			}),
		},
		{
			label: 'Toggle Visibility Mask',
			onClick: run(async () => {
				semanticVisibilityMaskEnabled = !semanticVisibilityMaskEnabled
				await applySemantic3DProfile()
			}),
		},
		{
			label: 'Cycle Lighting Mode',
			onClick: run(async () => {
				semanticLightingMode = semanticLightingMode === 'lit'
					? 'unlit'
					: semanticLightingMode === 'unlit'
						? 'inherit'
						: 'lit'
				await applySemantic3DProfile()
			}),
		},
		{label: 'Stop Zoom Loop', onClick: stopContinuousZoom},
	]

	// Materialize command buttons from metadata to keep action list easy to grow.
	commandDefinitions.forEach((command) => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'command-button'
		button.textContent = command.label
		if (command.zoomMode) {
			button.dataset.zoomMode = command.zoomMode
		}
		button.addEventListener('click', command.onClick)
		commandGroup.append(button)
	})

	// Keep scenario selection declarative so each scene can be deep-linked and replayed.
	scenarioCatalog.forEach((scenario: PlaygroundScenario) => {
		const option = document.createElement('option')
		option.value = scenario.id
		option.textContent = scenario.label
		scenarioSelect.append(option)
	})

	scenarioSelect.value = activeScenarioId
	scenarioDescription.textContent = `${initialScenario.initialScenarioDescription} (${scenarioCatalog
		.find((scenario) => scenario.id === activeScenarioId)
		?.tags.join(', ')})`
	syncScenarioQuery(activeScenarioId)

	// Apply the newly selected scenario immediately for fast validation loops.
	scenarioSelect.addEventListener('change', () => {
		void loadScenario(scenarioSelect.value)
	})

	// Refit on resize so centered small-canvas behavior remains stable.
	const handleResize = () => {
		void fitSceneToViewport()
	}
	window.addEventListener('resize', handleResize)

	// Ensure timers and runtime resources are released during page unload.
	window.addEventListener('beforeunload', () => {
		window.removeEventListener('resize', handleResize)
		stopContinuousZoom()
		engine.dispose()
	})

	void fitSceneToViewport()
}

// Keeps the legacy local mount entry available for ad-hoc debugging while route mode stays demo-first.
void mountPlayground

/**
 * Boots playground entrypoint and dispatches route-specific page mount behavior.
 */
const bootstrapPlayground = async (): Promise<void> => {
	const mountedRemoteScenario = await tryMountRemoteScenarioPage()
	if (mountedRemoteScenario) {
		return
	}
	window.location.replace('/demo/s1-medical-volume-slice-runtime')
}

void bootstrapPlayground()
