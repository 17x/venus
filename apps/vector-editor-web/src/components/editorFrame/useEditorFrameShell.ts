import {useCallback, useMemo} from 'react'
import {createShellCommandDispatch} from '../../editor/shell/commands/shellCommandDispatch.ts'
import type {InspectorContext, InspectorPanelId} from '../../editor/shell/state/inspectorState.ts'
import type {ToolbeltMode} from '../../editor/shell/state/toolbeltState.ts'
import type {LeftSidebarProps} from '../shell/LeftSidebarShared.tsx'
import type {RightSidebarProps} from '../shell/RightSidebar.tsx'

interface UseEditorFrameShellOptions {
  selectedIds: string[]
  copiedCount: number
  hasUnsavedChanges: boolean
  historyItems: Array<{id: number; label?: string; data: {type: string}}>
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  showGrid: boolean
  snappingEnabled: boolean
  activeTab: LeftSidebarProps['activeTab']
  layersCollapsed: boolean
  fileAssetCount: number
  layerItems: LeftSidebarProps['layerItems']
  selectedProps: RightSidebarProps['selectedProps']
  inspectorContext: InspectorContext
  executeAction: (type: string, data?: unknown) => void
  pickHistory: (historyNode: {id: number}) => void
  setSnappingEnabled: (enabled: boolean) => void
  setCurrentTool: (tool: import('@venus/document-core').ToolName) => void
  setToolbeltMode: (mode: ToolbeltMode) => void
  setInspectorContext: (context: InspectorContext) => void
  setMinimizedInspectorPanels: React.Dispatch<React.SetStateAction<Set<InspectorPanelId>>>
  setVariantBSections: React.Dispatch<React.SetStateAction<{
    activeTab: LeftSidebarProps['activeTab']
    showGrid: boolean
    layersCollapsed: boolean
  }>>
  setShowTemplatePresetPicker: (visible: boolean) => void
}

