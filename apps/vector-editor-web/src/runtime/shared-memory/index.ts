import {type EditorDocument, type ShapeType} from '../model/index.ts'
import {
  clearSceneShape,
  copySceneShape,
  findTopmostSelectedIndex,
  readSceneRenderHint,
  readSceneRenderHintFloat100,
  readSceneShape,
  remapTrackedIndices,
  shiftTrackedIndices,
  writeSceneRenderHints,
  writeSceneShape,
} from './internalOps.ts'

export interface PointerState {
  x: number
  y: number
}

export interface SceneMemory {
  buffer: SharedArrayBuffer
  capacity: number
  meta: Int32Array
  geometry: Float32Array
  renderHints: Uint32Array
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
  textRenderHash?: number
  textLineCount?: number
  textMaxLineHeight?: number
  pathPointCount?: number
  pathBezierPointCount?: number
  isHovered: boolean
  isSelected: boolean
}

export interface SceneStats {
  version: number
  shapeCount: number
  hoveredIndex: number
  selectedIndex: number
}

export type SceneSelectionMode = 'replace' | 'add' | 'remove' | 'toggle' | 'clear'

// meta[Int32]: [version, shapeCount, hoveredIndex, selectedIndex, pointerX, pointerY]
const META_LENGTH = 6
// geometry[Float32]: [x, y, width, height] per shape
const GEOMETRY_STRIDE = 4
// renderHints[Uint32]: [textRenderHash, textLineCount, textMaxLineHeight*100, pathPointCount, pathBezierPointCount] per shape
const RENDER_HINT_STRIDE = 5

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

const enum RenderHintIndex {
  TextRenderHash = 0,
  TextLineCount = 1,
  TextMaxLineHeight = 2,
  PathPointCount = 3,
  PathBezierPointCount = 4,
}

const TYPE_TO_KIND: Record<ShapeType, number> = {
  frame: 1,
  group: 2,
  rectangle: 3,
  ellipse: 4,
  polygon: 5,
  star: 6,
  text: 7,
  lineSegment: 8,
  path: 9,
  image: 10,
}

/**
 * Computes how many bytes are required for a scene buffer with a fixed shape capacity.
 *
 * Buffer segments:
 * 1) meta (Int32Array)
 * 2) geometry (Float32Array)
 * 3) renderHints (Uint32Array)
 * 4) kind (Uint8Array)
 * 5) flags (Uint8Array)
 */
