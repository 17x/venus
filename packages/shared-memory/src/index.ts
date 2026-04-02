import type { EditorDocument, ShapeType } from '@venus/document-core'

export interface PointerState {
  x: number
  y: number
}

export interface SceneMemory {
  buffer: SharedArrayBuffer
  capacity: number
  meta: Int32Array
  geometry: Float32Array
  kind: Uint8Array
  flags: Uint8Array
}

export interface SceneShapeSnapshot {
  id: string
  name: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  isHovered: boolean
  isSelected: boolean
}

export interface SceneStats {
  version: number
  shapeCount: number
  hoveredIndex: number
  selectedIndex: number
}

// meta[Int32]: [version, shapeCount, hoveredIndex, selectedIndex, pointerX, pointerY]
const META_LENGTH = 6
// geometry[Float32]: [x, y, width, height] per shape
const GEOMETRY_STRIDE = 4

const enum MetaIndex {
  Version = 0,
  ShapeCount = 1,
  HoveredIndex = 2,
  SelectedIndex = 3,
  PointerX = 4,
  PointerY = 5,
}

const enum ShapeFlag {
  Selected = 1,
  Hovered = 2,
}

const TYPE_TO_KIND: Record<ShapeType, number> = {
  frame: 1,
  rectangle: 2,
  ellipse: 3,
  text: 4,
  lineSegment: 5,
  path: 6,
}

const KIND_TO_TYPE: Record<number, ShapeType> = {
  1: 'frame',
  2: 'rectangle',
  3: 'ellipse',
  4: 'text',
  5: 'lineSegment',
  6: 'path',
}

/**
 * Computes how many bytes are required for a scene buffer with a fixed shape capacity.
 *
 * Buffer segments:
 * 1) meta (Int32Array)
 * 2) geometry (Float32Array)
 * 3) kind (Uint8Array)
 * 4) flags (Uint8Array)
 */
export function getSceneMemoryByteLength(capacity: number) {
  return (
    META_LENGTH * Int32Array.BYTES_PER_ELEMENT +
    capacity * GEOMETRY_STRIDE * Float32Array.BYTES_PER_ELEMENT +
    capacity * Uint8Array.BYTES_PER_ELEMENT +
    capacity * Uint8Array.BYTES_PER_ELEMENT
  )
}

/**
 * Allocates a SharedArrayBuffer sized for the requested scene capacity.
 * The caller should immediately attach typed-array views via `attachSceneMemory`.
 */
export function createSceneMemory(capacity: number) {
  return new SharedArrayBuffer(getSceneMemoryByteLength(capacity))
}

/**
 * Attaches typed-array views to a SharedArrayBuffer using the canonical layout.
 *
 * This does not allocate or copy data; it only creates views, so multiple threads
 * can safely reference the same backing memory.
 */
export function attachSceneMemory(buffer: SharedArrayBuffer, capacity: number): SceneMemory {
  // Memory layout is contiguous so worker/renderer can share fixed typed-array views.
  let offset = 0

  const meta = new Int32Array(buffer, offset, META_LENGTH)
  offset += META_LENGTH * Int32Array.BYTES_PER_ELEMENT

  const geometry = new Float32Array(buffer, offset, capacity * GEOMETRY_STRIDE)
  offset += capacity * GEOMETRY_STRIDE * Float32Array.BYTES_PER_ELEMENT

  const kind = new Uint8Array(buffer, offset, capacity)
  offset += capacity * Uint8Array.BYTES_PER_ELEMENT

  const flags = new Uint8Array(buffer, offset, capacity)

  return {
    buffer,
    capacity,
    meta,
    geometry,
    kind,
    flags,
  }
}

/**
 * Writes initial document shape geometry and type information into shared memory.
 *
 * Side effects:
 * - Resets hover/selection indices to -1
 * - Clears per-shape flags
 * - Updates shape count
 * - Increments version (signals a semantic scene change)
 *
 * Note:
 * - If document shape count exceeds capacity, extra shapes are dropped.
 */
