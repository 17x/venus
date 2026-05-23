import type {RuntimeSceneLatest} from '../model/index.ts'
import type {EditorFileDocument} from '../types/index.ts'
import {createRuntimeNodeFromElement} from './fileFormatScene/nodeFromElement.ts'

/**
 * Resolves page dimensions from active page model with fallback to legacy config page.
 * @param file Source file payload.
 */
function resolveActivePageSpec(file: EditorFileDocument): {width: number; height: number} {
  if (Array.isArray(file.pages) && file.pages.length > 0) {
    const activePage = file.pages.find((page) => page.id === file.activePageId) ?? file.pages[0]
    if (activePage) {
      return {
        width: activePage.width,
        height: activePage.height,
      }
    }
  }

  return {
    width: file.config.page.width,
    height: file.config.page.height,
  }
}

/**
 * Converts the app-level JSON file into the normalized file-format runtime
 * scene so the editor can go through a single parse entry afterwards.
 * @param file Source editor file payload.
 */
export function createRuntimeSceneFromVisionFile(file: EditorFileDocument): RuntimeSceneLatest {
  const activePage = resolveActivePageSpec(file)
  const runtimeNodes = file.elements.map((element) => createRuntimeNodeFromElement(element))
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]))
  const rootNodes: RuntimeSceneLatest['nodes'] = []

  runtimeNodes.forEach((node) => {
    if (node.parentId) {
      const parent = nodeById.get(node.parentId)
      if (parent) {
        parent.children.push(node)
        return
      }
    }

    rootNodes.push(node)
  })

  return {
    version: 5,
    canvasWidth: activePage.width,
    canvasHeight: activePage.height,
    gradients: [],
    rootElements: [],
    documentId: file.id,
    product: 'VECTOR',
    editorKey: file.name,
    metadata: [],
    // Keep scene nodes source-of-truth from file elements; avoid injecting a synthetic frame.
    nodes: rootNodes,
  }
}
