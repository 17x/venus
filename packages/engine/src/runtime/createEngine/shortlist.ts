import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from '../../scene/types.ts'

// Expand shortlist candidates through ancestors and descendants so renderer
// planning can prune safely without hiding leaf nodes behind coarse group ids.
export function resolveShortlistCandidateNodeIds(
  scene: EngineSceneSnapshot,
  framePlan: EngineFramePlan,
  protectedNodeIds: readonly EngineNodeId[] | undefined,
) {
  const mergedCandidateIdSet = new Set(framePlan.candidateNodeIds)
  if (protectedNodeIds && protectedNodeIds.length > 0) {
    // Keep currently active nodes in render planning even when coarse
    // viewport candidates are narrow.
    for (const nodeId of protectedNodeIds) {
      mergedCandidateIdSet.add(nodeId)
    }
  }

  const parentIdByNodeId = new Map<EngineNodeId, EngineNodeId>()
  const childIdsByGroupId = new Map<EngineNodeId, EngineNodeId[]>()
  const groupIdSet = new Set<EngineNodeId>()
  const collectParents = (
    nodes: readonly EngineRenderableNode[],
    parentId: EngineNodeId | null,
  ) => {
    for (const node of nodes) {
      if (parentId) {
        parentIdByNodeId.set(node.id, parentId)
      }

      if (node.type === 'group') {
        groupIdSet.add(node.id)
        // Track direct children so candidate groups can expand to descendant
        // leaves and avoid false negatives from coarse spatial shortlist ids.
        childIdsByGroupId.set(
          node.id,
          node.children.map((child) => child.id),
        )
        collectParents(node.children, node.id)
      }
    }
  }
  collectParents(scene.nodes, null)

  const seedIds = Array.from(mergedCandidateIdSet)
  for (const nodeId of seedIds) {
    let parentId = parentIdByNodeId.get(nodeId)
    while (parentId) {
      if (mergedCandidateIdSet.has(parentId)) {
        break
      }

      mergedCandidateIdSet.add(parentId)
      parentId = parentIdByNodeId.get(parentId)
    }
  }

  // Also expand from candidate groups downward because some spatial-index
  // frames can return container/group ids without all overlapping leaves.
  const groupQueue: EngineNodeId[] = []
  for (const nodeId of Array.from(mergedCandidateIdSet)) {
    if (groupIdSet.has(nodeId)) {
      groupQueue.push(nodeId)
    }
  }

  while (groupQueue.length > 0) {
    const groupId = groupQueue.pop()
    if (!groupId) {
      continue
    }

    const childIds = childIdsByGroupId.get(groupId)
    if (!childIds || childIds.length === 0) {
      continue
    }

    for (const childId of childIds) {
      if (mergedCandidateIdSet.has(childId)) {
        continue
      }

      mergedCandidateIdSet.add(childId)
      if (groupIdSet.has(childId)) {
        groupQueue.push(childId)
      }
    }
  }

  return Array.from(mergedCandidateIdSet)
}