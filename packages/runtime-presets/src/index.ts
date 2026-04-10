export {
  createSnapModule,
  SNAP_PRESET_BOUNDS,
  SNAP_PRESET_OFF,
  SNAP_PRESET_PRECISION,
  type CanvasSnapConfig,
  type CanvasSnapModule,
  type SnapComputationResult,
  type SnapHintDescriptor,
  type SnapMatch,
  type SnapTargetKind,
} from './presets/snapping.ts'
export {
  createSelectionModule,
  DEFAULT_SELECTION_CONFIG,
  type CanvasSelectionConfig,
  type CanvasSelectionModule,
  type SelectionAltClickBehavior,
  type SelectionInputPolicy,
  type SelectionMarqueeMatchMode,
  type SelectionMarqueePolicy,
  type SelectionSetMode,
} from './presets/selection.ts'
export { createDefaultEditorModules } from './presets/defaultEditorModules.ts'
