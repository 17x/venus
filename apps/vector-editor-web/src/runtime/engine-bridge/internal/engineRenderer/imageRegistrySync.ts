import type {RuntimeEngine} from '../../engine.ts'

type ImageRegistryEngine = Pick<RuntimeEngine, 'setImageRegistry'>

/**
 * Reconciles document image URLs with the engine registry and schedules a redraw
 * after each image becomes drawable.
 */
export function syncImageRegistry(input: {
  assetUrls: ReadonlyMap<string, string>
  imageCache: Map<string, HTMLImageElement>
  engine: ImageRegistryEngine | null
  createImage?: () => HTMLImageElement
  requestRender: () => void
}): void {
  const createImage = input.createImage ?? (() => new Image())

  for (const [assetId, image] of input.imageCache) {
    const expectedUrl = input.assetUrls.get(assetId)
    if (!expectedUrl || image.getAttribute('src') !== expectedUrl) {
      input.imageCache.delete(assetId)
    }
  }

  for (const [assetId, assetUrl] of input.assetUrls) {
    if (input.imageCache.has(assetId)) {
      continue
    }

    const image = createImage()
    image.onload = () => {
      if (input.imageCache.get(assetId) !== image) {
        return
      }
      input.engine?.setImageRegistry(input.imageCache)
      input.requestRender()
    }
    image.onerror = () => {
      if (input.imageCache.get(assetId) === image) {
        input.imageCache.delete(assetId)
        input.engine?.setImageRegistry(input.imageCache)
        input.requestRender()
      }
    }
    image.setAttribute('src', assetUrl)
    input.imageCache.set(assetId, image)
  }

  input.engine?.setImageRegistry(input.imageCache)
}
