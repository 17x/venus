export type TextureSampler = (u: number, v: number) => string

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export const createTextureSamplerFromUrl = async (url: string): Promise<TextureSampler> => {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, image.naturalWidth || image.width)
  canvas.height = Math.max(1, image.naturalHeight || image.height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error(`texture sampler init failed: ${url}`)
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  return (u: number, v: number): string => {
    const uu = u - Math.floor(u)
    const vv = v - Math.floor(v)
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(clamp01(uu) * (canvas.width - 1))))
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(clamp01(vv) * (canvas.height - 1))))
    const offset = (y * canvas.width + x) * 4
    const r = pixels[offset] ?? 0
    const g = pixels[offset + 1] ?? 0
    const b = pixels[offset + 2] ?? 0
    return `rgb(${r}, ${g}, ${b})`
  }
}