export function writeDocumentToScene(scene: SceneMemory, document: EditorDocument) {
  // Scene memory is capacity-bounded; extra shapes are intentionally ignored.
  const count = Math.min(document.shapes.length, scene.capacity)
  scene.meta[MetaIndex.ShapeCount] = count
  scene.meta[MetaIndex.HoveredIndex] = -1
  scene.meta[MetaIndex.SelectedIndex] = -1

  for (let index = 0; index < count; index += 1) {
    const shape = document.shapes[index]
    const geometryOffset = index * GEOMETRY_STRIDE
    scene.geometry[geometryOffset] = shape.x
    scene.geometry[geometryOffset + 1] = shape.y
    scene.geometry[geometryOffset + 2] = shape.width
    scene.geometry[geometryOffset + 3] = shape.height
    scene.kind[index] = TYPE_TO_KIND[shape.type]
    scene.flags[index] = 0
  }

  incrementVersion(scene)
}

/**
 * Writes pointer coordinates into meta storage for worker-side diagnostics/logic.
 * Coordinates are rounded because meta uses Int32 slots.
 */
export function updatePointer(scene: SceneMemory, pointer: PointerState) {
  // Pointer coordinates are rounded to keep meta storage in Int32.
  scene.meta[MetaIndex.PointerX] = Math.round(pointer.x)
  scene.meta[MetaIndex.PointerY] = Math.round(pointer.y)
}

/**
 * Clears currently hovered shape state.
 *
 * Returns:
 * - `true` if hover state actually changed
 * - `false` if scene was already in "no hovered shape" state
 */
export function clearHoveredShape(scene: SceneMemory) {
  return setHoveredShape(scene, -1)
}

/**
 * Sets hovered shape index and updates hover bit-flags.
 *
 * Behavior:
 * - Removes Hovered flag from previous hovered index (if any)
 * - Applies Hovered flag to next index (if >= 0)
 * - Updates meta hovered index
 * - Increments version only when a real change occurs
 *
 * Returns:
 * - `true` when state changed
 * - `false` when next index equals current hovered index
 */
export function setHoveredShape(scene: SceneMemory, nextIndex: number) {
  const currentIndex = scene.meta[MetaIndex.HoveredIndex]
  if (currentIndex === nextIndex) {
    return false
  }

  if (currentIndex >= 0) {
    scene.flags[currentIndex] &= ~ShapeFlag.Hovered
  }

  if (nextIndex >= 0) {
    scene.flags[nextIndex] |= ShapeFlag.Hovered
  }

  scene.meta[MetaIndex.HoveredIndex] = nextIndex
  incrementVersion(scene)
  return true
}

/**
 * Sets selected shape index and updates selection bit-flags.
 *
 * Behavior mirrors `setHoveredShape` but for selection state.
 *
 * Returns:
 * - `true` when selected index changed
 * - `false` when selected index remained the same
 */
export function setSelectedShape(scene: SceneMemory, nextIndex: number) {
  const currentIndex = scene.meta[MetaIndex.SelectedIndex]
  if (currentIndex === nextIndex) {
    return false
  }

  if (currentIndex >= 0) {
    scene.flags[currentIndex] &= ~ShapeFlag.Selected
  }

  if (nextIndex >= 0) {
    scene.flags[nextIndex] |= ShapeFlag.Selected
  }

  scene.meta[MetaIndex.SelectedIndex] = nextIndex
  incrementVersion(scene)
  return true
}

/**
 * Performs hit-testing against shapes stored in shared memory.
 *
 * Strategy:
 * - Scan from end to start to prefer visually top-most shapes
 * - First do AABB (bounding-box) test
 * - For ellipse types, apply an additional normalized ellipse test
 * - For line/path types, apply segment-distance checks
 *
 * Returns:
 * - shape index when hit
 * - -1 when nothing is hit
 */
