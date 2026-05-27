import type {
  DocumentNode,
  EditorDocument,
  EditorDocumentLifecycleDirtySource,
  EditorDocumentLifecycleState,
  EditorDocumentPage,
  EditorDocumentSchema,
  EditorDocumentLifecycleTransitionSource,
  EditorDocumentStyleReferences,
} from '../documentModel.ts'
/** Stores canonical schema namespace for editor document payloads. */
export const EDITOR_DOCUMENT_SCHEMA_NAME = 'venus.vector.document'
/** Stores current schema version used by migration entry points. */
export const EDITOR_DOCUMENT_SCHEMA_VERSION = 1
/** Stores current schema major used by compatibility gates. */
export const EDITOR_DOCUMENT_SCHEMA_MAJOR = 1
/** Stores current schema minor used by additive migration gates. */
export const EDITOR_DOCUMENT_SCHEMA_MINOR = 0
/** Declares one invariant violation payload returned by governance checks. */
export interface DocumentInvariantViolation {
  /** Stores stable violation code for deterministic assertions. */
  code:
    | 'duplicate-node-id'
    | 'missing-parent'
    | 'parent-not-group'
    | 'parent-child-mismatch'
    | 'child-parent-mismatch'
    | 'cycle-detected'
    | 'missing-active-page'
  /** Stores human-readable violation message for diagnostics. */
  message: string
  /** Stores optional node id related to this violation. */
  nodeId?: string
}
/** Declares optional context payload used by lifecycle transition evolution. */
export interface EditorDocumentLifecycleTransitionContext {
  /** Stores transition source metadata used by observability and diagnostics. */
  source?: EditorDocumentLifecycleTransitionSource
  /** Stores command-derived dirty source metadata for traceability. */
  dirtySource?: EditorDocumentLifecycleDirtySource
  /** Stores optional recovery reason kept for backwards-compatible call sites. */
  recoveryReason?: string
}
/**
 * Normalizes one editor document into canonical governance contract defaults.
 * @param document Source editor document payload.
 */
export function normalizeEditorDocumentContract(document: EditorDocument): EditorDocument {
  const now = Date.now()
  const pages = normalizeDocumentPages(document)
  const activePageId = resolveActivePageId(pages, document.activePageId)
  return {
    ...document,
    schema: normalizeDocumentSchema(document.schema),
    createdAt: typeof document.createdAt === 'number' ? document.createdAt : now,
    updatedAt: typeof document.updatedAt === 'number' ? document.updatedAt : now,
    pages,
    activePageId,
    lifecycle: normalizeLifecycleState(document.lifecycle),
    styleReferences: normalizeStyleReferences(document.styleReferences),
    extensions: normalizeExtensions(document.extensions),
    shapes: document.shapes.map((shape) => normalizeDocumentNode(shape)),
  }
}
/**
 * Creates one lifecycle snapshot from previous state and next phase.
 * @param previous Previous lifecycle snapshot.
 * @param state Next lifecycle phase.
 * @param reasonOrContext Optional recovery reason (legacy) or lifecycle transition context.
 */
