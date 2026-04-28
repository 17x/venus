import type { EngineDrawCommand, EngineLayeredRenderInput } from '../../../core/types.ts'
import type { EngineRenderableNode } from '../../../scene/types/types.ts'
import { resolveRenderableNodeBounds } from '../../../scene/geometry/bbox.ts'
import { applyActivePreviewTransform } from './activeTransform.ts'

/**
 * Resolves active-layer draw commands from active interaction ids only.
  * @param input Input payload for this operation.
*/
export function renderActiveLayer(input: EngineLayeredRenderInput): EngineDrawCommand[] {
  const activeIds = input.interaction.activeIds
  if (!activeIds || activeIds.size === 0) {
    return []
  }

  const commands: EngineDrawCommand[] = []
  visitRenderableNodes(input.scene.nodes, (node) => {
    if (!activeIds.has(node.id)) {
      return
    }

    const nextCommand: EngineDrawCommand = {
      id: `active:${node.id}`,
      nodeId: node.id,
      layer: 'active',
      nodeType: node.type,
      bounds: resolveRenderableNodeBounds(node),
    }
    commands.push(applyActivePreviewTransform(nextCommand, input))
  })

  return commands
}

/**
 * Walks scene nodes depth-first and reports non-group renderable nodes.
  * @param nodes nodes parameter.
 * @param visit visit parameter.
*/
function visitRenderableNodes(
  nodes: readonly EngineRenderableNode[],
  visit: (node: Exclude<EngineRenderableNode, { type: 'group' }>) => void,
) {
  for (const node of nodes) {
    if (node.type === 'group') {
      visitRenderableNodes(node.children, visit)
      continue
    }

    visit(node)
  }
}
