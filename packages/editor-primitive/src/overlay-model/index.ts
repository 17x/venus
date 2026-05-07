export type {HoverOutline, HoverOutlineGeometry} from './HoverOutline.ts'
export type {SelectedMarquee, SelectedMarqueeGeometry} from './SelectedMarquee.ts'
export type {SelectionBox} from './SelectionBox.ts'
export type {
  OverlayModel,
  OverlayModelGuide,
  OverlayModelTransformPreview,
} from './OverlayModel.ts'
export {createEmptyOverlayModel} from './OverlayModel.ts'

export {
  buildSelectedMarquee,
  buildSelectedMarqueeControls,
  buildSelectionBox,
  resolveMarqueeGeometryCorners,
} from './buildOverlayModel.ts'
export type {BuildSelectedMarqueeControlsOptions} from './buildOverlayModel.ts'

export {
  collectOverlayModelControls,
  resolveOverlayModelHit,
} from './resolveOverlayHit.ts'
export type {ResolveOverlayModelHitOptions} from './resolveOverlayHit.ts'
