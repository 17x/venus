/**
 * Renderer/WebGL preview barrel.
 * Re-exports snapshot composite and interaction preview primitives.
 */
export {
  captureCompositeSnapshotFromCurrentFramebuffer,
  drawCompositeTextureFrame,
  resolveCompositeSnapshotPixelRatio,
  resolveCompositeTexturePresentationFlipY,
} from './composite/webglComposite.ts'

export {
  resolveInteractionPreviewExecutionMode,
  tryReuseInteractiveCompositeFrame,
} from './interaction/webglInteractionPreview.ts'

export type {
  CompositeTextureSource,
  InteractionCompositeSnapshot,
} from './composite/webglComposite.ts'

export type {
  InteractionPreviewExecutionMode,
  ScreenRectPx,
} from './interaction/webglInteractionPreview.ts'
