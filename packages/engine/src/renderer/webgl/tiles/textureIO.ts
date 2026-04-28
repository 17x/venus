/**
 * Renderer/WebGL tile subsystem IO module.
 * Owns tile texture upload/crop/framebuffer-region helper operations.
 * Does not own tile scheduling policy or backend orchestration.
 */
import type { EngineCanvasSurfaceFactory, EngineRenderFrame } from '../../types/index.ts'
import { createModelSurface } from '../runtime/index.ts'
import type { TileZoomLevel } from '../../tileManager/index.ts'

const TEXTURE_BYTES_PER_PIXEL_RGBA = 4
const TILE_ZOOM_LEVEL_MIN = 0
const TILE_ZOOM_LEVEL_MAX = 5

/**
 * Resolves framebuffer sample region for one tile in current viewport.
 * @param options Options object for this operation.
 */
export function resolveTileFramebufferRegion(options: {
  frame: EngineRenderFrame
  tileBounds: {x: number; y: number; width: number; height: number}
  viewportWidthPx: number
  viewportHeightPx: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const scale = options.frame.viewport.scale
  const offsetX = options.frame.viewport.offsetX
  const offsetY = options.frame.viewport.offsetY
  // Keep tile capture math consistent with drawWebGLPacket world->screen transform.
  const tileScreenX = options.tileBounds.x * scale + offsetX
  const tileScreenY = options.tileBounds.y * scale + offsetY
  const tileScreenWidth = options.tileBounds.width * scale
  const tileScreenHeight = options.tileBounds.height * scale
  const tilePixelX = tileScreenX * pixelRatio
  const tilePixelY = tileScreenY * pixelRatio
  const tilePixelWidth = Math.max(1, Math.ceil(tileScreenWidth * pixelRatio))
  const tilePixelHeight = Math.max(1, Math.ceil(tileScreenHeight * pixelRatio))
  const sourceMinX = Math.max(0, Math.floor(tilePixelX))
  const sourceMinY = Math.max(0, Math.floor(tilePixelY))
  const sourceMaxX = Math.min(options.viewportWidthPx, Math.ceil(tilePixelX + tilePixelWidth))
  const sourceMaxY = Math.min(options.viewportHeightPx, Math.ceil(tilePixelY + tilePixelHeight))
  // If capture bounds are clamped by viewport edges, the extracted texture is only partial.
  const isClipped =
    sourceMinX > Math.floor(tilePixelX) ||
    sourceMinY > Math.floor(tilePixelY) ||
    sourceMaxX < Math.ceil(tilePixelX + tilePixelWidth) ||
    sourceMaxY < Math.ceil(tilePixelY + tilePixelHeight)

  return {
    sourceX: sourceMinX,
    sourceY: sourceMinY,
    sourceWidth: Math.max(1, sourceMaxX - sourceMinX),
    sourceHeight: Math.max(1, sourceMaxY - sourceMinY),
    framebufferHeight: options.viewportHeightPx,
    isClipped,
  }
}

/**
 * Uploads one canvas surface as a texture for tile-seeding draw path.
 * @param context Rendering context.
 * @param source Canvas source used for texture upload.
 */
export function uploadSurfaceTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  source: HTMLCanvasElement | OffscreenCanvas,
) {
  const texture = context.createTexture()
  if (!texture) {
    return null
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      source as unknown as TexImageSource,
    )
  } catch {
    context.deleteTexture(texture)
    return null
  }

  return texture
}

/**
 * Uploads one tile surface into a reusable or freshly allocated texture.
 * @param context Rendering context.
 * @param existingTexture Existing texture when cache entry already owns one.
 * @param tileSurface Tile canvas snapshot to upload.
 */
export function uploadTileTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  existingTexture: WebGLTexture | null,
  tileSurface: HTMLCanvasElement | OffscreenCanvas,
) {
  const texture = existingTexture ?? context.createTexture()
  if (!texture) {
    return {
      texture: null,
      textureBytes: 0,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      tileSurface as unknown as TexImageSource,
    )
  } catch {
    if (!existingTexture) {
      context.deleteTexture(texture)
    }
    return {
      texture: null,
      textureBytes: 0,
    }
  }

  const width = tileSurface.width
  const height = tileSurface.height
  return {
    texture,
    textureBytes: Math.max(1, width * height * TEXTURE_BYTES_PER_PIXEL_RGBA),
  }
}

/**
 * Builds one tile-sized canvas by cropping from the model surface.
 * @param options Options object for this operation.
 */
export function buildTileTextureSourceFromModelSurface(options: {
  modelSurface: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  frame: EngineRenderFrame
  tileBounds: {x: number; y: number; width: number; height: number}
  viewportWidthPx: number
  viewportHeightPx: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const scale = options.frame.viewport.scale
  const offsetX = options.frame.viewport.offsetX
  const offsetY = options.frame.viewport.offsetY
  // Use the same transform basis as runtime draw submission to avoid tile/overlay drift.
  const tileScreenX = options.tileBounds.x * scale + offsetX
  const tileScreenY = options.tileBounds.y * scale + offsetY
  const tileScreenWidth = options.tileBounds.width * scale
  const tileScreenHeight = options.tileBounds.height * scale

  const tilePixelX = tileScreenX * pixelRatio
  const tilePixelY = tileScreenY * pixelRatio
  const tilePixelWidth = Math.max(1, Math.ceil(tileScreenWidth * pixelRatio))
  const tilePixelHeight = Math.max(1, Math.ceil(tileScreenHeight * pixelRatio))

  const sourceMinX = Math.max(0, Math.floor(tilePixelX))
  const sourceMinY = Math.max(0, Math.floor(tilePixelY))
  const sourceMaxX = Math.min(options.viewportWidthPx, Math.ceil(tilePixelX + tilePixelWidth))
  const sourceMaxY = Math.min(options.viewportHeightPx, Math.ceil(tilePixelY + tilePixelHeight))
  const sourceWidth = sourceMaxX - sourceMinX
  const sourceHeight = sourceMaxY - sourceMinY

  const tileSurface = createModelSurface(
    tilePixelWidth,
    tilePixelHeight,
    options.createCanvasSurface,
  )
  if (!tileSurface) {
    return null
  }

  const tileContext = tileSurface.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!tileContext) {
    return null
  }

  tileContext.clearRect(0, 0, tilePixelWidth, tilePixelHeight)

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return tileSurface.canvas
  }

  const destinationX = sourceMinX - tilePixelX
  const destinationY = sourceMinY - tilePixelY
  tileContext.drawImage(
    options.modelSurface,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    sourceWidth,
    sourceHeight,
  )

  return tileSurface.canvas
}

/**
 * Clamps arbitrary zoom value into tile-cache bucket domain.
 * @param value Zoom bucket candidate.
 */
export function clampTileZoomLevel(value: number): TileZoomLevel {
  const rounded = Math.round(value)
  if (rounded <= TILE_ZOOM_LEVEL_MIN) return TILE_ZOOM_LEVEL_MIN
  if (rounded >= TILE_ZOOM_LEVEL_MAX) return TILE_ZOOM_LEVEL_MAX
  return rounded as TileZoomLevel
}