import {createEngine, type EngineSceneSnapshot} from '@venus/engine'
import './index.css'

// Keep test scene dimensions compact so viewport behaviors are easy to observe.
const TEST_SCENE_WIDTH = 720
const TEST_SCENE_HEIGHT = 460

// Use small multiplicative zoom steps so repeated triggers stay visually smooth.
const ZOOM_IN_FACTOR = 10.02
const ZOOM_OUT_FACTOR = 10.98
const CONTINUOUS_ZOOM_INTERVAL_MS = 1

type ContinuousZoomDirection = 'in' | 'out'

// Seed a deterministic baseline scene for quick runtime/manual verification.
const createInitialScene = (revision: number): EngineSceneSnapshot => {
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
	const statusLine = root.querySelector<HTMLDivElement>('#status-line')
	if (!canvas || !commandGroup || !statusLine) {
		throw new Error('playground UI mount failed')
	}

	let sceneRevision = 1
	let continuousZoomDirection: ContinuousZoomDirection | null = null
	let continuousZoomTimer: number | null = null

	// Keep runtime initialization explicit for easier command-path debugging.
	const engine = createEngine({
		canvas,
		initialScene: createInitialScene(sceneRevision),
		culling: true,
		lod: {enabled: false},
		render: {
			quality: 'full',
			webglClearColor: [0.0667, 0.0941, 0.1529, 1],
			webglAntialias: true,
		},
	})

	// Update status from runtime diagnostics so command effects are visible.
	const refreshStatus = () => {
		const diagnostics = engine.getDiagnostics()
		const viewport = diagnostics.viewport
		statusLine.textContent = [
			`nodes ${diagnostics.scene.nodeCount}`,
			`scale ${viewport.scale.toFixed(3)}`,
			`offsetX ${viewport.offsetX.toFixed(1)}`,
			`offsetY ${viewport.offsetY.toFixed(1)}`,
			`zoomLoop ${continuousZoomDirection ?? 'off'}`,
		].join(' | ')
	}

	// Render once and refresh status after every command.
	const renderNow = async () => {
		await engine.renderFrame()
		refreshStatus()
	}

	// Keep test scene centered with modest margins in the canvas frame.
	const fitSceneToViewport = async () => {
		const frameRect = canvas.getBoundingClientRect()
		const viewportWidth = Math.max(1, Math.floor(frameRect.width))
		const viewportHeight = Math.max(1, Math.floor(frameRect.height))
		const nextScale = Math.min(
			(viewportWidth * 0.84) / TEST_SCENE_WIDTH,
			(viewportHeight * 0.84) / TEST_SCENE_HEIGHT,
		)

		engine.resize(viewportWidth, viewportHeight)
		engine.setViewport({
			viewportWidth,
			viewportHeight,
			scale: nextScale,
			offsetX: (viewportWidth - TEST_SCENE_WIDTH * nextScale) * 0.5,
			offsetY: (viewportHeight - TEST_SCENE_HEIGHT * nextScale) * 0.5,
		})

		await renderNow()
	}

	// Apply zoom around viewport center to keep command effects predictable.
	const zoomByFactor = async (factor: number) => {
		const diagnostics = engine.getDiagnostics()
		const viewport = diagnostics.viewport
		const anchor = {
			x: viewport.viewportWidth * 0.5,
			y: viewport.viewportHeight * 0.5,
		}
		engine.zoomTo(viewport.scale * factor, anchor)
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
		engine.loadScene(createInitialScene(sceneRevision))
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
		{label: 'Render Once', onClick: run(renderNow)},
		{label: 'Reset Scene', onClick: run(resetScene)},
		{label: 'Reset View', onClick: run(fitSceneToViewport)},
		{label: 'Zoom In', onClick: run(async () => zoomByFactor(ZOOM_IN_FACTOR))},
		{label: 'Zoom Out', onClick: run(async () => zoomByFactor(ZOOM_OUT_FACTOR))},
		{
			label: 'Pan Left',
			onClick: run(async () => {
				engine.panBy(36, 0)
				await renderNow()
			}),
		},
		{
			label: 'Pan Right',
			onClick: run(async () => {
				engine.panBy(-36, 0)
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

mountPlayground()