export function useEditorFrameShell(options: UseEditorFrameShellOptions) {
  const dispatchShellCommand = useMemo(() => createShellCommandDispatch({
    onSetZoom(payload) {
      options.executeAction('world-zoom', {
        zoomTo: true,
        zoomFactor: Math.max(0.1, payload.zoomPercent / 100),
      })
    },
    onSetLeftTab(payload) {
      options.setVariantBSections((current) => ({
        ...current,
        activeTab: payload.tab,
      }))
    },
    onSetGrid(payload) {
      options.setVariantBSections((current) => ({
        ...current,
        showGrid: payload.enabled,
      }))
    },
    onSetSnapping(payload) {
      options.setSnappingEnabled(payload.enabled)
    },
    onSelectTool(payload) {
      options.setCurrentTool(payload.tool)
    },
    onSetMode(payload) {
      options.setToolbeltMode(payload.mode)
      if (payload.mode === 'handoff') {
        options.setInspectorContext('page')
      }
    },
    onToggleInspectorPanel(payload) {
      options.setMinimizedInspectorPanels((current) => {
        const next = new Set(current)
        if (next.has(payload.panelId)) {
          next.delete(payload.panelId)
        } else {
          next.add(payload.panelId)
        }
        return next
      })
    },
    onSetInspectorContext(payload) {
      options.setInspectorContext(payload.context)
    },
    onLayerReorder(payload) {
      options.executeAction('element-layer', payload.direction)
    },
    onHistoryPick(payload) {
      const targetHistory = options.historyItems.find((item) => item.id === payload.historyId)
      if (!targetHistory) {
        return
      }

      options.pickHistory(targetHistory)
    },
    onSelectionModify(payload) {
      options.executeAction('selection-modify', {
        mode: payload.mode,
        idSet: new Set(payload.ids),
      })
    },
    onElementModify(payload) {
      options.executeAction('element-modify', [{
        id: payload.elementId,
        props: payload.patch,
      }])
    },
  }), [
    options.executeAction,
    options.historyItems,
    options.pickHistory,
    options.setCurrentTool,
    options.setInspectorContext,
    options.setMinimizedInspectorPanels,
    options.setSnappingEnabled,
    options.setToolbeltMode,
    options.setVariantBSections,
  ])

  const leftSidebarProps: Omit<LeftSidebarProps, 'fileName' | 'leftPanelMinimized' | 'panelWidth' | 'onMinimize'> = useMemo(() => ({
    layerItems: options.layerItems,
    selectedIds: options.selectedIds,
    assetCount: options.fileAssetCount,
    activeTab: options.activeTab,
    layersCollapsed: options.layersCollapsed,
    showGrid: options.showGrid,
    snappingEnabled: options.snappingEnabled,
    onSetActiveTab: (tab) => {
      dispatchShellCommand('shell.setLeftTab', {tab}, {
        sourcePanel: 'left-sidebar',
        sourceControl: 'tab-switch',
        commitType: 'final',
      })
    },
    onToggleLayers: () => {
      options.setVariantBSections((current) => ({
        ...current,
        layersCollapsed: !current.layersCollapsed,
      }))
    },
    onToggleGrid: () => {
      dispatchShellCommand('shell.setGrid', {enabled: !options.showGrid}, {
        sourcePanel: 'left-sidebar',
        sourceControl: 'settings-grid-toggle',
        commitType: 'final',
      })
    },
    onToggleSnapping: () => {
      dispatchShellCommand('shell.setSnapping', {enabled: !options.snappingEnabled}, {
        sourcePanel: 'left-sidebar',
        sourceControl: 'settings-snapping-toggle',
        commitType: 'final',
      })
    },
    onOpenTemplatePicker: () => {
      options.setShowTemplatePresetPicker(true)
    },
    executeMenuAction: options.executeAction,
    copiedCount: options.copiedCount,
    hasUnsavedChanges: options.hasUnsavedChanges,
    historyItems: options.historyItems,
    historyStatus: options.historyStatus,
    onPickHistory: (historyId, meta) => {
      dispatchShellCommand('history.pick', {historyId}, meta)
    },
    onSelectLayers: (mode, ids, sourceControl) => {
      dispatchShellCommand('selection.modify', {mode, ids}, {
        sourcePanel: 'left-sidebar',
        sourceControl,
        commitType: 'final',
      })
    },
    onPatchLayers: (ids, patch, sourceControl) => {
      ids.forEach((elementId) => {
        dispatchShellCommand('element.modify', {elementId, patch}, {
          sourcePanel: 'left-sidebar',
          sourceControl,
          commitType: 'final',
        })
      })
    },
  }), [
    dispatchShellCommand,
    options.activeTab,
    options.fileAssetCount,
    options.copiedCount,
    options.executeAction,
    options.hasUnsavedChanges,
    options.historyItems,
    options.historyStatus,
    options.layerItems,
    options.layersCollapsed,
    options.selectedIds,
    options.showGrid,
    options.setShowTemplatePresetPicker,
    options.setVariantBSections,
    options.snappingEnabled,
  ])

  const rightSidebarProps: Omit<RightSidebarProps, 'rightPanelMinimized' | 'panelWidth' | 'onMinimize'> = useMemo(() => ({
    context: options.inspectorContext,
    selectedProps: options.selectedProps,
    executeAction: options.executeAction,
    onSetZoom: (zoomPercent) => {
      dispatchShellCommand('shell.setZoom', {zoomPercent}, {
        sourcePanel: 'right-sidebar',
        sourceControl: 'zoom-chip',
        commitType: 'final',
      })
    },
    onSetInspectorContext: (context) => {
      dispatchShellCommand('inspector.setContext', {context}, {
        sourcePanel: 'right-sidebar',
        sourceControl: 'context-switch',
        commitType: 'final',
      })
    },
    onPatchElementProps: (elementId, patch, meta) => {
      dispatchShellCommand('element.modify', {elementId, patch}, meta)
    },
  }), [
    dispatchShellCommand,
    options.executeAction,
    options.inspectorContext,
    options.selectedProps,
  ])

  const onSelectTool = useCallback((tool: import('@venus/document-core').ToolName, meta: import('../../editor/shell/commands/shellCommandRegistry.ts').ShellCommandMeta) => {
    dispatchShellCommand('tool.select', {tool}, meta)
  }, [dispatchShellCommand])

  return {
    onSelectTool,
    leftSidebarProps,
    rightSidebarProps,
  }
}