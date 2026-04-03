import {nid, type DocumentNode, type EditorDocument} from '@venus/document-core'

const RANDOM_SEED = 424242

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

function createRandomShape(
  random: () => number,
  index: number,
  frame: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>,
): DocumentNode {
  const kindRoll = random()
  const type: DocumentNode['type'] =
    kindRoll < 0.6 ? 'rectangle' : kindRoll < 0.9 ? 'ellipse' : 'lineSegment'
  const width = randomInt(random, 16, 220)
  const height = randomInt(random, 16, 180)
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
    x,
    y,
    width,
    height,
  }
}

/**
 * Generates a large deterministic stress scene for render and hit-test work.
 */
export function createStressDocument(shapeCount: number): EditorDocument {
  const random = createSeededRandom()
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
    shapes.push(createRandomShape(random, index, frame))
  }

  return {
    id: `runtime-stress-${shapeCount}`,
    name: `Runtime Stress ${shapeCount}`,
    width: frameWidth + frameX * 2,
    height: frameHeight + frameY * 2,
    shapes,
  }
}
