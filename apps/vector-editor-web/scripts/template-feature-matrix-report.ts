import {generateTemplateFile} from '../src/runtime/templatePresets/generators/generators.ts'
import type {ElementProps} from '../src/runtime/types/index.ts'

/**
 * Declares one concise feature-matrix coverage report payload.
 */
interface FeatureMatrixCoverageReport {
  /** Stores total element count in generated fixture. */
  totalElements: number
  /** Stores sorted shape-type coverage list. */
  shapeTypes: string[]
  /** Stores deepest nested group level found in fixture. */
  maxGroupDepth: number
  /** Stores whether required render-detail feature probes are present. */
  featureChecks: Record<string, boolean>
  /** Stores interaction-state marker coverage extracted from extensions.matrix. */
  interactionStates: string[]
  /** Stores matrix payload seed for deterministic reproducibility. */
  seed: number | null
}

/**
 * Resolves one deterministic parent-chain depth for a given element id.
 * @param elementById Element lookup map.
 * @param elementId Element id to resolve depth for.
 */
function resolveParentDepth(
  elementById: Map<string, ElementProps>,
  elementId: string,
): number {
  let depth = 0
  let current = elementById.get(elementId) ?? null
  const visited = new Set<string>()

  while (current?.parentId && typeof current.parentId === 'string') {
    if (visited.has(current.id)) {
      break
    }
    visited.add(current.id)
    depth += 1
    current = elementById.get(current.parentId) ?? null
  }

  return depth
}

/**
 * Builds one feature-matrix coverage report from generated template elements.
 * @param elements Generated template elements.
 * @param matrixPayload Optional file extension matrix payload.
 */
function createCoverageReport(
  elements: readonly ElementProps[],
  matrixPayload: Record<string, unknown> | undefined,
): FeatureMatrixCoverageReport {
  const elementById = new Map(elements.map((element) => [element.id, element]))
  const shapeTypes = Array.from(new Set(elements.map((element) => element.type))).sort()
  const maxGroupDepth = elements.reduce((currentMax, element) => {
    if (element.type !== 'group') {
      return currentMax
    }
    return Math.max(currentMax, resolveParentDepth(elementById, element.id))
  }, 0)

  const interactionStates = Array.from(new Set(elements.flatMap((element) => {
    const state = (element.extensions?.matrix as {interactionState?: unknown} | undefined)?.interactionState
    return typeof state === 'string' ? [state] : []
  }))).sort()

  const featureChecks = {
    hasAllCoreShapeTypes: ['frame', 'group', 'rectangle', 'ellipse', 'polygon', 'star', 'lineSegment', 'path', 'text', 'image']
      .every((type) => shapeTypes.includes(type)),
    hasBezierPath: elements.some((element) => element.type === 'path' && Array.isArray(element.bezierPoints) && element.bezierPoints.length >= 3),
    hasRichTextRuns: elements.some((element) => element.type === 'text' && Array.isArray(element.textRuns) && element.textRuns.length >= 3),
    hasMaskClipImage: elements.some((element) => element.type === 'image' && typeof element.clipPathId === 'string' && element.clipPathId.length > 0),
    hasGradient: elements.some((element) => Boolean(element.fill?.gradient) || Boolean(element.stroke?.gradient)),
    hasShadow: elements.some((element) => Boolean(element.shadow?.enabled)),
    hasFlipOrRotation: elements.some((element) => Boolean(element.flipX) || Boolean(element.flipY) || Math.abs(element.rotation ?? 0) > 0),
    hasInteractionCoverageMarkers: ['hover', 'marquee', 'selected', 'handles', 'cursor']
      .every((state) => interactionStates.some((candidate) => candidate.includes(state))),
  }

  return {
    totalElements: elements.length,
    shapeTypes,
    maxGroupDepth,
    featureChecks,
    interactionStates,
    seed: typeof matrixPayload?.seed === 'number' ? matrixPayload.seed : null,
  }
}

/**
 * Generates and prints one deterministic feature-matrix coverage report.
 */
function main() {
  const template = generateTemplateFile('test-feature-matrix', {seed: 71001})
  const matrixPayload = (template.extensions?.matrix ?? undefined) as Record<string, unknown> | undefined
  const report = createCoverageReport(template.elements, matrixPayload)

  console.log('[feature-matrix] coverage summary')
  console.log(JSON.stringify(report, null, 2))
}

main()
