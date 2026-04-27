import type { EngineCanvasSurfaceFactory, EngineRenderFrame } from './types.ts'
import { createEngineWebGLResourceBudgetTracker } from './webglResources.ts'

function resolveDisplayPixelRatio(frame: EngineRenderFrame) {
  // Direct packet draws land on the app-owned main canvas, so display-facing
  // texture math must follow the stable output DPR instead of side-target DPR.
  return frame.context.outputPixelRatio ?? frame.context.pixelRatio ?? 1
}

export const MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME = 2
export const MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME = 16 * 1024 * 1024

export interface CachedTextureEntry {
  texture: WebGLTexture
  width: number
  height: number
  cacheKey?: string
  rasterScale?: number
}

export interface ImageUploadBudgetState {
  remainingUploads: number
  remainingBytes: number
}

export interface ResolvedImageTextureResult {
  texture: WebGLTexture | null
  uploadCount: number
  uploadBytes: number
  uploadMs: number
  downsampledUploadCount: number
  downsampledBytesSaved: number
  deferred: boolean
}

export function resolveTextCacheKey(packet: { textCacheKey?: string }) {
  // Keep cache reuse local to each text packet so unrelated scene revisions do
  // not invalidate every text texture at once.
  return packet.textCacheKey ?? 'text'
}

export function resolveTextRasterScale(frame: EngineRenderFrame) {
  // Track the effective text raster scale so we can reuse equal-or-higher
  // fidelity textures across zoom-outs without forcing a new upload.
  return resolveDisplayPixelRatio(frame) * frame.viewport.scale
}

export function countPendingImageTextureEstimate(
  packets: ReadonlyArray<{ kind: string; assetId?: string }>,
  imageCache: Map<string, CachedTextureEntry>,
) {
  let estimatedBytes = 0

  for (const packet of packets) {
    if (packet.kind !== 'image' || !packet.assetId || imageCache.has(packet.assetId)) {
      continue
    }

    // Keep a coarse placeholder estimate for not-yet-uploaded images without
    // recharging textures that are already resident in the cache.
    estimatedBytes += 4 * 1024 * 1024
  }

  return estimatedBytes
}

export function canReuseTextTexture(
  cached: CachedTextureEntry | undefined,
  textCacheKey: string,
  textRasterScale: number,
) {
  if (!cached || cached.cacheKey !== textCacheKey) {
    return false
  }

  const cachedRasterScale = cached.rasterScale ?? 0
  return cachedRasterScale >= textRasterScale
}

export function canReuseInteractiveTextTexture(
  cached: CachedTextureEntry | undefined,
  textCacheKey: string,
) {
  // Allow interactive previews to reuse any matching cached text texture so
  // motion stays legible even when the cached raster is lower-resolution.
  return Boolean(cached && cached.cacheKey === textCacheKey)
}

export function resolveImageCacheKey(assetId: string) {
  return `image:${assetId}`
}

export function resolveImageRasterScale(
  size: {width: number; height: number},
  worldBounds: {width: number; height: number},
  frame: EngineRenderFrame,
) {
  const pixelRatio = resolveDisplayPixelRatio(frame)
  const displayWidth = Math.max(1, Math.abs(worldBounds.width) * frame.viewport.scale * pixelRatio)
  const displayHeight = Math.max(1, Math.abs(worldBounds.height) * frame.viewport.scale * pixelRatio)
  const widthRatio = displayWidth / Math.max(1, size.width)
  const heightRatio = displayHeight / Math.max(1, size.height)

  // Bias slightly above the current display size so small zoom-ins can reuse
  // the uploaded texture before a higher-resolution upload is needed.
  return Math.min(1, Math.max(widthRatio, heightRatio) * 1.25)
}

export function canReuseImageTexture(
  cached: CachedTextureEntry | undefined,
  imageCacheKey: string,
  imageRasterScale: number,
) {
  if (!cached || cached.cacheKey !== imageCacheKey) {
    return false
  }

  const cachedRasterScale = cached.rasterScale ?? 0
  return cachedRasterScale >= imageRasterScale
}

export function createImageUploadSource(
  source: CanvasImageSource,
  size: {width: number; height: number},
  rasterScale: number,
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface'],
) {
  const targetWidth = Math.max(1, Math.min(size.width, Math.ceil(size.width * rasterScale)))
  const targetHeight = Math.max(1, Math.min(size.height, Math.ceil(size.height * rasterScale)))
  const shouldDownsample =
    rasterScale < 0.99 &&
    (targetWidth <= size.width * 0.85 || targetHeight <= size.height * 0.85)

  if (!shouldDownsample) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  const rasterSurface = createImageUploadSurface(targetWidth, targetHeight, createCanvasSurface)
  if (!rasterSurface) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  // Image upload downsampling only supports 2D raster surfaces.
  const rasterContext = rasterSurface.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null
  if (!rasterContext) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  rasterContext.clearRect(0, 0, targetWidth, targetHeight)
  rasterContext.drawImage(source, 0, 0, targetWidth, targetHeight)

  return {
    source: rasterSurface,
    width: targetWidth,
    height: targetHeight,
    downsampled: true,
  }
}