export function hitTestScene(scene: SceneMemory, pointer: PointerState) {
  // Iterate from the end to approximate top-most hit when draw order matches index order.
  const count = scene.meta[MetaIndex.ShapeCount]

  for (let index = count - 1; index >= 0; index -= 1) {
    const geometryOffset = index * GEOMETRY_STRIDE
    const x = scene.geometry[geometryOffset]
    const y = scene.geometry[geometryOffset + 1]
    const width = scene.geometry[geometryOffset + 2]
    const height = scene.geometry[geometryOffset + 3]

    const inBounds =
      pointer.x >= x &&
      pointer.x <= x + width &&
      pointer.y >= y &&
      pointer.y <= y + height

    if (!inBounds) {
      continue
    }

    const type = KIND_TO_TYPE[scene.kind[index]]
    if (type === 'ellipse') {
      const radiusX = width / 2
      const radiusY = height / 2
      const centerX = x + radiusX
      const centerY = y + radiusY
      const normalized =
        ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
        ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

      if (normalized > 1) {
        continue
      }
    }

    if (type === 'lineSegment') {
      const lineHit = isPointNearLineSegment(pointer, {
        x1: x,
        y1: y,
        x2: x + width,
        y2: y + height,
      })

      if (!lineHit) {
        continue
      }
    }

    if (type === 'path') {
      const lineHit = isPointNearLineSegment(pointer, {
        x1: x,
        y1: y,
        x2: x + width,
        y2: y + height,
      })

      if (!lineHit) {
        continue
      }
    }

    return index
  }

  return -1
}

/**
 * Reads compact scene-level reactive stats from shared memory.
 * Useful for fast UI synchronization without materializing full shape snapshots.
 */
export function readSceneStats(scene: SceneMemory): SceneStats {
  return {
    version: scene.meta[MetaIndex.Version],
    shapeCount: scene.meta[MetaIndex.ShapeCount],
    hoveredIndex: scene.meta[MetaIndex.HoveredIndex],
    selectedIndex: scene.meta[MetaIndex.SelectedIndex],
  }
}

/**
 * Materializes render-friendly shape snapshots by combining:
 * - mutable shared geometry/flags (SAB)
 * - stable identity/type/name (document model)
 *
 * Returns a new array every call; caller can diff by `SceneStats.version`.
 */
export function readSceneSnapshot(scene: SceneMemory, document: EditorDocument): SceneShapeSnapshot[] {
  // Snapshot joins shared mutable state with stable shape identity/name from document model.
  const count = scene.meta[MetaIndex.ShapeCount]
  const shapes: SceneShapeSnapshot[] = []

  for (let index = 0; index < count; index += 1) {
    const geometryOffset = index * GEOMETRY_STRIDE
    const source = document.shapes[index]
    const flags = scene.flags[index]

    shapes.push({
      id: source.id,
      name: source.name,
      type: source.type,
      x: scene.geometry[geometryOffset],
      y: scene.geometry[geometryOffset + 1],
      width: scene.geometry[geometryOffset + 2],
      height: scene.geometry[geometryOffset + 3],
      isHovered: (flags & ShapeFlag.Hovered) !== 0,
      isSelected: (flags & ShapeFlag.Selected) !== 0,
    })
  }

  return shapes
}

/**
 * Bumps scene version whenever semantic shared state changes.
 * Version is used as a cheap invalidation token for UI/render loops.
 */
function incrementVersion(scene: SceneMemory) {
  // Increment on semantic state changes so UI/render loops can react cheaply.
  scene.meta[MetaIndex.Version] += 1
}

function isPointNearLineSegment(
  pointer: PointerState,
  line: {x1: number; y1: number; x2: number; y2: number},
  tolerance = 6,
) {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const distanceSquared =
      (pointer.x - line.x1) * (pointer.x - line.x1) +
      (pointer.y - line.y1) * (pointer.y - line.y1)
    return distanceSquared <= tolerance * tolerance
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointer.x - line.x1) * dx + (pointer.y - line.y1) * dy) / lengthSquared,
    ),
  )
  const nearestX = line.x1 + t * dx
  const nearestY = line.y1 + t * dy
  const distanceSquared =
    (pointer.x - nearestX) * (pointer.x - nearestX) +
    (pointer.y - nearestY) * (pointer.y - nearestY)

  return distanceSquared <= tolerance * tolerance
}
