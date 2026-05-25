import assert from 'node:assert/strict'
import test from 'node:test'

import {generateTemplateFile} from '../../../runtime/templatePresets/generators/generators.ts'
import type {ElementProps} from '../../../runtime/types/index.ts'

/**
 * Resolves one element by id and fails fast when fixture drift removes the target.
 * @param elements Template element list.
 * @param id Stable element id.
 */
function resolveElementById(elements: readonly ElementProps[], id: string): ElementProps {
  const matched = elements.find((element) => element.id === id)
  assert.ok(matched, `expected element to exist: ${id}`)
  return matched
}

/**
 * Builds one deterministic feature-matrix template fixture for contract assertions.
 */
function createFeatureMatrixTemplateFixture() {
  return generateTemplateFile('test-feature-matrix', {seed: 71001})
}

test('feature matrix template keeps deep group chain and core shape coverage stable', () => {
  const template = createFeatureMatrixTemplateFixture()
  const elements = template.elements

  assert.equal(template.name, 'Feature Matrix Deep Groups')
  assert.ok(elements.length >= 24)

  const expectedGroupChain = Array.from({length: 8}, (_, index) => `matrix-group-depth-${index + 1}`)
  expectedGroupChain.forEach((groupId, index) => {
    const group = resolveElementById(elements, groupId)
    assert.equal(group.type, 'group')
    const expectedParentId = index === 0 ? 'matrix-root-frame' : expectedGroupChain[index - 1]
    assert.equal(group.parentId, expectedParentId)
  })

  const rootFrame = resolveElementById(elements, 'matrix-root-frame')
  assert.equal(rootFrame.type, 'frame')

  const typeSet = new Set(elements.map((element) => element.type))
  ;[
    'frame',
    'group',
    'rectangle',
    'ellipse',
    'polygon',
    'star',
    'lineSegment',
    'path',
    'text',
    'image',
  ].forEach((type) => {
    assert.equal(typeSet.has(type), true, `expected shape type in feature matrix: ${type}`)
  })
})

test('feature matrix template keeps render-detail feature set stable', () => {
  const template = createFeatureMatrixTemplateFixture()
  const elements = template.elements

  const bezierPath = resolveElementById(elements, 'matrix-path-curve')
  assert.equal(bezierPath.type, 'path')
  assert.ok(Array.isArray(bezierPath.bezierPoints))
  assert.ok((bezierPath.bezierPoints?.length ?? 0) >= 3)

  const richText = resolveElementById(elements, 'matrix-text-rich')
  assert.equal(richText.type, 'text')
  assert.ok(Array.isArray(richText.textRuns))
  assert.ok((richText.textRuns?.length ?? 0) >= 3)

  const maskedImage = resolveElementById(elements, 'matrix-image-host')
  assert.equal(maskedImage.type, 'image')
  assert.equal(maskedImage.clipPathId, 'matrix-mask-source')
  assert.equal(maskedImage.clipRule, 'evenodd')

  const gradientRect = resolveElementById(elements, 'matrix-rect-main')
  assert.equal(gradientRect.type, 'rectangle')
  assert.ok(Boolean(gradientRect.fill?.gradient))
  assert.ok(Boolean(gradientRect.stroke?.gradient))
  assert.ok(Boolean(gradientRect.shadow?.enabled))
  assert.equal(typeof gradientRect.rotation, 'number')

  const arcEllipse = resolveElementById(elements, 'matrix-ellipse-arc')
  assert.equal(arcEllipse.type, 'ellipse')
  assert.equal(typeof arcEllipse.ellipseStartAngle, 'number')
  assert.equal(typeof arcEllipse.ellipseEndAngle, 'number')
  assert.equal(arcEllipse.flipX, true)

  assert.ok((template.assets?.length ?? 0) >= 2)
})

test('feature matrix template exposes interaction state matrix labels for overlay routing', () => {
  const template = createFeatureMatrixTemplateFixture()
  const elements = template.elements

  const interactionStates = new Set<string>()
  elements.forEach((element) => {
    const matrixPayload = element.extensions?.matrix as {interactionState?: string} | undefined
    if (typeof matrixPayload?.interactionState === 'string') {
      interactionStates.add(matrixPayload.interactionState)
    }
  })

  ;[
    'hover',
    'marquee',
    'selected',
    'handles',
    'cursor',
  ].forEach((state) => {
    const hasState = Array.from(interactionStates).some((candidate) => candidate.includes(state))
    assert.equal(hasState, true, `expected interaction state marker: ${state}`)
  })

  const fileMatrixPayload = template.extensions?.matrix as {
    interactionStateCoverage?: string[]
    depthGroupLevels?: number
  } | undefined
  assert.ok(fileMatrixPayload)
  assert.equal(fileMatrixPayload?.depthGroupLevels, 8)
  assert.deepEqual(fileMatrixPayload?.interactionStateCoverage, [
    'hover',
    'marquee',
    'selected',
    'handles',
    'cursor',
  ])
})
