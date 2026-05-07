import {type EditorDocument} from '../model/index.ts'
import type {SceneMemory} from './index.ts'

const GEOMETRY_STRIDE = 4
const RENDER_HINT_STRIDE = 5

const enum MetaIndex {
  HoveredIndex = 2,
  SelectedIndex = 3,
}

const enum ShapeFlag {
  Selected = 1,
}

const enum RenderHintIndex {
  TextRenderHash = 0,
  TextLineCount = 1,
  TextMaxLineHeight = 2,
  PathPointCount = 3,
  PathBezierPointCount = 4,
}

/**
 * Copies one scene slot (geometry, hints, kind, flags) between indices.
 * @param scene Shared scene memory state.
 * @param fromIndex Source slot index.
 * @param toIndex Target slot index.
 */
export function copySceneShape(scene: SceneMemory, fromIndex: number, toIndex: number) {
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

/**
 * Clears one scene slot to its zero/default values.
 * @param scene Shared scene memory state.
 * @param index Slot index to clear.
 */
export function clearSceneShape(scene: SceneMemory, index: number) {
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

/**
 * Reads one scene slot snapshot for temporary reorder operations.
 * @param scene Shared scene memory state.
 * @param index Slot index to read.
 */
export function readSceneShape(scene: SceneMemory, index: number) {
  if (index < 0 || index >= scene.meta[1]) {
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

/**
 * Writes one scene slot snapshot captured by `readSceneShape`.
 * @param scene Shared scene memory state.
 * @param index Slot index to write.
 * @param snapshot Snapshot payload.
 */
export function writeSceneShape(
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

/**
 * Writes render hint fields for one shape slot.
 * @param scene Shared scene memory state.
 * @param index Slot index.
 * @param shape Source document shape.
 */
export function writeSceneRenderHints(
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

/**
 * Reads one integer render hint from one scene slot.
 * @param scene Shared scene memory state.
 * @param index Slot index.
 * @param hintIndex Hint offset inside the slot.
 */
export function readSceneRenderHint(
  scene: SceneMemory,
  index: number,
  hintIndex: number,
) {
  return scene.renderHints[index * RENDER_HINT_STRIDE + hintIndex]
}

/**
 * Reads one fixed-point (x100) render hint and decodes it as float.
 * @param scene Shared scene memory state.
 * @param index Slot index.
 * @param hintIndex Hint offset inside the slot.
 */
export function readSceneRenderHintFloat100(
  scene: SceneMemory,
  index: number,
  hintIndex: number,
) {
  return decodeSceneHintFloat100(readSceneRenderHint(scene, index, hintIndex))
}

/**
 * Shifts tracked hover/selection indices after insert/remove operations.
 * @param scene Shared scene memory state.
 * @param startIndex Mutation start index.
 * @param delta Direction of shift.
 */
export function shiftTrackedIndices(scene: SceneMemory, startIndex: number, delta: 1 | -1) {
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

/**
 * Remaps tracked hover/selection indices after reorder operations.
 * @param scene Shared scene memory state.
 * @param fromIndex Source index.
 * @param toIndex Target index.
 */
export function remapTrackedIndices(scene: SceneMemory, fromIndex: number, toIndex: number) {
  scene.meta[MetaIndex.HoveredIndex] = remapIndex(scene.meta[MetaIndex.HoveredIndex], fromIndex, toIndex)
  scene.meta[MetaIndex.SelectedIndex] = remapIndex(scene.meta[MetaIndex.SelectedIndex], fromIndex, toIndex)
}

/**
 * Finds the topmost selected index in one flag slice.
 * @param flags Flag array.
 * @param count Active shape count.
 */
export function findTopmostSelectedIndex(flags: Uint8Array, count: number) {
  for (let index = count - 1; index >= 0; index -= 1) {
    if ((flags[index] & ShapeFlag.Selected) !== 0) {
      return index
    }
  }

  return -1
}

/**
 * Encodes one float into fixed-point x100 integer form.
 * @param value Float value.
 */
function encodeSceneHintFloat100(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(value * 100))
}

/**
 * Decodes one fixed-point x100 integer back to float.
 * @param value Encoded integer value.
 */
function decodeSceneHintFloat100(value: number) {
  if (!value) {
    return 0
  }

  return value / 100
}

/**
 * Builds text render meta fields used by renderer-side text cache and metrics.
 * @param shape Source shape.
 */
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

/**
 * Remaps one tracked index across a reorder operation.
 * @param current Current tracked index.
 * @param fromIndex Source reorder index.
 * @param toIndex Destination reorder index.
 */
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

/**
 * Computes deterministic FNV-like hash for text cache key construction.
 * @param value String value.
 * @param seed Seed hash.
 */
function hashString(value: string, seed: number) {
  let hash = seed >>> 0

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
