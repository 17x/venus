import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'

const SCENE_WIDTH = 1800
const SCENE_HEIGHT = 1260

/**
 * Build a pseudo-3D layered scene to validate spatial ordering and culling assumptions.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const build3DSpatialScene = (revision: number): PlaygroundSceneSnapshot => {
	const nodes: PlaygroundSceneSnapshot['nodes'] = [
		{
			id: 'spatial-bg',
			type: 'shape',
			shape: 'rect',
			x: 24,
			y: 24,
			width: SCENE_WIDTH - 48,
			height: SCENE_HEIGHT - 48,
			cornerRadius: 28,
			fill: '#020617',
			stroke: '#334155',
			strokeWidth: 2,
		},
		{
			id: 'spatial-title',
			type: 'text',
			x: 70,
			y: 86,
			text: 'Scenario: 3D Spatial Projection (2.5D Simulation)',
			style: {
				fontFamily: 'IBM Plex Sans',
				fontSize: 28,
				fontWeight: 600,
				fill: '#e2e8f0',
			},
		},
	]

	for (let layer = 0; layer < 8; layer += 1) {
		for (let index = 0; index < 12; index += 1) {
			const baseX = 140 + index * 122 + layer * 16
			const baseY = 220 + layer * 90
			const size = 84 - Math.min(layer * 4, 20)
			const nodeId = layer * 100 + index
			nodes.push({
				id: `spatial-layer-node-${nodeId}`,
				type: 'shape',
				shape: layer % 2 === 0 ? 'rect' : 'ellipse',
				x: baseX,
				y: baseY,
				width: size,
				height: size,
				cornerRadius: 12,
				fill: layer % 2 === 0 ? '#1d4ed8' : '#0ea5e9',
				stroke: '#bfdbfe',
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