export function evolveDocumentLifecycleState(
  previous: EditorDocumentLifecycleState | undefined,
  state: EditorDocumentLifecycleState['state'],
  reasonOrContext?: string | EditorDocumentLifecycleTransitionContext,
): EditorDocumentLifecycleState {
  const baseline = normalizeLifecycleState(previous)
  const context = resolveLifecycleTransitionContext(reasonOrContext)
  const source = context.source ?? createDefaultLifecycleTransitionSource(state)
  if (state === 'saving') {
    return {
      ...baseline,
      state,
      dirty: true,
      recoveryReason: undefined,
      lastTransitionSource: source,
    }
  }
  if (state === 'dirty') {
    return {
      ...baseline,
      state,
      dirty: true,
      recoveryReason: undefined,
      lastTransitionSource: source,
      lastDirtySource: context.dirtySource ?? baseline.lastDirtySource,
    }
  }
  if (state === 'recovery') {
    return {
      ...baseline,
      state,
      dirty: true,
      recoveryReason: context.recoveryReason ?? baseline.recoveryReason,
      lastTransitionSource: source,
    }
  }
  if (state === 'opened') {
    return {
      ...baseline,
      state,
      dirty: false,
      lastSavedAt: Date.now(),
      recoveryReason: undefined,
      lastTransitionSource: source,
    }
  }
  if (state === 'saved') {
    return {
      ...baseline,
      state,
      dirty: false,
      lastSavedAt: Date.now(),
      recoveryReason: undefined,
      lastTransitionSource: source,
      // Keep last dirty-source chain visible at save boundary for command/transaction observability.
      lastDirtySource: context.dirtySource ?? baseline.lastDirtySource,
    }
  }
  if (state === 'created') {
    return {
      ...baseline,
      state,
      dirty: false,
      recoveryReason: undefined,
      lastTransitionSource: source,
    }
  }
  return {
    ...baseline,
    state,
    dirty: baseline.dirty,
    lastTransitionSource: source,
  }
}
/**
 * Collects governance invariant violations for one editor document snapshot.
 * @param document Source editor document snapshot.
 */
export function collectDocumentInvariantViolations(document: EditorDocument): DocumentInvariantViolation[] {
  const violations: DocumentInvariantViolation[] = []
  const nodeById = new Map<string, DocumentNode>()
  document.shapes.forEach((shape) => {
    if (nodeById.has(shape.id)) {
      violations.push({
        code: 'duplicate-node-id',
        message: `duplicate node id ${shape.id}`,
        nodeId: shape.id,
      })
      return
    }
    nodeById.set(shape.id, shape)
  })
  document.shapes.forEach((shape) => {
    const parentId = shape.parentId ?? null
    if (!parentId) {
      return
    }
    const parent = nodeById.get(parentId)
    if (!parent) {
      violations.push({
        code: 'missing-parent',
        message: `node ${shape.id} references missing parent ${parentId}`,
        nodeId: shape.id,
      })
      return
    }
    if (parent.type !== 'group' && parent.type !== 'frame') {
      violations.push({
        code: 'parent-not-group',
        message: `node ${shape.id} parent ${parentId} is not a container`,
        nodeId: shape.id,
      })
      return
    }
    if (!(parent.childIds ?? []).includes(shape.id)) {
      violations.push({
        code: 'parent-child-mismatch',
        message: `node ${shape.id} parent ${parentId} does not include child id`,
        nodeId: shape.id,
      })
    }
  })
  document.shapes.forEach((shape) => {
    const childIds = shape.childIds ?? []
    if (childIds.length === 0) {
      return
    }
    childIds.forEach((childId) => {
      const child = nodeById.get(childId)
      if (!child) {
        violations.push({
          code: 'child-parent-mismatch',
          message: `node ${shape.id} references missing child ${childId}`,
          nodeId: shape.id,
        })
        return
      }
      if ((child.parentId ?? null) !== shape.id) {
        violations.push({
          code: 'child-parent-mismatch',
          message: `child ${childId} does not point back to parent ${shape.id}`,
          nodeId: childId,
        })
      }
    })
  })
  collectCycleViolations(document.shapes, violations)
  if (!document.pages || document.pages.length === 0 || !document.activePageId) {
    violations.push({
      code: 'missing-active-page',
      message: 'document pages/activePageId contract is missing',
    })
  } else {
    const hasActivePage = document.pages.some((page) => page.id === document.activePageId)
    if (!hasActivePage) {
      violations.push({
        code: 'missing-active-page',
        message: `active page ${document.activePageId} does not exist in pages`,
      })
    }
  }
  return violations
}
/**
 * Checks whether one document satisfies all governance invariants.
 * @param document Source editor document snapshot.
 */
export function isEditorDocumentInvariantSafe(document: EditorDocument): boolean {
  return collectDocumentInvariantViolations(document).length === 0
}
/**
 * Normalizes one document node for style-ref and extension compatibility.
 * @param shape Source document node.
 */
