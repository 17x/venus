import {type EditorDocument, type ShapeType} from '@venus/document-core'

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

/**
 * Bumps scene version whenever semantic shared state changes.
 * Version is used as a cheap invalidation token for UI/render loops.
 */
export function incrementSceneVersion(scene: SceneMemory) {
  // Increment on semantic state changes so UI/render loops can react cheaply.
  scene.meta[MetaIndex.Version] += 1
}

function copySceneShape(scene: SceneMemory, fromIndex: number, toIndex: number) {
  const fromOffset = fromIndex * GEOMETRY_STRIDE
  const toOffset = toIndex * GEOMETRY_STRIDE
  const fromHintOffset = fromIndex * RENDER_HINT_STRIDE
  const toHintOffset = toIndex * RENDER_HINT_STRIDE

  scene.geometry[toOffset] = scene.geometry[fromOffset]
  scene.geometry[toOffset + 1] = scene.geometry[fromOffset + 1]
  scene.geometry[toOffset + 2] = scene.geometry[fromOffset + 2]
  scene.geometry[toOffset + 3] = scene.geometry[fromOffset + 3]
  scene.renderHints[toHintOffset] = scene.renderHints[fromHintOffset]
  scene.renderHints[toHintOffset + 1] = scene.renderHints[fromHintOffset + 1]
  scene.renderHints[toHintOffset + 2] = scene.renderHints[fromHintOffset + 2]
  scene.renderHints[toHintOffset + 3] = scene.renderHints[fromHintOffset + 3]
  scene.renderHints[toHintOffset + 4] = scene.renderHints[fromHintOffset + 4]
  scene.kind[toIndex] = scene.kind[fromIndex]
  scene.flags[toIndex] = scene.flags[fromIndex]
}

function clearSceneShape(scene: SceneMemory, index: number) {
  const offset = index * GEOMETRY_STRIDE
  const hintOffset = index * RENDER_HINT_STRIDE
  scene.geometry[offset] = 0
  scene.geometry[offset + 1] = 0
  scene.geometry[offset + 2] = 0
  scene.geometry[offset + 3] = 0
  scene.renderHints[hintOffset] = 0
  scene.renderHints[hintOffset + 1] = 0
  scene.renderHints[hintOffset + 2] = 0
  scene.renderHints[hintOffset + 3] = 0
  scene.renderHints[hintOffset + 4] = 0
  scene.kind[index] = 0
  scene.flags[index] = 0
}

function readSceneShape(scene: SceneMemory, index: number) {
  if (index < 0 || index >= scene.meta[MetaIndex.ShapeCount]) {
    return null
  }

  const offset = index * GEOMETRY_STRIDE
  const hintOffset = index * RENDER_HINT_STRIDE
  return {
    x: scene.geometry[offset],
    y: scene.geometry[offset + 1],
    width: scene.geometry[offset + 2],
    height: scene.geometry[offset + 3],
    textRenderHash: scene.renderHints[hintOffset],
    textLineCount: scene.renderHints[hintOffset + 1],
    textMaxLineHeight: decodeSceneHintFloat100(scene.renderHints[hintOffset + 2]),
    pathPointCount: scene.renderHints[hintOffset + 3],
    pathBezierPointCount: scene.renderHints[hintOffset + 4],
    kind: scene.kind[index],
    flags: scene.flags[index],
  }
}

function writeSceneShape(
  scene: SceneMemory,
  index: number,
  snapshot: {
    x: number
    y: number
    width: number
    height: number
    textRenderHash?: number
    textLineCount?: number
    textMaxLineHeight?: number
    pathPointCount?: number
    pathBezierPointCount?: number
    kind: number
    flags: number
  },
) {
  const offset = index * GEOMETRY_STRIDE
  const hintOffset = index * RENDER_HINT_STRIDE
  scene.geometry[offset] = snapshot.x
  scene.geometry[offset + 1] = snapshot.y
  scene.geometry[offset + 2] = snapshot.width
  scene.geometry[offset + 3] = snapshot.height
  scene.renderHints[hintOffset] = snapshot.textRenderHash ?? 0
  scene.renderHints[hintOffset + 1] = snapshot.textLineCount ?? 0
  scene.renderHints[hintOffset + 2] = encodeSceneHintFloat100(snapshot.textMaxLineHeight)
  scene.renderHints[hintOffset + 3] = snapshot.pathPointCount ?? 0
  scene.renderHints[hintOffset + 4] = snapshot.pathBezierPointCount ?? 0
  scene.kind[index] = snapshot.kind
  scene.flags[index] = snapshot.flags
}

