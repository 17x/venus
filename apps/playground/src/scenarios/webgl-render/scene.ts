import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'

const SCENE_WIDTH = 2000
const SCENE_HEIGHT = 1400

/**
 * Build a broad scene for WebGL packet and tile-cache behavior verification.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const buildWebglRenderScene = (revision: number): PlaygroundSceneSnapshot => {
	const nodes: PlaygroundSceneSnapshot['nodes'] = [
		{
			id: 'webgl-bg',
			type: 'shape',
			shape: 'rect',
			x: 24,
			y: 24,
			width: SCENE_WIDTH - 48,
			height: SCENE_HEIGHT - 48,
			cornerRadius: 20,
			fill: '#020617',
			stroke: '#334155',
			strokeWidth: 2,
		},
		{
			id: 'webgl-title',
			type: 'text',
			x: 72,
			y: 92,
			text: 'Scenario: WebGL Render Runtime',
			style: {
				fontFamily: 'IBM Plex Sans',
				fontSize: 30,
				fontWeight: 600,
				fill: '#bae6fd',
			},
		},
	]

	for (let layer = 0; layer < 12; layer += 1) {
		for (let index = 0; index < 28; index += 1) {
			const nodeIndex = layer * 28 + index
			nodes.push({
				id: `webgl-card-${nodeIndex}`,
				type: 'shape',
				shape: 'rect',
				x: 80 + index * 64,
				y: 170 + layer * 84,
				width: 54,
				height: 54,
				cornerRadius: 8,
				fill: layer % 2 === 0 ? '#2563eb' : '#1d4ed8',
				stroke: '#93c5fd',
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
