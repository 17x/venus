/** Declares minimal picking hit contract consumed by runtime adapter. */
export interface RuntimePickingHit {
  /** Stores render-entity identifier resolved by picking stage. */
  entityId: string
  /** Stores picking rank where lower means better match. */
  rank: number
}

// --- Product-level hit-test result types ---

/** Classification of what was hit at the product level */
export type HitTestTargetKind =
  | 'shape'
  | 'group'
  | 'text'
  | 'image'
  | 'handle'
  | 'guide'
  | 'overlay'
  | 'canvas'

/** Product-visible hit candidate after runtime filtering and enrichment */
export interface RuntimeHitCandidate {
  /** Product-level node id */
  readonly nodeId: string
  /** Render-level entity id (may differ from nodeId for nested objects) */
  readonly renderEntityId: string
  /** Classification for product-layer branching */
  readonly kind: HitTestTargetKind
  /** Hit type from engine (e.g. 'fill', 'stroke', 'bounds') */
  readonly hitType: string
  /** World-space hit point */
  readonly worldPoint: {x: number; y: number}
  /** Relevance score (lower = closer match) */
  readonly score: number
  /** Z-order for disambiguation of overlapping objects */
  readonly zOrder: number
  /** Whether the node is locked in the product model */
  readonly locked: boolean
  /** Whether the node is hidden in the product model */
  readonly hidden: boolean
  /** Whether the node passes product eligibility (visible + unlocked + not isolated-out) */
  readonly eligible: boolean
  /** Parent group id if this node lives inside a group */
  readonly parentGroupId?: string
}

/** Full hit-test result after runtime enrichment */
export interface RuntimeHitTestResult {
  /** All candidates, ordered by score (best first) */
  readonly candidates: RuntimeHitCandidate[]
  /** Best eligible candidate, or null if nothing is eligible */
  readonly bestCandidate: RuntimeHitCandidate | null
  /** World-space query point */
  readonly queryPoint: {x: number; y: number}
}

// --- Hit-test filter options ---

export interface RuntimeHitTestFilterOptions {
  /** If true, locked nodes are excluded from eligible results */
  excludeLocked?: boolean
  /** If true, hidden nodes are excluded entirely */
  excludeHidden?: boolean
  /** Set of node ids to exclude (e.g. dragged objects during move) */
  excludeIds?: ReadonlySet<string>
  /** If set, only nodes inside this group context are eligible (isolation mode) */
  isolationGroupId?: string
  /** If true, handles and overlays take priority over scene objects */
  handlePriority?: boolean
}

// --- Node state provider ---

/**
 * Callback for the adapter to query product-level node state.
 * Implementations live in the product layer and are injected into the adapter.
 */
export interface RuntimeNodeStateProvider {
  isLocked(nodeId: string): boolean
  isHidden(nodeId: string): boolean
  getParentGroupId(nodeId: string): string | undefined
  getNodeKind(nodeId: string): HitTestTargetKind
}

// --- Adapter ---

/**
 * Bridges engine-level hit-test results into product-consumable candidates.
 *
 * The current runtime picking API exposes ordered hit items.
 * This adapter consumes the ordered hit list and enriches each hit with
 * product semantics (lock/visibility/isolation policy).
 */
export function createRuntimeHitTestAdapter(stateProvider: RuntimeNodeStateProvider) {
  function enrichResult(
    engineResults: readonly RuntimePickingHit[],
    queryPoint: {x: number; y: number},
    options?: RuntimeHitTestFilterOptions,
  ): RuntimeHitTestResult {
    const candidates: RuntimeHitCandidate[] = []
    const seenNodeIds = new Set<string>()
    const excludeIds = options?.excludeIds

    for (let i = 0; i < engineResults.length; i++) {
      const er = engineResults[i]
      const nodeId = er.entityId
      if (excludeIds?.has(nodeId)) continue
      if (seenNodeIds.has(nodeId)) continue

      const locked = stateProvider.isLocked(nodeId)
      const hidden = stateProvider.isHidden(nodeId)

      if (options?.excludeHidden && hidden) continue

      const parentGroupId = stateProvider.getParentGroupId(nodeId)
      const kind = stateProvider.getNodeKind(nodeId)

      // Isolation mode: skip nodes outside the isolation group.
      const inIsolation =
        !options?.isolationGroupId ||
        nodeId === options.isolationGroupId ||
        parentGroupId === options.isolationGroupId

      const eligible =
        !hidden &&
        !(options?.excludeLocked && locked) &&
        inIsolation

      seenNodeIds.add(nodeId)

      candidates.push({
        nodeId,
        renderEntityId: er.entityId,
        kind,
        hitType: 'bounds',
        worldPoint: queryPoint,
        score: er.rank,
        zOrder: engineResults.length - i,
        locked,
        hidden,
        eligible,
        parentGroupId,
      })
    }

    // Sort: eligible first, then by score ascending.
    candidates.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
      return a.score - b.score
    })

    const bestCandidate = candidates.find((candidate) => candidate.eligible) ?? null

    return {candidates, bestCandidate, queryPoint}
  }

  return {enrichResult}
}

export type RuntimeHitTestAdapter = ReturnType<typeof createRuntimeHitTestAdapter>

