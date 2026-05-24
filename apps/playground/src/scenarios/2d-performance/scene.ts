import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'

const SCENE_WIDTH = 3000
const SCENE_HEIGHT = 2200
const GRID_COLS = 80
const GRID_ROWS = 50

/**
 * Build a large primitive grid for frame-time and culling pressure checks.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const build2DPerformanceScene = (revision: number): PlaygroundSceneSnapshot => {
	const nodes: PlaygroundSceneSnapshot['nodes'] = []

	nodes.push({
		id: 'perf-bg',
		type: 'shape',
		shape: 'rect',
		x: 20,
		y: 20,
		width: SCENE_WIDTH - 40,
		height: SCENE_HEIGHT - 40,
		cornerRadius: 24,
		fill: '#0f172a',
		stroke: '#1e293b',
		strokeWidth: 2,
	})

	for (let row = 0; row < GRID_ROWS; row += 1) {
		for (let col = 0; col < GRID_COLS; col += 1) {
			const index = row * GRID_COLS + col
			nodes.push({
				id: `perf-node-${index}`,
				type: 'shape',
				shape: index % 5 === 0 ? 'ellipse' : 'rect',
				x: 40 + col * 36,
				y: 80 + row * 40,
				width: 26,
				height: 26,
				cornerRadius: 6,
				fill: index % 2 === 0 ? '#22d3ee' : '#0ea5e9',
				stroke: '#0369a1',
				strokeWidth: 1,
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
