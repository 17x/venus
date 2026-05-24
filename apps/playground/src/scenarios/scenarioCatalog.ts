import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

import {build3DSpatialScene} from './3d-spatial/scene'
import {build2DBasicScene} from './2d-basic/scene'
import {build2DInteractiveScene} from './2d-interactive/scene'
import {build2DPerformanceScene} from './2d-performance/scene'
import {buildCanvas2DFallbackScene} from './canvas2d-fallback/scene'
import {buildHeadlessDeterministicScene} from './headless-deterministic/scene'
import {buildWebglRenderScene} from './webgl-render/scene'

/** Describes one playground scenario in the engine capability matrix. */
export type PlaygroundScenario = {
	/** Stable scenario id used by URL query and command panel state. */
	id: string
	/** Human-readable scenario label shown in the command panel. */
	label: string
	/** Short scenario intent summary shown next to status diagnostics. */
	description: string
	/** Validation tags used for manual matrix audits and future automation. */
	tags: ReadonlyArray<string>
	/** Build the scenario snapshot used by the current engine session. */
	buildScene: (revision: number) => PlaygroundSceneSnapshot
}

/**
 * Build the full scenario catalog used by the playground command panel.
 * @param revision Current revision value used to construct deterministic scenes.
 */
export const createScenarioCatalog = (revision: number): ReadonlyArray<PlaygroundScenario> => {
	return [
		{
			id: '2d-basic',
			label: '2D Basic Coverage',
			description: 'Rect / ellipse / line / text baseline rendering coverage.',
			tags: ['2d', 'baseline', 'shape-text'],
			buildScene: () => build2DBasicScene(revision),
		},
		{
			id: '2d-interactive',
			label: '2D Hover + Selection',
			description: 'Dense primitives for hover and selection overlay regression checks.',
			tags: ['2d', 'interaction', 'overlay'],
			buildScene: () => build2DInteractiveScene(revision),
		},
		{
			id: '2d-performance',
			label: '2D Performance Grid',
			description: 'Large node-count pressure test for frame-time and culling behavior.',
			tags: ['2d', 'performance', 'culling'],
			buildScene: () => build2DPerformanceScene(revision),
		},
		{
			id: 'webgl-render',
			label: 'WebGL Runtime Surface',
			description: 'Packet and tile-cache friendly scene for WebGL diagnostics.',
			tags: ['webgl', 'renderer', 'packet'],
			buildScene: () => buildWebglRenderScene(revision),
		},
		{
			id: 'canvas2d-fallback',
			label: 'Canvas2D Fallback Surface',
			description: 'Compact fallback scene to inspect Canvas2D compatibility behavior.',
			tags: ['canvas2d', 'fallback'],
			buildScene: () => buildCanvas2DFallbackScene(revision),
		},
		{
			id: 'headless-deterministic',
			label: 'Headless Deterministic Mirror',
			description: 'Stable geometry for browser and headless output comparisons.',
			tags: ['headless', 'determinism'],
			buildScene: () => buildHeadlessDeterministicScene(revision),
		},
		{
			id: '3d-spatial',
			label: '3D Spatial Projection',
			description: '2.5D layered projection to validate spatial index and ordering assumptions.',
			tags: ['3d', 'spatial-index', 'projection'],
			buildScene: () => build3DSpatialScene(revision),
		},
	]
}

/**
 * Resolve the initial scenario from URL query with safe fallback semantics.
 * @param scenarios Complete scenario catalog that can satisfy user selection.
 */
export const resolveInitialScenarioId = (scenarios: ReadonlyArray<PlaygroundScenario>): string => {
	const fallbackId = scenarios[0]?.id ?? ''
	if (!fallbackId) {
		return ''
	}

	const searchParams = new URLSearchParams(window.location.search)
	const selected = searchParams.get('scenario')
	if (!selected) {
		return fallbackId
	}

	const hasSelected = scenarios.some((scenario) => scenario.id === selected)
	return hasSelected ? selected : fallbackId
}

/**
 * Update URL query so scenario selection is copyable and reproducible.
 * @param scenarioId Current scenario id selected in the command panel.
 */
export const syncScenarioQuery = (scenarioId: string): void => {
	const url = new URL(window.location.href)
	url.searchParams.set('scenario', scenarioId)
	window.history.replaceState({}, '', url)
}
