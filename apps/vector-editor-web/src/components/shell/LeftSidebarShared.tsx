import type {ReactNode} from 'react'
import type {TFunction} from 'i18next'
import type {LayerItem} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {EditorExecutor} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {LuBug, LuFile, LuHistory, LuShapes} from 'react-icons/lu'

export type LeftSidebarTab = 'file' | 'assets' | 'history' | 'debug'

interface AssetLibraryCard {
  id: string
  title: string
  subtitle: string
  description: string
  presetId: string
}

export interface LeftSidebarProps {
  fileName?: string
  leftPanelMinimized: boolean
  panelWidth: number
  layerItems: LayerItem[]
  selectedIds: string[]
  assetCount: number
  activeTab: LeftSidebarTab
  layersCollapsed: boolean
  showGrid: boolean
  snappingEnabled: boolean
  onMinimize: VoidFunction
  onSetActiveTab: (tab: LeftSidebarTab) => void
  onToggleLayers: VoidFunction
  onToggleGrid: VoidFunction
  onToggleSnapping: VoidFunction
  onOpenTemplatePicker: VoidFunction
  onApplyAssetTemplate: (assetId: string) => void
  executeMenuAction: EditorExecutor
  copiedCount: number
  hasUnsavedChanges: boolean
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  historyItems: Array<{id: number; label?: string; data: {type: string}}>
  onPickHistory: (historyId: number, meta: ShellCommandMeta) => void
  onSelectLayers: (mode: 'replace' | 'toggle' | 'add', ids: string[], sourceControl: string) => void
  onPatchLayers: (ids: string[], patch: Record<string, unknown>, sourceControl: string) => void
}

export interface LeftSidebarTabItem {
  id: LeftSidebarTab
  label: string
  icon: ReactNode
}

export type TreeLayerItem = LayerItem & {hasChildren: boolean}

export const SIDEBAR_ICON_SIZE = 16
export const SIDEBAR_GLYPH_SIZE = 14

export const ASSET_LIBRARY_CARDS: AssetLibraryCard[] = [
  // {
  //   id: 'action-sheet',
  //   title: 'Action Sheet',
  //   subtitle: 'iOS and iPadOS 26 / Examples',
  //   description: 'Use the action sheet pattern for contextual actions and one-step task handoff.',
  //   presetId: 'demo-basic-shapes',
  // },
  // {
  //   id: 'activity-view',
  //   title: 'Activity View',
  //   subtitle: 'iOS and iPadOS 26 / Examples',
  //   description: 'Switch variable modes and insertion presets before committing a reusable instance to canvas.',
  //   presetId: 'demo-welcome-board',
  // },
  // {
  //   id: 'alert',
  //   title: 'Alert',
  //   subtitle: 'iOS and iPadOS 26 / Examples',
  //   description: 'Use alerts for concise, high-priority feedback with one primary and one dismissive action.',
  //   presetId: 'demo-wireframe',
  // },
  // {
  //   id: 'color-picker',
  //   title: 'Color Picker',
  //   subtitle: 'iOS and iPadOS 26 / Examples',
  //   description: 'Use palette and spectrum controls to expose variables while preserving contrast constraints.',
  //   presetId: 'test-text-dense',
  // },
  {
    id: 'mixed-10k',
    title: 'Mixed 10K',
    subtitle: 'Large Mixed Scene',
    description: 'Generate a 10K mixed fake dataset for render and interaction stress.',
    presetId: 'mixed-10k',
  },
  {
    id: 'mixed-100k',
    title: 'Mixed 100K',
    subtitle: 'Large Mixed Scene',
    description: 'Generate a 100K mixed fake dataset for high-load diagnostics.',
    presetId: 'mixed-100k',
  },
  {
    id: 'images-10k',
    title: 'Images 10K',
    subtitle: 'Image Heavy',
    description: 'Generate 10K image nodes to stress texture/decode paths.',
    presetId: 'images-10k',
  },
  {
    id: 'images-50k',
    title: 'Images 50K',
    subtitle: 'Image Heavy',
    description: 'Generate 50K image nodes for extreme image workload tests.',
    presetId: 'images-50k',
  },
  {
    id: 'text-10k',
    title: 'Text 10K',
    subtitle: 'Text Dense',
    description: 'Generate 10K text nodes for text rendering and hit-test pressure.',
    presetId: 'text-10k',
  },
  {
    id: 'mixed-200k',
    title: 'Mixed 200K',
    subtitle: 'Extreme Mixed',
    description: 'Generate 200K mixed nodes for extreme-scale runtime tests.',
    presetId: 'mixed-200k',
  },
  {
    id: 'mixed-300k',
    title: 'Mixed 300K',
    subtitle: 'Extreme Mixed',
    description: 'Generate 300K mixed nodes as a high-end stress profile.',
    presetId: 'mixed-300k',
  },
]

export function createLeftSidebarTabItems(t: TFunction): LeftSidebarTabItem[] {
  return [
    {id: 'file', label: t('shell.variantB.nav.file', 'File'), icon: <LuFile size={SIDEBAR_ICON_SIZE}/>},
    {id: 'assets', label: t('shell.variantB.nav.assets', 'Assets'), icon: <LuShapes size={SIDEBAR_ICON_SIZE}/>},
    {id: 'history', label: t('inspector.history.title', 'History'), icon: <LuHistory size={SIDEBAR_ICON_SIZE}/>},
    {id: 'debug', label: t('shell.variantB.nav.debug', 'Debug'), icon: <LuBug size={SIDEBAR_ICON_SIZE}/>},
  ]
}