import type { EngineDrawCommand, EngineLayeredRenderInput } from '../../../render/index.ts'
import type { EngineRenderableNode } from '../../../scene/types/types.ts'
import { resolveRenderableNodeBounds } from '../../../scene/geometry/bbox.ts'
import { shouldCullBaseCommand } from './baseCulling.ts'
import { resolveEngineDrawCommandShadingBinding } from '../../../material/index.ts'

/**
 * Resolves base-layer draw commands by excluding active nodes from scene rendering.
  * @param input Input payload for this operation.
*/
export function renderBaseLayer(input: EngineLayeredRenderInput): EngineDrawCommand[] {
  const activeIds = input.interaction.activeIds
  const commands: EngineDrawCommand[] = []

  // Base layer must exclude active ids to avoid double rendering with active layer.
  visitRenderableNodes(input.scene.nodes, (node) => {
    if (activeIds?.has(node.id)) {
      return
    }

    const bounds = resolveRenderableNodeBounds(node)
    if (shouldCullBaseCommand(bounds, input.options?.viewport)) {
      return
    }
    const shading = resolveEngineDrawCommandShadingBinding(node, input)

    commands.push({
      id: `base:${node.id}`,
      nodeId: node.id,
      layer: 'base',
      nodeType: node.type,
      bounds,
      material: shading.material,
      lighting: shading.lighting,
    })
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
