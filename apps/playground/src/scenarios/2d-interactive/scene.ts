import type {EngineSceneSnapshot} from '@venus/engine'

const SCENE_WIDTH = 1600
const SCENE_HEIGHT = 980

/**
 * Build a dense 2D scene for hover and selection regression checks.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const build2DInteractiveScene = (revision: number): EngineSceneSnapshot => {
	const nodes: EngineSceneSnapshot['nodes'] = [
		{
			id: 'interactive-bg',
			type: 'shape',
			shape: 'rect',
			x: 20,
			y: 20,
			width: SCENE_WIDTH - 40,
			height: SCENE_HEIGHT - 40,
			cornerRadius: 24,
			fill: '#111827',
			stroke: '#334155',
			strokeWidth: 2,
		},
		{
			id: 'interactive-title',
			type: 'text',
			x: 66,
			y: 86,
			text: 'Scenario: 2D Hover & Selection',
			style: {
				fontFamily: 'IBM Plex Sans',
				fontSize: 30,
				fontWeight: 600,
				fill: '#e2e8f0',
			},
		},
	]

	for (let row = 0; row < 6; row += 1) {
		for (let col = 0; col < 10; col += 1) {
			const index = row * 10 + col
			nodes.push({
				id: `interactive-card-${index}`,
				type: 'shape',
				shape: col % 3 === 0 ? 'ellipse' : 'rect',
				x: 76 + col * 146,
				y: 170 + row * 120,
				width: 112,
				height: 86,
				cornerRadius: 14,
				fill: row % 2 === 0 ? '#1d4ed8' : '#0369a1',
				stroke: '#93c5fd',
				strokeWidth: 2,
			})
		}
	}

	return {
		revision,
		width: SCENE_WIDTH,
		height: SCENE_HEIGHT,
		nodes,
	}
}
