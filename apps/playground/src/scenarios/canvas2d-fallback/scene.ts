import type {EngineSceneSnapshot} from '@venus/engine'

const SCENE_WIDTH = 1100
const SCENE_HEIGHT = 760

/**
 * Build a compact scene to verify Canvas2D fallback paths and overlays.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const buildCanvas2DFallbackScene = (revision: number): EngineSceneSnapshot => {
	return {
		revision,
		width: SCENE_WIDTH,
		height: SCENE_HEIGHT,
		nodes: [
			{
				id: 'canvas-bg',
				type: 'shape',
				shape: 'rect',
				x: 24,
				y: 24,
				width: SCENE_WIDTH - 48,
				height: SCENE_HEIGHT - 48,
				cornerRadius: 18,
				fill: '#0f172a',
				stroke: '#334155',
				strokeWidth: 2,
			},
			{
				id: 'canvas-card-a',
				type: 'shape',
				shape: 'rect',
				x: 84,
				y: 140,
				width: 280,
				height: 200,
				cornerRadius: 18,
				fill: '#0f766e',
				stroke: '#14b8a6',
				strokeWidth: 2,
			},
			{
				id: 'canvas-card-b',
				type: 'shape',
				shape: 'ellipse',
				x: 430,
				y: 156,
				width: 220,
				height: 170,
				fill: '#7c2d12',
				stroke: '#fb923c',
				strokeWidth: 2,
			},
			{
				id: 'canvas-card-c',
				type: 'shape',
				shape: 'rect',
				x: 706,
				y: 168,
				width: 220,
				height: 150,
				cornerRadius: 18,
				fill: '#1e3a8a',
				stroke: '#60a5fa',
				strokeWidth: 2,
			},
		],
	}
}