function normalizeDocumentNode(shape: DocumentNode): DocumentNode {
  const styleRefs = shape.styleRefs ?? {
    fillStyleId: undefined,
    strokeStyleId: undefined,
    textStyleId: undefined,
    effectStyleId: undefined,
  }
  return {
    ...shape,
    styleRefs,
    extensions: normalizeExtensions(shape.extensions),
  }
}
/**
 * Normalizes one schema payload using canonical defaults.
 * @param schema Source schema payload.
 */
function normalizeDocumentSchema(schema: EditorDocumentSchema | undefined): EditorDocumentSchema {
  const major = typeof schema?.major === 'number'
    ? schema.major
    : typeof schema?.version === 'number'
      ? schema.version
      : EDITOR_DOCUMENT_SCHEMA_MAJOR
  return {
    name: typeof schema?.name === 'string' ? schema.name : EDITOR_DOCUMENT_SCHEMA_NAME,
    version: typeof schema?.version === 'number' ? schema.version : EDITOR_DOCUMENT_SCHEMA_VERSION,
    major,
    minor: typeof schema?.minor === 'number' ? schema.minor : EDITOR_DOCUMENT_SCHEMA_MINOR,
  }
}
/**
 * Normalizes one lifecycle payload using canonical defaults.
 * @param lifecycle Source lifecycle payload.
 */
function normalizeLifecycleState(
  lifecycle: EditorDocumentLifecycleState | undefined,
): EditorDocumentLifecycleState {
  const defaultSource = createDeterministicLifecycleTransitionSource(
    lifecycle?.state ?? 'opened',
    lifecycle?.lastSavedAt,
  )
  return {
    state: lifecycle?.state ?? 'opened',
    dirty: lifecycle?.dirty ?? false,
    lastSavedAt: typeof lifecycle?.lastSavedAt === 'number' ? lifecycle.lastSavedAt : undefined,
    recoveryReason: typeof lifecycle?.recoveryReason === 'string' ? lifecycle.recoveryReason : undefined,
    lastTransitionSource: normalizeLifecycleTransitionSource(lifecycle?.lastTransitionSource) ?? defaultSource,
    lastDirtySource: normalizeLifecycleDirtySource(lifecycle?.lastDirtySource),
  }
}
/**
 * Creates one deterministic transition source payload for normalization-only fallback paths.
 * @param state Lifecycle state being normalized.
 * @param issuedAt Optional persisted timestamp from lifecycle snapshot.
 */
function createDeterministicLifecycleTransitionSource(
  state: EditorDocumentLifecycleState['state'],
  issuedAt?: number,
): EditorDocumentLifecycleTransitionSource {
  return {
    kind: 'system',
    event: `lifecycle.${state}`,
    issuedAt: typeof issuedAt === 'number' ? issuedAt : 0,
  }
}
/**
 * Resolves one optional lifecycle transition context from legacy/new call signatures.
 * @param reasonOrContext Optional recovery reason (legacy) or lifecycle transition context.
 */
function resolveLifecycleTransitionContext(
  reasonOrContext: string | EditorDocumentLifecycleTransitionContext | undefined,
): EditorDocumentLifecycleTransitionContext {
  if (typeof reasonOrContext === 'string') {
    return {
      recoveryReason: reasonOrContext,
    }
  }
  return reasonOrContext ?? {}
}
/**
 * Creates one default transition source payload for deterministic lifecycle observability.
 * @param state Lifecycle state being entered.
 */
function createDefaultLifecycleTransitionSource(
  state: EditorDocumentLifecycleState['state'],
): EditorDocumentLifecycleTransitionSource {
  return {
    kind: 'system',
    event: `lifecycle.${state}`,
    issuedAt: Date.now(),
  }
}
/**
 * Normalizes one transition source payload from persisted/legacy lifecycle state.
 * @param source Source transition payload from lifecycle snapshot.
 */
