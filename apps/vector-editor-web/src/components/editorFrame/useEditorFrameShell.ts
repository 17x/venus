import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {createHeaderMenuData} from '../header/menu/menuData.ts'
import type {MenuItemType} from '../header/menu/type'
import {createShellCommandDispatch} from '../../editor/shell/commands/shellCommandDispatch.ts'
import type {InspectorContext, InspectorPanelId} from '../../editor/shell/state/inspectorState.ts'
import type {ToolbeltMode} from '../../editor/shell/state/toolbeltState.ts'
import type {LeftSidebarProps} from '../shell/LeftSidebarShared.tsx'
import type {RightSidebarProps} from '../shell/RightSidebar.tsx'

interface UseEditorFrameShellOptions {
  mode: 'light' | 'dark' | 'system'
  setMode: (mode: 'light' | 'dark' | 'system') => void
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
  fileName?: string
  layerItems: LeftSidebarProps['layerItems']
  selectedProps: RightSidebarProps['selectedProps']
  viewportScale: number
  debugStats: LeftSidebarProps['debugStats']
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
  const {i18n} = useTranslation()

  const topMenuActions = useMemo(() => {
    return createHeaderMenuData({
      selectedIds: options.selectedIds,
      copiedCount: options.copiedCount,
      needSave: options.hasUnsavedChanges,
      historyStatus: options.historyStatus,
      language: i18n.language === 'zh-CN' ? 'cn' : (i18n.language as 'en' | 'cn' | 'jp'),
      gridEnabled: options.showGrid,
      snappingEnabled: options.snappingEnabled,
      canToggleGrid: true,
      canToggleSnapping: true,
      themeMode: options.mode,
    })
  }, [options.selectedIds, options.copiedCount, options.hasUnsavedChanges, options.historyStatus, i18n.language, options.showGrid, options.snappingEnabled, options.mode])

  const dispatchShellCommand = createShellCommandDispatch({
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
  })

  const executeTopMenuAction = (menuItem: MenuItemType) => {
    if (menuItem.disabled) {
      return
    }

    switch (menuItem.id) {
      case 'languageEnglish':
        i18n.changeLanguage('en')
        return
      case 'languageChinese':
        i18n.changeLanguage('zh-CN')
        return
      case 'languageJapanese':
        i18n.changeLanguage('jp')
        return
      case 'toggleGridOn':
      case 'toggleGridOff':
        dispatchShellCommand('shell.setGrid', {enabled: !options.showGrid}, {
          sourcePanel: 'left-sidebar',
          sourceControl: 'settings-grid-toggle',
          commitType: 'final',
        })
        return
      case 'toggleSnappingOn':
      case 'toggleSnappingOff':
        dispatchShellCommand('shell.setSnapping', {enabled: !options.snappingEnabled}, {
          sourcePanel: 'left-sidebar',
          sourceControl: 'settings-snapping-toggle',
          commitType: 'final',
        })
        return
      case 'themeSystem':
        options.setMode('system')
        return
      case 'themeLight':
        options.setMode('light')
        return
      case 'themeDark':
        options.setMode('dark')
        return
      case 'newFile':
        options.setShowTemplatePresetPicker(true)
        return
      default: {
        const action = menuItem.editorActionCode ?? menuItem.action ?? menuItem.id
        if (menuItem.editorActionData) {
          options.executeAction(action, menuItem.editorActionData)
          return
        }
        options.executeAction(action)
      }
    }
  }

  const leftSidebarProps: Omit<LeftSidebarProps, 'fileName' | 'leftPanelMinimized' | 'panelWidth' | 'onMinimize'> = {
    layerItems: options.layerItems,
    selectedIds: options.selectedIds,
    assetCount: options.fileAssetCount,
    activeTab: options.activeTab,
    layersCollapsed: options.layersCollapsed,
    showGrid: options.showGrid,
    snappingEnabled: options.snappingEnabled,
    debugStats: options.debugStats,
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
  }

  const rightSidebarProps: Omit<RightSidebarProps, 'rightPanelMinimized' | 'panelWidth' | 'onMinimize'> = {
    context: options.inspectorContext,
    selectedProps: options.selectedProps,
    zoomPercent: Math.max(1, Math.round(options.viewportScale * 100)),
    selectedCount: options.selectedIds.length,
    layerCount: options.layerItems.length,
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
  }

  return {
    topMenuActions,
    executeTopMenuAction,
    onSelectTool: (tool: import('@venus/document-core').ToolName, meta: import('../../editor/shell/commands/shellCommandRegistry.ts').ShellCommandMeta) => {
      dispatchShellCommand('tool.select', {tool}, meta)
    },
    leftSidebarProps,
    rightSidebarProps,
  }
}