import type {DraftPrimitive, DraftPrimitiveType, InteractionBounds, InteractionPoint} from '../types.ts'

export function createDraftManager() {
  const drafts = new Map<string, DraftPrimitive>()

  const startDraft = (params: {
    id: string
    type: DraftPrimitiveType
    start: InteractionPoint
  }) => {
    const next: DraftPrimitive = {
      id: params.id,
      type: params.type,
      points: [params.start],
      bounds: {
        minX: params.start.x,
        minY: params.start.y,
        maxX: params.start.x,
        maxY: params.start.y,
      },
    }
    drafts.set(next.id, next)
    return next
  }

  const updateDraft = (id: string, point: InteractionPoint) => {
    const draft = drafts.get(id)
    if (!draft) {
      return null
    }

    const points = [...draft.points, point]
    const bounds = points.reduce<InteractionBounds>(
      (acc, item) => ({
        minX: Math.min(acc.minX, item.x),
        minY: Math.min(acc.minY, item.y),
        maxX: Math.max(acc.maxX, item.x),
        maxY: Math.max(acc.maxY, item.y),
      }),
      {
        minX: points[0].x,
        minY: points[0].y,
        maxX: points[0].x,
        maxY: points[0].y,
      },
    )

    const next: DraftPrimitive = {
      ...draft,
      points,
      bounds,
    }
    drafts.set(id, next)
    return next
  }

  const commitDraft = (id: string) => {
    const current = drafts.get(id) ?? null
    drafts.delete(id)
    return current
  }

  const cancelDraft = (id: string) => {
    drafts.delete(id)
  }

  const getDrafts = () => Array.from(drafts.values())

  return {
    startDraft,
    updateDraft,
    commitDraft,
    cancelDraft,
    getDrafts,
  }
}
