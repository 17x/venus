import type { EditorDocument, ShapeType } from '@venus/editor-core'

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

const META_LENGTH = 6
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
}

const KIND_TO_TYPE: Record<number, ShapeType> = {
  1: 'frame',
  2: 'rectangle',
  3: 'ellipse',
  4: 'text',
}

export function getSceneMemoryByteLength(capacity: number) {
  return (
    META_LENGTH * Int32Array.BYTES_PER_ELEMENT +
    capacity * GEOMETRY_STRIDE * Float32Array.BYTES_PER_ELEMENT +
    capacity * Uint8Array.BYTES_PER_ELEMENT +
    capacity * Uint8Array.BYTES_PER_ELEMENT
  )
}

export function createSceneMemory(capacity: number) {
  return new SharedArrayBuffer(getSceneMemoryByteLength(capacity))
}

export function attachSceneMemory(buffer: SharedArrayBuffer, capacity: number): SceneMemory {
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

export function writeDocumentToScene(scene: SceneMemory, document: EditorDocument) {
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

export function updatePointer(scene: SceneMemory, pointer: PointerState) {
  scene.meta[MetaIndex.PointerX] = Math.round(pointer.x)
  scene.meta[MetaIndex.PointerY] = Math.round(pointer.y)
}

export function clearHoveredShape(scene: SceneMemory) {
  return setHoveredShape(scene, -1)
}

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

export function hitTestScene(scene: SceneMemory, pointer: PointerState) {
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

    return index
  }

  return -1
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
      isHovered: (flags & ShapeFlag.Hovered) !== 0,
      isSelected: (flags & ShapeFlag.Selected) !== 0,
    })
  }

  return shapes
}

function incrementVersion(scene: SceneMemory) {
  scene.meta[MetaIndex.Version] += 1
}
