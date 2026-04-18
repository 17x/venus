export type InspectorPanelId = 'properties' | 'layers' | 'history'

export type InspectorContext = 'selection' | 'page'

export interface InspectorState {
  activeContext: InspectorContext
  minimizedPanelIds: InspectorPanelId[]
}

export const INSPECTOR_PANEL_IDS: InspectorPanelId[] = ['properties', 'layers', 'history']

export function createDefaultInspectorState(): InspectorState {
  return {
    activeContext: 'selection',
    minimizedPanelIds: [],
  }
}

export function normalizeInspectorState(input?: Partial<InspectorState>): InspectorState {
  if (!input) {
    return createDefaultInspectorState()
  }

  const activeContext = input.activeContext === 'page' ? 'page' : 'selection'
  const minimizedPanelIds = Array.isArray(input.minimizedPanelIds)
    ? input.minimizedPanelIds.filter((panelId): panelId is InspectorPanelId => INSPECTOR_PANEL_IDS.includes(panelId as InspectorPanelId))
    : []

  return {
    activeContext,
    minimizedPanelIds,
  }
}
