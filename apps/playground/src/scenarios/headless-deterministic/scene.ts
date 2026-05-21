import type {EngineSceneSnapshot} from '@venus/engine'

const SCENE_WIDTH = 1000
const SCENE_HEIGHT = 700

/**
 * Build a deterministic scene that is mirrored in headless verification harnesses.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const buildHeadlessDeterministicScene = (revision: number): EngineSceneSnapshot => {
	return {
		revision,
		width: SCENE_WIDTH,
		height: SCENE_HEIGHT,
		nodes: [
			{
				id: 'headless-bg',
				type: 'shape',
				shape: 'rect',
				x: 20,
				y: 20,
				width: SCENE_WIDTH - 40,
				height: SCENE_HEIGHT - 40,
				cornerRadius: 16,
				fill: '#0f172a',
				stroke: '#334155',
				strokeWidth: 2,
			},
			{
				id: 'headless-guideline-x',
				type: 'shape',
				shape: 'line',
				x: 80,
				y: 350,
				width: 840,
				height: 0,
				stroke: '#475569',
				strokeWidth: 2,
			},
			{
				id: 'headless-guideline-y',
				type: 'shape',
				shape: 'line',
				x: 500,
				y: 92,
				width: 0,
				height: 520,
				stroke: '#475569',
				strokeWidth: 2,
			},
			{
				id: 'headless-node-a',
				type: 'shape',
				shape: 'rect',
				x: 300,
				y: 250,
				width: 180,
				height: 120,
				cornerRadius: 12,
				fill: '#1d4ed8',
				stroke: '#93c5fd',
				strokeWidth: 2,
			},
			{
				id: 'headless-node-b',
				type: 'shape',
				shape: 'ellipse',
				x: 560,
				y: 262,
				width: 132,
				height: 108,
				fill: '#0f766e',
				stroke: '#2dd4bf',
				strokeWidth: 2,
			},
		],
	}
}
