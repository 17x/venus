import type {EditorDocument} from '../../runtime/model/index.ts'

/** Declares one selection filtering input payload for canvas/runtime hit candidates. */
export interface RuntimeSelectionFilterInput {
  /** Stores ordered candidate ids resolved from runtime geometry query. */
  readonly candidateIds: readonly string[]
  /** Stores current interaction-scoped document used as selection allow-list. */
  readonly interactionDocument: EditorDocument
  /** Stores optional lock predicate when runtime exposes lock-state metadata. */
  readonly isLocked?: (shapeId: string) => boolean
  /** Stores optional hidden predicate when runtime exposes visibility-state metadata. */
  readonly isHidden?: (shapeId: string) => boolean
}

/**
 * Resolves one stable allow-id set from the active interaction document snapshot.
 * @param document Active interaction document constrained by product policies (for example isolation mode).
 */
export function resolveRuntimeSelectionAllowIdSet(document: EditorDocument): ReadonlySet<string> {
  return new Set(document.shapes.map((shape) => shape.id))
}

/**
 * Filters runtime geometry candidates through one shared lock/hidden/isolation policy.
 * @param input Candidate ids and policy predicates.
 */
export function filterRuntimeSelectionCandidateIds(input: RuntimeSelectionFilterInput): string[] {
  const allowIdSet = resolveRuntimeSelectionAllowIdSet(input.interactionDocument)
  const filteredIds: string[] = []
  const emittedIds = new Set<string>()

  for (const candidateId of input.candidateIds) {
    // Keep candidate order deterministic while removing duplicate ids from mixed hit payload sources.
    if (emittedIds.has(candidateId)) {
      continue
    }
    if (!allowIdSet.has(candidateId)) {
      continue
    }
    if (input.isHidden?.(candidateId)) {
      continue
    }
    if (input.isLocked?.(candidateId)) {
      continue
    }
    emittedIds.add(candidateId)
    filteredIds.push(candidateId)
  }

  return filteredIds
}
