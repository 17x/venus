import type {ToolName} from '@vector/model'

export type ToolbeltMode = 'draw' | 'design' | 'handoff'

export type ToolbeltGroupId = 'move' | 'frame' | 'shape' | 'pen' | 'single'

export interface ToolbeltState {
  currentTool: ToolName
  mode: ToolbeltMode
  activeGroup: ToolbeltGroupId
  carouselRow: 0 | 1
}

export const DEFAULT_TOOLBELT_MODE: ToolbeltMode = 'draw'

export const TOOLBELT_MODE_STORAGE_KEY = 'vector.shell.toolbeltMode'
export const LEGACY_TOOLBELT_MODE_STORAGE_KEY = 'venus.shell.toolbeltMode'

export function resolveToolbeltModeFromStorage(storageValue: string | null | undefined): ToolbeltMode {
  if (storageValue === 'design' || storageValue === 'handoff') {
    return storageValue
  }

  return DEFAULT_TOOLBELT_MODE
}

export function readStoredToolbeltMode(storage: Storage): ToolbeltMode {
  return resolveToolbeltModeFromStorage(
    storage.getItem(TOOLBELT_MODE_STORAGE_KEY) ??
    storage.getItem(LEGACY_TOOLBELT_MODE_STORAGE_KEY),
  )
}

export function resolveToolGroupForTool(tool: ToolName): ToolbeltGroupId {
  if (tool === 'selector' || tool === 'dselector') {
    return 'move'
  }

  if (tool === 'lineSegment' || tool === 'rectangle' || tool === 'ellipse' || tool === 'polygon' || tool === 'star') {
    return 'shape'
  }

  if (tool === 'path' || tool === 'pencil') {
    return 'pen'
  }

  return 'single'
}

export function createToolbeltState(tool: ToolName, mode: ToolbeltMode): ToolbeltState {
  return {
    currentTool: tool,
    mode,
    activeGroup: resolveToolGroupForTool(tool),
    carouselRow: 0,
  }
}