function normalizeLifecycleTransitionSource(
  source: EditorDocumentLifecycleTransitionSource | undefined,
): EditorDocumentLifecycleTransitionSource | undefined {
  if (!source || typeof source !== 'object') {
    return undefined
  }
  if (
    source.kind !== 'system' &&
    source.kind !== 'user' &&
    source.kind !== 'command' &&
    source.kind !== 'import'
  ) {
    return undefined
  }
  if (typeof source.event !== 'string' || source.event.length === 0) {
    return undefined
  }
  return {
    kind: source.kind,
    event: source.event,
    commandId: typeof source.commandId === 'string' ? source.commandId : undefined,
    transactionId: typeof source.transactionId === 'string' ? source.transactionId : undefined,
    commandType: typeof source.commandType === 'string' ? source.commandType : undefined,
    issuedAt: typeof source.issuedAt === 'number' ? source.issuedAt : Date.now(),
  }
}
/**
 * Normalizes one dirty source payload from persisted/legacy lifecycle state.
 * @param dirtySource Dirty source payload from lifecycle snapshot.
 */
function normalizeLifecycleDirtySource(
  dirtySource: EditorDocumentLifecycleDirtySource | undefined,
): EditorDocumentLifecycleDirtySource | undefined {
  if (!dirtySource || typeof dirtySource !== 'object') {
    return undefined
  }
  if (
    typeof dirtySource.commandType !== 'string' ||
    typeof dirtySource.transactionId !== 'string' ||
    typeof dirtySource.issuedAt !== 'number'
  ) {
    return undefined
  }
  return {
    commandType: dirtySource.commandType,
    commandId: typeof dirtySource.commandId === 'string' ? dirtySource.commandId : undefined,
    transactionId: dirtySource.transactionId,
    issuedAt: dirtySource.issuedAt,
  }
}
/**
 * Normalizes page payload and backfills single-page defaults when missing.
 * @param document Source editor document snapshot.
 */
function normalizeDocumentPages(document: EditorDocument): EditorDocumentPage[] {
  if (Array.isArray(document.pages) && document.pages.length > 0) {
    return document.pages.map((page) => ({
      id: page.id,
      name: page.name,
      width: page.width,
      height: page.height,
    }))
  }
  return [
    {
      id: 'page-1',
      name: 'Page 1',
      width: document.width,
      height: document.height,
    },
  ]
}
/**
 * Resolves active page id from pages list and preferred id.
 * @param pages Canonical pages list.
 * @param preferredActivePageId Preferred active page id from source payload.
 */
function resolveActivePageId(pages: EditorDocumentPage[], preferredActivePageId: string | undefined): string {
  if (preferredActivePageId && pages.some((page) => page.id === preferredActivePageId)) {
    return preferredActivePageId
  }
  return pages[0]?.id ?? 'page-1'
}
/**
 * Normalizes style-library references map.
 * @param styleReferences Source style reference map.
 */
function normalizeStyleReferences(
  styleReferences: EditorDocumentStyleReferences | undefined,
): EditorDocumentStyleReferences {
  return {
    fills: styleReferences?.fills ?? {},
    strokes: styleReferences?.strokes ?? {},
    texts: styleReferences?.texts ?? {},
    effects: styleReferences?.effects ?? {},
  }
}
/**
 * Normalizes extension namespace payload.
 * @param extensions Source extension payload.
 */
function normalizeExtensions(extensions: Record<string, unknown> | undefined): Record<string, unknown> {
  return extensions && typeof extensions === 'object'
    ? {...extensions}
    : {}
}
/**
 * Collects cycle violations by traversing parent pointers as a directed graph.
 * @param shapes Shape list from source document.
 * @param violations Mutable violation collection.
 */
function collectCycleViolations(shapes: DocumentNode[], violations: DocumentInvariantViolation[]): void {
  const parentById = new Map(shapes.map((shape) => [shape.id, shape.parentId ?? null]))
  shapes.forEach((shape) => {
    const visited = new Set<string>([shape.id])
    let cursor = parentById.get(shape.id) ?? null
    while (cursor) {
      if (visited.has(cursor)) {
        violations.push({
          code: 'cycle-detected',
          message: `cycle detected at node ${shape.id}`,
          nodeId: shape.id,
        })
        return
      }
      visited.add(cursor)
      cursor = parentById.get(cursor) ?? null
    }
  })
}
