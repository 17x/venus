// Runtime facade keeps app imports stable while constraining surface ownership.
// Keep this root barrel explicit so only consumed contracts stay public.

export {
	createDefaultCanvasRuntimeApi,
} from './core/defaultRuntimeApi.ts'
export {
	DEFAULT_CANVAS_PRESENTATION_CONFIG,
	type CanvasPresentationConfig,
	type CanvasPresentationConfigPatch,
	type CanvasRuntimeApi,
} from './core/createCanvasRuntimeApi.ts'
export {
	type DefaultCanvasRuntimeOptions,
} from './core/defaultRuntime.ts'
export {
	createTransformPreviewCommitController,
	isTransformPreviewSynced,
	type DocumentShapeGeometry,
	type TransformPreviewState,
} from './core/transformPreviewCommitController.ts'
export {
	type CanvasRuntimeSnapshot,
} from './core/createCanvasRuntimeController.ts'

export {
	createRuntimeInputRouter,
} from './events/index/index.ts'

export {
	RUNTIME_ZOOM_PRESETS,
} from './interaction/zoomPresets.ts'

export {
	buildRuntimeOverlayInstructions,
	buildRuntimePathEditInstructions,
	isPathOverlayHitRegion,
	type RuntimeOverlayInstruction,
} from './overlay/index.ts'
export {
	type RuntimePreviewInstruction,
} from './preview/index.ts'

export {
	resolveRuntimeCursor,
	type RuntimeCursorState,
} from './cursor/resolveRuntimeCursor.ts'
export {
	createRuntimeSelectionChromeRegistry,
	type RuntimeSelectionChromeState,
} from './chrome/registry.ts'

export {
	createRuntimeToolRegistry,
	type RuntimeToolRegistry,
} from './tools/registry.ts'

export {
	createRuntimeEditingModeController,
	type RuntimeEditingMode,
	type RuntimeEditingModeController,
} from './editing-modes/controller.ts'

export {
	applyMatrixToPoint,
} from './viewport/matrix.ts'
export type {
	CanvasViewportState,
} from './viewport/controller.ts'

