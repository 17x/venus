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
  tryReuseInteractiveCompositeFrame,
} from './interaction/webglInteractionPreview.ts'

export type {
  CompositeTextureSource,
  InteractionCompositeSnapshot,
} from './composite/webglComposite.ts'

export type {
  ScreenRectPx,
} from './interaction/webglInteractionPreview.ts'