function writeSceneRenderHints(
  scene: SceneMemory,
  index: number,
  shape: EditorDocument['shapes'][number],
) {
  const hintOffset = index * RENDER_HINT_STRIDE
  const textMeta = resolveTextRenderMeta(shape)
  scene.renderHints[hintOffset + RenderHintIndex.TextRenderHash] = textMeta.hash
  scene.renderHints[hintOffset + RenderHintIndex.TextLineCount] = textMeta.lineCount
  scene.renderHints[hintOffset + RenderHintIndex.TextMaxLineHeight] = encodeSceneHintFloat100(textMeta.maxLineHeight)
  scene.renderHints[hintOffset + RenderHintIndex.PathPointCount] = shape.points?.length ?? 0
  scene.renderHints[hintOffset + RenderHintIndex.PathBezierPointCount] = shape.bezierPoints?.length ?? 0
}

function readSceneRenderHint(
  scene: SceneMemory,
  index: number,
  hintIndex: RenderHintIndex,
) {
  return scene.renderHints[index * RENDER_HINT_STRIDE + hintIndex]
}

function readSceneRenderHintFloat100(
  scene: SceneMemory,
  index: number,
  hintIndex: RenderHintIndex,
) {
  return decodeSceneHintFloat100(readSceneRenderHint(scene, index, hintIndex))
}

function resolveTextRenderMeta(shape: EditorDocument['shapes'][number]) {
  if (shape.type !== 'text') {
    return {
      hash: 0,
      lineCount: 0,
      maxLineHeight: 0,
    }
  }

  const content = shape.text ?? ''
  let hash = 2166136261
  hash = hashString(content, hash)

  let lineCount = 1
  if (content.length > 0) {
    for (let index = 0; index < content.length; index += 1) {
      if (content.charCodeAt(index) === 10) {
        lineCount += 1
      }
    }
  }

  const firstRun = shape.textRuns?.[0]
  const defaultLineHeight = firstRun?.style?.lineHeight ?? firstRun?.style?.fontSize ?? 16
  let maxLineHeight = defaultLineHeight

  shape.textRuns?.forEach((run) => {
    maxLineHeight = Math.max(maxLineHeight, run.style?.lineHeight ?? defaultLineHeight)
    hash = hashString(String(run.start), hash)
    hash = hashString(String(run.end), hash)
    hash = hashString(run.style?.color ?? '', hash)
    hash = hashString(run.style?.fontFamily ?? '', hash)
    hash = hashString(String(run.style?.fontSize ?? ''), hash)
    hash = hashString(String(run.style?.fontWeight ?? ''), hash)
    hash = hashString(String(run.style?.lineHeight ?? ''), hash)
    hash = hashString(String(run.style?.letterSpacing ?? ''), hash)
    hash = hashString(run.style?.textAlign ?? '', hash)
    hash = hashString(run.style?.verticalAlign ?? '', hash)
  })

  return {
    hash: hash >>> 0,
    lineCount,
    maxLineHeight,
  }
}

function encodeSceneHintFloat100(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(value * 100))
}

function decodeSceneHintFloat100(value: number) {
  if (!value) {
    return 0
  }

  return value / 100
}

function hashString(value: string, seed: number) {
  let hash = seed >>> 0

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function shiftTrackedIndices(scene: SceneMemory, startIndex: number, delta: 1 | -1) {
  if (delta === 1) {
    if (scene.meta[MetaIndex.HoveredIndex] >= startIndex) {
      scene.meta[MetaIndex.HoveredIndex] += 1
    }

    if (scene.meta[MetaIndex.SelectedIndex] >= startIndex) {
      scene.meta[MetaIndex.SelectedIndex] += 1
    }
    return
  }

  if (scene.meta[MetaIndex.HoveredIndex] === startIndex) {
    scene.meta[MetaIndex.HoveredIndex] = -1
  } else if (scene.meta[MetaIndex.HoveredIndex] > startIndex) {
    scene.meta[MetaIndex.HoveredIndex] -= 1
  }

  if (scene.meta[MetaIndex.SelectedIndex] === startIndex) {
    scene.meta[MetaIndex.SelectedIndex] = -1
  } else if (scene.meta[MetaIndex.SelectedIndex] > startIndex) {
    scene.meta[MetaIndex.SelectedIndex] -= 1
  }
}

function remapTrackedIndices(scene: SceneMemory, fromIndex: number, toIndex: number) {
  scene.meta[MetaIndex.HoveredIndex] = remapIndex(scene.meta[MetaIndex.HoveredIndex], fromIndex, toIndex)
  scene.meta[MetaIndex.SelectedIndex] = remapIndex(scene.meta[MetaIndex.SelectedIndex], fromIndex, toIndex)
}

function remapIndex(current: number, fromIndex: number, toIndex: number) {
  if (current < 0) {
    return current
  }

  if (current === fromIndex) {
    return toIndex
  }

  if (fromIndex < toIndex && current > fromIndex && current <= toIndex) {
    return current - 1
  }

  if (fromIndex > toIndex && current >= toIndex && current < fromIndex) {
    return current + 1
  }

  return current
}

function findTopmostSelectedIndex(flags: Uint8Array, count: number) {
  for (let index = count - 1; index >= 0; index -= 1) {
    if ((flags[index] & ShapeFlag.Selected) !== 0) {
      return index
    }
  }

  return -1
}

