import {buildHistoryArray, buildSelectedProps} from './editorRuntimeHelpers.ts'
import type {EditorUIState} from './useEditorRuntime.types.ts'
import type {DocumentNode} from '@venus/document-core'
import type {CanvasRuntimeBridgeState} from './useCanvasRuntimeBridge.ts'
import type {ElementProps} from '@lite-u/editor/types'
import type {LayerItem} from './useEditorRuntime.types.ts'

const layerItemsCache = new WeakMap<DocumentNode[], LayerItem[]>()

/**
 * Centralizes UI-facing derived data so panels and menus don't each invent
 * their own projection of runtime state.
 */
export function deriveEditorUIState(options: {
  canvasRuntime: CanvasRuntimeBridgeState<import('@venus/document-core').EditorDocument>
  clipboard: ElementProps[]
  selectedNode: DocumentNode | null
  selectedIds: string[]
  showPrint: boolean
}): EditorUIState {
  const {
    canvasRuntime,
    clipboard,
    selectedNode,
    selectedIds,
    showPrint,
  } = options

  return {
    copiedItems: clipboard,
    hasUnsavedChanges: canvasRuntime.history.entries.length > 0,
    historyItems: buildHistoryArray(canvasRuntime.history),
    historyStatus: {
      id: canvasRuntime.history.cursor,
      hasPrev: canvasRuntime.history.canUndo,
      hasNext: canvasRuntime.history.canRedo,
    },
    layerItems: buildLayerItemsCached(canvasRuntime.document.shapes),
    selectedIds,
    selectedProps: buildSelectedProps(selectedNode),
    // Runtime hook overrides this with the live snapping toggle state.
    snappingEnabled: true,
    showPrint,
    viewportScale: canvasRuntime.viewport.scale,
  }
}

function buildLayerItems(nodes: DocumentNode[]): LayerItem[] {
  const {nodeById, childIdsByParent, roots} = buildLayerHierarchyIndex(nodes)
  const flattened: LayerItem[] = []
  const visited = new Set<string>()

  const visit = (node: DocumentNode, depth: number) => {
    if (visited.has(node.id)) {
      return
    }

    visited.add(node.id)
    flattened.push(createLayerItem(node, depth))

    const nextChildIds = resolveLayerChildIds(node, nodeById, childIdsByParent)

    nextChildIds.forEach((childId) => {
      const child = nodeById.get(childId)
      if (child) {
        visit(child, depth + 1)
      }
    })
  }

  roots.forEach((node) => visit(node, 0))
  nodes.forEach((node) => visit(node, 0))

  return flattened
}

function buildLayerHierarchyIndex(nodes: DocumentNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const childIdsByParent = new Map<string, string[]>()

  nodes.forEach((node) => {
    if (!node.parentId) {
      return
    }

    const current = childIdsByParent.get(node.parentId) ?? []
    current.push(node.id)
    childIdsByParent.set(node.parentId, current)
  })

  const roots = nodes.filter((node) => !node.parentId || !nodeById.has(node.parentId))

  return {
    nodeById,
    childIdsByParent,
    roots,
  }
}

function createLayerItem(node: DocumentNode, depth: number): LayerItem {
  const layerFlags = node as DocumentNode & {
    isVisible?: boolean
    isLocked?: boolean
  }

  return {
    id: node.id,
    name: node.text ?? node.name ?? node.id,
    show: true,
    isVisible: layerFlags.isVisible !== false,
    isLocked: layerFlags.isLocked === true,
    type: node.type,
    depth,
    isGroup: node.type === 'group',
  }
}

function resolveLayerChildIds(
  node: DocumentNode,
  nodeById: Map<string, DocumentNode>,
  childIdsByParent: Map<string, string[]>,
) {
  const explicitChildIds = node.childIds?.filter((childId) => nodeById.has(childId)) ?? []
  const inferredChildIds = childIdsByParent.get(node.id) ?? []
  return explicitChildIds.length > 0 ? explicitChildIds : inferredChildIds
}

function buildLayerItemsCached(nodes: DocumentNode[]): LayerItem[] {
  const cached = layerItemsCache.get(nodes)
  if (cached) {
    return cached
  }

  const next = buildLayerItems(nodes)
  layerItemsCache.set(nodes, next)
  return next
}
