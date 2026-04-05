import {
  convertDrawPointsToBezierPoints,
  getBoundingRectFromBezierPoints,
  nid,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type Point,
} from '@venus/document-core'

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

function createStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function createBezierWavePoints(
  random: () => number,
  x: number,
  y: number,
  width: number,
  height: number,
): Point[] {
  const pointCount = 5 + randomInt(random, 0, 2)

  return Array.from({length: pointCount}, (_, index) => {
    const progress = pointCount === 1 ? 0 : index / (pointCount - 1)
    const jitterX = index === 0 || index === pointCount - 1 ? 0 : (random() - 0.5) * width * 0.12
    const wave = Math.sin(progress * Math.PI * 1.5 + random() * 0.6) * height * 0.28
    const bias = (random() - 0.5) * height * 0.16

    return {
      x: x + progress * width + jitterX,
      y: y + height * 0.5 + wave + bias,
    }
  })
}

function createBezierPathShape(
  random: () => number,
  index: number,
  frame: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>,
): DocumentNode {
  const width = randomInt(random, 180, 340)
  const height = randomInt(random, 110, 220)
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
  const points = createBezierWavePoints(random, x, y, width, height)
  // Stress scenes should exercise the real bezier render and hit-test path,
  // not just polyline fallback, so mock paths are generated from sampled points.
  const path = convertDrawPointsToBezierPoints(points, 0.26)
  const bounds = getBoundingRectFromBezierPoints(path.points)

  return {
    id: nid(),
    type: 'path',
    name: `path-${index}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    bezierPoints: path.points,
  }
}

function createMixedBezierPoints(points: Point[]): BezierPoint[] {
  return points.map((point, index) => {
    if (index === 0) {
      return {
        anchor: point,
        cp2: null,
      }
    }

    if (index === points.length - 1) {
      return {
        anchor: point,
        cp1: null,
      }
    }

    const previous = points[index - 1]
    const next = points[index + 1]
    const dx = (next.x - previous.x) * 0.18
    const dy = (next.y - previous.y) * 0.18
    const isLinearJoint = index % 2 === 1

    return {
      anchor: point,
      cp1: isLinearJoint
        ? null
        : {
            x: point.x - dx,
            y: point.y - dy,
          },
      cp2: isLinearJoint
        ? null
        : {
            x: point.x + dx,
            y: point.y + dy,
          },
    }
  })
}

function createMixedPathShape(
  random: () => number,
  index: number,
  frame: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>,
): DocumentNode {
  const width = randomInt(random, 180, 340)
  const height = randomInt(random, 110, 220)
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
  const points = createBezierWavePoints(random, x, y, width, height)
  // Mixed stress paths intentionally alternate straight and curved joints so
  // large-scene render and hit-test work covers both segment types together.
  const bezierPoints = createMixedBezierPoints(points)
  const bounds = getBoundingRectFromBezierPoints(bezierPoints)

  return {
    id: nid(),
    type: 'path',
    name: `path-mixed-${index}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    bezierPoints,
  }
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
    : kindRoll < 0.34 ? 'rectangle' : kindRoll < 0.56 ? 'ellipse' : kindRoll < 0.7 ? 'polygon' : kindRoll < 0.82 ? 'star' : kindRoll < 0.92 ? 'path' : 'lineSegment'

  if (type === 'path') {
    return random() < 0.4
      ? createMixedPathShape(random, index, frame)
      : createBezierPathShape(random, index, frame)
  }

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
    points: type === 'polygon'
      ? [
          {x: x + width * 0.5, y},
          {x: x + width, y: y + height * 0.34},
          {x: x + width * 0.82, y: y + height},
          {x: x + width * 0.18, y: y + height},
          {x, y: y + height * 0.34},
        ]
      : type === 'star'
        ? createStarPoints(x, y, width, height)
        : undefined,
  }
}

function maybeCreateGroupNode(
  random: () => number,
  index: number,
  shapeCount: number,
  frame: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>,
): DocumentNode | null {
  if (index === 0 || index % Math.max(250, Math.floor(shapeCount / 40)) !== 0) {
    return null
  }

  const width = randomInt(random, 320, 760)
  const height = randomInt(random, 220, 540)
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
    type: 'group',
    name: `group-${index}`,
    x,
    y,
    width,
    height,
    childIds: [],
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
  const eligibleGroupIds: string[] = []

  for (let index = 0; index < shapeCount; index += 1) {
    const groupNode = maybeCreateGroupNode(random, index, shapeCount, frame)
    if (groupNode) {
      shapes.push(groupNode)
      eligibleGroupIds.push(groupNode.id)
    }

    const nextShape = createRandomShape(random, index, shapeCount, imageDensity, frame)
    const shouldAttachToGroup =
      nextShape.type !== 'group' &&
      eligibleGroupIds.length > 0 &&
      index % 6 === 0

    if (shouldAttachToGroup) {
      const parentId = eligibleGroupIds[index % eligibleGroupIds.length]
      const parent = shapes.find((shape) => shape.id === parentId)
      nextShape.parentId = parentId
      parent?.childIds?.push(nextShape.id)
    }

    shapes.push(nextShape)
  }

  return {
    id: `runtime-stress-${imageDensity}-${shapeCount}`,
    name: imageDensity === 'high' ? `Runtime Image Heavy ${shapeCount}` : `Runtime Stress ${shapeCount}`,
    width: frameWidth + frameX * 2,
    height: frameHeight + frameY * 2,
    shapes,
  }
}
