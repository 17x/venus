import type {InspectorContext, InspectorPanelId} from './inspectorState.ts'
import type {ToolbeltMode} from './toolbeltState.ts'

export interface ShellLayoutState {
  leftPanelWidth: number
  rightPanelWidth: number
  leftPanelMinimized: boolean
  rightPanelMinimized: boolean
  minimizedInspectorPanels: InspectorPanelId[]
  activeInspectorContext: InspectorContext
  toolbeltMode: ToolbeltMode
  variantBSections: {
    activeTab: 'file' | 'assets' | 'history' | 'debug'
    showGrid: boolean
    layersCollapsed: boolean
  }
}

export const SHELL_LAYOUT_STATE_STORAGE_KEY = 'venus.shell.layoutState'

const DEFAULT_LEFT_PANEL_WIDTH = 240
const DEFAULT_RIGHT_PANEL_WIDTH = 256

export function createDefaultShellLayoutState(): ShellLayoutState {
  return {
    leftPanelWidth: DEFAULT_LEFT_PANEL_WIDTH,
    rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
    leftPanelMinimized: false,
    rightPanelMinimized: false,
    minimizedInspectorPanels: [],
    activeInspectorContext: 'selection',
    toolbeltMode: 'draw',
    variantBSections: {
      activeTab: 'file',
      showGrid: false,
      layersCollapsed: false,
    },
  }
}

export function normalizeShellLayoutState(input?: Partial<ShellLayoutState>): ShellLayoutState {
  const defaults = createDefaultShellLayoutState()

  if (!input) {
    return defaults
  }

  return {
    leftPanelWidth: typeof input.leftPanelWidth === 'number' ? input.leftPanelWidth : defaults.leftPanelWidth,
    rightPanelWidth: typeof input.rightPanelWidth === 'number' ? input.rightPanelWidth : defaults.rightPanelWidth,
    leftPanelMinimized: input.leftPanelMinimized === true,
    rightPanelMinimized: input.rightPanelMinimized === true,
    minimizedInspectorPanels: Array.isArray(input.minimizedInspectorPanels) ? input.minimizedInspectorPanels : defaults.minimizedInspectorPanels,
    activeInspectorContext: input.activeInspectorContext === 'page' ? 'page' : 'selection',
    toolbeltMode: input.toolbeltMode === 'design' || input.toolbeltMode === 'handoff' ? input.toolbeltMode : 'draw',
    // Keep this normalization backward-compatible with existing persisted state.
    variantBSections: {
      activeTab: input.variantBSections?.activeTab === 'assets' ||
      input.variantBSections?.activeTab === 'history' ||
      input.variantBSections?.activeTab === 'debug'
        ? input.variantBSections.activeTab
        : 'file',
      showGrid: input.variantBSections?.showGrid === true,
      layersCollapsed: input.variantBSections?.layersCollapsed === true,
    },
  }
}

export function serializeShellLayoutState(state: ShellLayoutState): string {
  return JSON.stringify(state)
}

export function deserializeShellLayoutState(raw: string | null | undefined): ShellLayoutState {
  if (!raw) {
    return createDefaultShellLayoutState()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ShellLayoutState>
    return normalizeShellLayoutState(parsed)
  } catch {
    return createDefaultShellLayoutState()
  }
}
