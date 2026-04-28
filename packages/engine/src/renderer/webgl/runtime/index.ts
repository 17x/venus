/**
 * Renderer/WebGL runtime barrel.
 * Re-exports texture/resource/surface/runtime helper utilities.
 */
export {
  createEngineWebGLResourceBudgetTracker,
} from './resources.ts'

export {
  MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
  MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
  canReuseInteractiveTextTexture,
  canReuseTextTexture,
  countPendingImageTextureEstimate,
  resolveImageTexture,
  resolvePacketTextureSourceRect,
  resolveTextCacheKey,
  resolveTextRasterScale,
} from './textures.ts'

export {
  copyCanvasRegion,
  createModelSurface,
  drawInteractiveTextFallback,
  resolveBaseSceneRenderMode,
  resolveCachedTextureBytes,
  shouldSkipTextPlaceholderPacket,
  TEXT_PLACEHOLDER_MAX_SCALE,
} from './surfaceHelpers.ts'

export {
  disposeCachedTextures,
  disposeEvictedTextures,
  pruneTextCache,
  shouldBypassTileCompositorForFrame,
  shouldSkipInteractiveTinyPacket,
  shouldSkipOverviewImagePacket,
} from './runtimeHelpers.ts'

export type {
  CachedTextureEntry,
  ImageUploadBudgetState,
} from './textures.ts'
