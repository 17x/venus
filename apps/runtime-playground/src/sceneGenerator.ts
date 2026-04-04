import {nid, type DocumentNode, type EditorDocument} from '@venus/document-core'

const RANDOM_SEED = 424242
const IMAGE_VARIANT_COUNT = 24

function createSeededRandom(seed = RANDOM_SEED) {
  let current = seed >>> 0

  return () => {
    current = (1664525 * current + 1013904223) >>> 0
    return current / 0x100000000
  }
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min
}

function createStressImageDataUrl(variant: number) {
  const hue = (variant * 51 + 18) % 360
  const accentHue = (hue + 32) % 360
  const width = 320
  const height = 220
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg-${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 78% 70%)" />
          <stop offset="100%" stop-color="hsl(${accentHue} 82% 54%)" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="24" fill="url(#bg-${variant})" />
      <circle cx="${196 + (variant % 8) * 12}" cy="${52 + (variant % 5) * 7}" r="${24 + (variant % 4) * 5}" fill="rgba(255,255,255,0.24)" />
      <path d="M0 ${154 + (variant % 4) * 5} C ${54 + (variant % 6) * 9} ${112 + (variant % 5) * 6}, ${146 + (variant % 7) * 8} ${212 - (variant % 6) * 7}, 320 ${132 + (variant % 4) * 6} L 320 220 L 0 220 Z" fill="rgba(15,23,42,0.18)" />
      <text x="24" y="94" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="white">Stress Image ${variant + 1}</text>
      <text x="24" y="128" font-family="Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.88)">Canvas runtime mock asset</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const STRESS_IMAGE_ASSETS = Array.from(
  {length: IMAGE_VARIANT_COUNT},
  (_, index) => createStressImageDataUrl(index),
)

function shouldCreateImage(index: number, shapeCount: number, density: 'default' | 'high') {
  const targetImages = density === 'high'
    ? Math.max(1, Math.floor(shapeCount * 0.5))
    : Math.max(4, Math.min(24, Math.floor(shapeCount / 2000)))
  const interval = Math.max(1, Math.floor(shapeCount / targetImages))
  return index > 0 && index % interval === 0
}

function createRandomShape(
  random: () => number,
  index: number,
  shapeCount: number,
  density: 'default' | 'high',
  frame: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>,
): DocumentNode {
  const isImage = shouldCreateImage(index, shapeCount, density)
  const kindRoll = random()
  const type: DocumentNode['type'] = isImage
    ? 'image'
    : kindRoll < 0.6 ? 'rectangle' : kindRoll < 0.9 ? 'ellipse' : 'lineSegment'
  const width = isImage ? randomInt(random, 180, 320) : randomInt(random, 16, 220)
  const height = isImage ? randomInt(random, 120, 220) : randomInt(random, 16, 180)
  const padding = 48
  const x = randomInt(
    random,
    frame.x + padding,
    frame.x + Math.max(padding, frame.width - width - padding),
  )
  const y = randomInt(
    random,
    frame.y + padding,
    frame.y + Math.max(padding, frame.height - height - padding),
  )

  return {
    id: nid(),
    type,
    name: `${type}-${index}`,
    assetUrl: isImage ? STRESS_IMAGE_ASSETS[(index * 7) % STRESS_IMAGE_ASSETS.length] : undefined,
    x,
    y,
    width,
    height,
  }
}

/**
 * Generates a large deterministic stress scene for render and hit-test work.
 */
export function createStressDocument(
  shapeCount: number,
  options?: {imageDensity?: 'default' | 'high'},
): EditorDocument {
  const random = createSeededRandom()
  const imageDensity = options?.imageDensity ?? 'default'
  const frameWidth = 16000
  const frameHeight = 12000
  const frameX = 2400
  const frameY = 1800
  const frame: DocumentNode = {
    id: 'frame-root',
    type: 'frame',
    name: 'Stress Frame',
    x: frameX,
    y: frameY,
    width: frameWidth,
    height: frameHeight,
  }
  const shapes: DocumentNode[] = [frame]

  for (let index = 0; index < shapeCount; index += 1) {
    shapes.push(createRandomShape(random, index, shapeCount, imageDensity, frame))
  }

  return {
    id: `runtime-stress-${imageDensity}-${shapeCount}`,
    name: imageDensity === 'high' ? `Runtime Image Heavy ${shapeCount}` : `Runtime Stress ${shapeCount}`,
    width: frameWidth + frameX * 2,
    height: frameHeight + frameY * 2,
    shapes,
  }
}
