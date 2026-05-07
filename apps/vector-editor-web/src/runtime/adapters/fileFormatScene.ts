import type {RuntimeSceneLatest} from '../model/index.ts'
import type {EditorFileDocument} from '../types/index.ts'
import {createRuntimeNodeFromElement} from './fileFormatScene/nodeFromElement.ts'

/**
 * Converts the app-level JSON file into the normalized file-format runtime
 * scene so the editor can go through a single parse entry afterwards.
 */
export function createRuntimeSceneFromVisionFile(file: EditorFileDocument): RuntimeSceneLatest {
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
    canvasWidth: file.config.page.width,
    canvasHeight: file.config.page.height,
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