export function getSceneMemoryByteLength(capacity: number) {
  return (
    META_LENGTH * Int32Array.BYTES_PER_ELEMENT +
    capacity * GEOMETRY_STRIDE * Float32Array.BYTES_PER_ELEMENT +
    capacity * RENDER_HINT_STRIDE * Uint32Array.BYTES_PER_ELEMENT +
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

  const renderHints = new Uint32Array(buffer, offset, capacity * RENDER_HINT_STRIDE)
  offset += capacity * RENDER_HINT_STRIDE * Uint32Array.BYTES_PER_ELEMENT

  const kind = new Uint8Array(buffer, offset, capacity)
  offset += capacity * Uint8Array.BYTES_PER_ELEMENT

  const flags = new Uint8Array(buffer, offset, capacity)

  return {
    buffer,
    capacity,
    meta,
    geometry,
    renderHints,
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
    writeShapeToScene(scene, index, document.shapes[index])
    scene.flags[index] = 0
  }

  incrementSceneVersion(scene)
}

/**
 * Updates a single shape slot in shared memory without touching the rest of the scene.
 */
export function writeShapeToScene(
  scene: SceneMemory,
  index: number,
  shape: EditorDocument['shapes'][number],
) {
  if (index < 0 || index >= scene.capacity) {
    return
  }

  const geometryOffset = index * GEOMETRY_STRIDE
  scene.geometry[geometryOffset] = shape.x
  scene.geometry[geometryOffset + 1] = shape.y
  scene.geometry[geometryOffset + 2] = shape.width
  scene.geometry[geometryOffset + 3] = shape.height
  writeSceneRenderHints(scene, index, shape)
  scene.kind[index] = TYPE_TO_KIND[shape.type]
}

/**
 * Inserts one shape slot and shifts trailing shared-memory records to the right.
 */
export function insertShapeIntoScene(
  scene: SceneMemory,
  index: number,
  shape: EditorDocument['shapes'][number],
) {
  const count = scene.meta[MetaIndex.ShapeCount]
  if (count >= scene.capacity) {
    return
  }

  const boundedIndex = Math.max(0, Math.min(index, count))

  for (let current = count; current > boundedIndex; current -= 1) {
    copySceneShape(scene, current - 1, current)
  }

  writeShapeToScene(scene, boundedIndex, shape)
  scene.flags[boundedIndex] = 0
  scene.meta[MetaIndex.ShapeCount] = count + 1
  shiftTrackedIndices(scene, boundedIndex, 1)
  incrementSceneVersion(scene)
}

/**
 * Removes one shape slot and compacts trailing shared-memory records to the left.
 */
export function removeShapeFromScene(scene: SceneMemory, index: number) {
  const count = scene.meta[MetaIndex.ShapeCount]
  if (index < 0 || index >= count) {
    return
  }

  for (let current = index; current < count - 1; current += 1) {
    copySceneShape(scene, current + 1, current)
  }

  clearSceneShape(scene, count - 1)
  scene.meta[MetaIndex.ShapeCount] = count - 1
  shiftTrackedIndices(scene, index, -1)
  incrementSceneVersion(scene)
}

/**
 * Reorders one shape slot in shared memory while preserving hover/selection identity.
 */
export function reorderShapeInScene(scene: SceneMemory, fromIndex: number, toIndex: number) {
  const count = scene.meta[MetaIndex.ShapeCount]
  if (fromIndex < 0 || fromIndex >= count) {
    return
  }

  const boundedIndex = Math.max(0, Math.min(toIndex, count - 1))
  if (fromIndex === boundedIndex) {
    return
  }

  const snapshot = readSceneShape(scene, fromIndex)
  if (!snapshot) {
    return
  }

  if (fromIndex < boundedIndex) {
    for (let current = fromIndex; current < boundedIndex; current += 1) {
      copySceneShape(scene, current + 1, current)
    }
  } else {
    for (let current = fromIndex; current > boundedIndex; current -= 1) {
      copySceneShape(scene, current - 1, current)
    }
  }

  writeSceneShape(scene, boundedIndex, snapshot)
  remapTrackedIndices(scene, fromIndex, boundedIndex)
  incrementSceneVersion(scene)
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
  incrementSceneVersion(scene)
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
  if (nextIndex < 0) {
    return setSelectedShapes(scene, [], 'clear')
  }

  return setSelectedShapes(scene, [nextIndex], 'replace')
}

export function getSelectedShapeIndices(scene: SceneMemory) {
  const count = scene.meta[MetaIndex.ShapeCount]
  const selected: number[] = []

  for (let index = 0; index < count; index += 1) {
    if ((scene.flags[index] & ShapeFlag.Selected) !== 0) {
      selected.push(index)
    }
  }

  return selected
}

export function setSelectedShapes(
  scene: SceneMemory,
  indices: number[],
  mode: SceneSelectionMode = 'replace',
) {
  const count = scene.meta[MetaIndex.ShapeCount]
  const currentPrimaryIndex = scene.meta[MetaIndex.SelectedIndex]
  const normalizedIndices = Array.from(
    new Set(indices.filter((index) => index >= 0 && index < count)),
  )
  const targetSet = new Set(normalizedIndices)
  const nextFlags = scene.flags.slice(0, count)
  let primaryIndex = currentPrimaryIndex

  if (mode === 'clear') {
    nextFlags.fill(0)
    primaryIndex = -1
  }

  if (mode === 'replace') {
    for (let index = 0; index < count; index += 1) {
      if (targetSet.has(index)) {
        nextFlags[index] |= ShapeFlag.Selected
      } else {
        nextFlags[index] &= ~ShapeFlag.Selected
      }
    }

    primaryIndex = normalizedIndices.length > 0 ? normalizedIndices[normalizedIndices.length - 1] : -1
  }

  if (mode === 'add') {
    normalizedIndices.forEach((index) => {
      nextFlags[index] |= ShapeFlag.Selected
    })
    if (normalizedIndices.length > 0) {
      primaryIndex = normalizedIndices[normalizedIndices.length - 1]
    }
  }

  if (mode === 'remove') {
    normalizedIndices.forEach((index) => {
      nextFlags[index] &= ~ShapeFlag.Selected
    })
    if (primaryIndex >= 0 && normalizedIndices.includes(primaryIndex)) {
      primaryIndex = findTopmostSelectedIndex(nextFlags, count)
    }
  }

  if (mode === 'toggle') {
    normalizedIndices.forEach((index) => {
      if ((nextFlags[index] & ShapeFlag.Selected) !== 0) {
        nextFlags[index] &= ~ShapeFlag.Selected
      } else {
        nextFlags[index] |= ShapeFlag.Selected
      }
    })

    if (normalizedIndices.length > 0) {
      const lastIndex = normalizedIndices[normalizedIndices.length - 1]
      primaryIndex = (nextFlags[lastIndex] & ShapeFlag.Selected) !== 0
        ? lastIndex
        : findTopmostSelectedIndex(nextFlags, count)
    }
  }

  let changed = primaryIndex !== currentPrimaryIndex
  for (let index = 0; index < count; index += 1) {
    const selected = (nextFlags[index] & ShapeFlag.Selected) !== 0
    const wasSelected = (scene.flags[index] & ShapeFlag.Selected) !== 0
    if (selected !== wasSelected) {
      changed = true
      scene.flags[index] = selected
        ? (scene.flags[index] | ShapeFlag.Selected)
        : (scene.flags[index] & ~ShapeFlag.Selected)
    }
  }

  if (!changed) {
    return false
  }

  scene.meta[MetaIndex.SelectedIndex] = primaryIndex
  incrementSceneVersion(scene)
  return true
}

export function readSceneStats(scene: SceneMemory): SceneStats {
  return {
    version: scene.meta[MetaIndex.Version],
    shapeCount: scene.meta[MetaIndex.ShapeCount],
    hoveredIndex: scene.meta[MetaIndex.HoveredIndex],
    selectedIndex: scene.meta[MetaIndex.SelectedIndex],
  }
}

export function readSceneSnapshot(scene: SceneMemory, document: EditorDocument): SceneShapeSnapshot[] {
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
      textRenderHash: readSceneRenderHint(scene, index, RenderHintIndex.TextRenderHash) || undefined,
      textLineCount: readSceneRenderHint(scene, index, RenderHintIndex.TextLineCount) || undefined,
      textMaxLineHeight: readSceneRenderHintFloat100(scene, index, RenderHintIndex.TextMaxLineHeight) || undefined,
      pathPointCount: readSceneRenderHint(scene, index, RenderHintIndex.PathPointCount) || undefined,
      pathBezierPointCount: readSceneRenderHint(scene, index, RenderHintIndex.PathBezierPointCount) || undefined,
      isHovered: (flags & ShapeFlag.Hovered) !== 0,
      isSelected: (flags & ShapeFlag.Selected) !== 0,
    })
  }

  return shapes
}

export function incrementSceneVersion(scene: SceneMemory) {
  scene.meta[MetaIndex.Version] += 1
}