export function createImageUploadSurface(
  width: number,
  height: number,
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface'],
) {
  // Image upload scratch surfaces are host-owned so engine does not allocate DOM canvases.
  const nextSurface = createCanvasSurface?.(width, height)
  if (nextSurface) {
    return nextSurface
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }

  return null
}

export function resolvePacketTextureSourceRect(
  worldBounds: {x: number; y: number; width: number; height: number},
  frame: EngineRenderFrame,
) {
  const pixelRatio = resolveDisplayPixelRatio(frame)
  const scale = frame.viewport.scale
  const offsetX = frame.viewport.offsetX
  const offsetY = frame.viewport.offsetY
  // Convert world-space bounds into the same device-pixel crop rect used by
  // the Canvas2D model surface so texture uploads sample the correct pixels.
  const minX = Math.floor((worldBounds.x * scale + offsetX) * pixelRatio)
  const minY = Math.floor((worldBounds.y * scale + offsetY) * pixelRatio)
  const maxX = Math.ceil((
    (worldBounds.x + worldBounds.width) * scale + offsetX
  ) * pixelRatio)
  const maxY = Math.ceil((
    (worldBounds.y + worldBounds.height) * scale + offsetY
  ) * pixelRatio)

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

export function resolveImageTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  assetId: string,
  imageCache: Map<string, CachedTextureEntry>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
  uploadBudget: ImageUploadBudgetState,
): ResolvedImageTextureResult {
  const imageCacheKey = resolveImageCacheKey(assetId)
  const existing = imageCache.get(assetId)
  if (frame.context.quality === 'interactive' && existing?.cacheKey === imageCacheKey) {
    budget.markTextureUsed(assetId)
    return {
      texture: existing.texture,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  if (frame.context.quality === 'interactive') {
    // Freeze expensive texture uploads during active interaction and rely on
    // settled frames to populate missing image textures.
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: true,
    }
  }

  const source = frame.context.loader?.resolveImage(assetId)
  if (!source) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  const size = resolveCanvasImageSourceSize(source)
  const width = Math.max(1, size.width)
  const height = Math.max(1, size.height)
  const imageRasterScale = resolveImageRasterScale(size, worldBounds, frame)
  if (canReuseImageTexture(existing, imageCacheKey, imageRasterScale)) {
    budget.markTextureUsed(assetId)
    return {
      texture: existing?.texture ?? null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  const uploadSource = createImageUploadSource(source, size, imageRasterScale)
  const uploadWidth = Math.max(1, uploadSource.width)
  const uploadHeight = Math.max(1, uploadSource.height)
  const uploadBytes = uploadWidth * uploadHeight * 4
  const downsampledBytesSaved = Math.max(0, width * height * 4 - uploadBytes)
  const canSpendOversizedSingleUpload =
    uploadBudget.remainingUploads > 0 &&
    uploadBudget.remainingBytes === MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME
  if (
    uploadBudget.remainingUploads <= 0 ||
    (uploadBudget.remainingBytes < uploadBytes && !canSpendOversizedSingleUpload)
  ) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: true,
    }
  }

  const texture = existing?.texture ?? context.createTexture()
  if (!texture) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  const imageUploadStart = performance.now()
  try {
    const textureSource = uploadSource.source as unknown as TexImageSource
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      textureSource,
    )
  } catch {
    context.deleteTexture(texture)
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }
  const imageUploadMs = performance.now() - imageUploadStart

  uploadBudget.remainingUploads -= 1
  // Clamp to zero so one oversized upload can consume the whole frame budget
  // without causing negative accounting or an infinite deferred loop.
  uploadBudget.remainingBytes = Math.max(0, uploadBudget.remainingBytes - uploadBytes)
  imageCache.set(assetId, {
    texture,
    width: uploadWidth,
    height: uploadHeight,
    cacheKey: imageCacheKey,
    rasterScale: imageRasterScale,
  })
  budget.markTextureResident(assetId, uploadBytes)
  budget.markTextureUsed(assetId)

  return {
    texture,
    uploadCount: 1,
    uploadBytes,
    uploadMs: imageUploadMs,
    downsampledUploadCount: uploadSource.downsampled ? 1 : 0,
    downsampledBytesSaved,
    deferred: false,
  }
}

function resolveCanvasImageSourceSize(source: CanvasImageSource) {
  const candidate = source as {
    width?: number
    height?: number
    naturalWidth?: number
    naturalHeight?: number
    videoWidth?: number
    videoHeight?: number
  }

  const width =
    candidate.naturalWidth ??
    candidate.videoWidth ??
    candidate.width ??
    1
  const height =
    candidate.naturalHeight ??
    candidate.videoHeight ??
    candidate.height ??
    1

  return {
    width,
    height,
  }
}
