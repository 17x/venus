import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'

const SCENE_WIDTH = 1200
const SCENE_HEIGHT = 760

/**
 * Build a baseline 2D scene that covers rect, ellipse, line, and text payloads.
 * @param revision Monotonic scene revision for deterministic cache invalidation.
 */
export const build2DBasicScene = (revision: number): PlaygroundSceneSnapshot => {
	return {
		revision,
		width: SCENE_WIDTH,
		height: SCENE_HEIGHT,
		nodes: [
			{
				id: 'basic-bg',
				type: 'shape',
				shape: 'rect',
				x: 30,
				y: 30,
				width: SCENE_WIDTH - 60,
				height: SCENE_HEIGHT - 60,
				cornerRadius: 28,
				fill: '#0f172a',
				stroke: '#334155',
				strokeWidth: 2,
			},
			{
				id: 'basic-title',
				type: 'text',
				x: 72,
				y: 86,
				text: 'Scenario: 2D Basic Coverage',
				style: {
					fontFamily: 'IBM Plex Sans',
					fontSize: 30,
					fontWeight: 600,
					fill: '#e2e8f0',
				},
			},
			{
				id: 'basic-subtitle',
				type: 'text',
				x: 72,
				y: 126,
				text: 'Rect / Ellipse / Line / Text in one viewport',
				style: {
					fontFamily: 'IBM Plex Sans',
					fontSize: 16,
					fill: '#93c5fd',
				},
			},
			{
				id: 'basic-card-a',
				type: 'shape',
				shape: 'rect',
				x: 84,
				y: 190,
				width: 260,
				height: 180,
				cornerRadius: 20,
				fill: '#0f766e',
				stroke: '#2dd4bf',
				strokeWidth: 3,
			},
			{
				id: 'basic-card-b',
				type: 'shape',
				shape: 'rect',
				x: 384,
				y: 190,
				width: 320,
				height: 180,
				cornerRadius: 24,
				fill: '#1e293b',
				stroke: '#64748b',
				strokeWidth: 2,
			},
			{
				id: 'basic-orb',
				type: 'shape',
				shape: 'ellipse',
				x: 770,
				y: 182,
				width: 260,
				height: 200,
				fill: '#78350f',
				stroke: '#f59e0b',
				strokeWidth: 3,
			},
			{
				id: 'basic-link-a',
				type: 'shape',
				shape: 'line',
				x: 344,
				y: 282,
				width: 40,
				height: 0,
				stroke: '#94a3b8',
				strokeWidth: 3,
			},
			{
				id: 'basic-link-b',
				type: 'shape',
				shape: 'line',
				x: 704,
				y: 282,
				width: 66,
				height: 0,
				stroke: '#cbd5e1',
				strokeWidth: 3,
			},
		],
	}
}
