import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../model/index.ts'
import type {SceneShapeSnapshot} from '../../shared-memory/index.ts'
import {createEngineSceneFromRuntimeSnapshot} from './engineSceneAdapter.ts'

/**
 * Creates one minimal document fixture for scene-adapter contract tests.
 */
function createMinimalDocument(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'Document',
    width: 1200,
    height: 800,
    shapes: [{
      id: 'shape-1',
      type: 'rectangle',
      name: 'Rectangle',
      x: 100,
      y: 120,
      width: 240,
      height: 180,
    }],
  }
}

/**
 * Creates one minimal shared-memory snapshot aligned with the fixture document.
 */
function createMinimalShapeSnapshot(): SceneShapeSnapshot[] {
  return [{
    id: 'shape-1',
    name: 'Rectangle',
    type: 'rectangle',
    x: 100,
    y: 120,
    width: 240,
    height: 180,
    isHovered: false,
    isSelected: false,
  }]
}

/**
 * Creates one text-document fixture with paragraph style fields on text runs.
 */
function createTextDocumentWithParagraphStyle(): EditorDocument {
  return {
    id: 'doc-text-1',
    name: 'Text Document',
    width: 1000,
    height: 600,
    shapes: [{
      id: 'text-1',
      type: 'text',
      name: 'Text Node',
      text: 'paragraph style',
      textRuns: [{
        start: 0,
        end: 15,
        style: {
          color: '#111111',
          fontFamily: 'Arial',
          fontSize: 16,
          lineHeight: 1.4,
          letterSpacing: 0,
          textAlign: 'center',
          verticalAlign: 'middle',
          paragraphIndentLeft: 12,
          paragraphIndentFirst: 6,
          paragraphIndentRight: 10,
          paragraphSpaceBeforeLine: 8,
          paragraphSpaceAfterLine: 9,
        },
      }],
      x: 80,
      y: 120,
      width: 320,
      height: 72,
    }],
  }
}

/**
 * Creates one text shape snapshot aligned with the text fixture document.
 */
function createTextShapeSnapshot(): SceneShapeSnapshot[] {
  return [{
    id: 'text-1',
    name: 'Text Node',
    type: 'text',
    x: 80,
    y: 120,
    width: 320,
    height: 72,
    isHovered: false,
    isSelected: false,
  }]
}

test('scene adapter applies compatibility defaults for lighting and material', () => {
  const scene = createEngineSceneFromRuntimeSnapshot({
    document: createMinimalDocument(),
    shapes: createMinimalShapeSnapshot(),
    revision: 1,
    compatibility: {
      dimensionMode: 'hybrid-2d3d',
      defaultLightingMode: 'lit',
      defaultMaterialId: 'material/vector-default',
    },
  })

  const node = scene.nodes.find((item) => item.id === 'shape-1')
  assert.ok(node)
  assert.equal(node?.lightingMode, 'lit')
  assert.equal(node?.materialId, 'material/vector-default')
})

test('scene adapter projects paragraph style fields from text runs', () => {
  const scene = createEngineSceneFromRuntimeSnapshot({
    document: createTextDocumentWithParagraphStyle(),
    shapes: createTextShapeSnapshot(),
    revision: 2,
  })

  const node = scene.nodes.find((item) => item.id === 'text-1') as Record<string, unknown> | undefined
  assert.ok(node)
  const style = (node?.style ?? {}) as Record<string, unknown>
  assert.equal(style.paragraphIndentLeft, 12)
  assert.equal(style.paragraphIndentFirst, 6)
  assert.equal(style.paragraphIndentRight, 10)
  assert.equal(style.paragraphSpaceBeforeLine, 8)
  assert.equal(style.paragraphSpaceAfterLine, 9)

  const runs = Array.isArray(node?.runs) ? node?.runs as Array<Record<string, unknown>> : []
  const runStyle = (runs[0]?.style ?? {}) as Record<string, unknown>
  assert.equal(runStyle.paragraphIndentLeft, 12)
  assert.equal(runStyle.paragraphIndentFirst, 6)
  assert.equal(runStyle.paragraphIndentRight, 10)
  assert.equal(runStyle.paragraphSpaceBeforeLine, 8)
  assert.equal(runStyle.paragraphSpaceAfterLine, 9)
})

test('scene adapter keeps absolute-positioned group children from receiving group translation twice', () => {
  const document: EditorDocument = {
    id: 'doc-group',
    name: 'Group Document',
    width: 400,
    height: 300,
    shapes: [
      {id: 'group-1', type: 'group', name: 'Group', x: 80, y: 60, width: 200, height: 160, childIds: ['child-1']},
      {id: 'child-1', type: 'rectangle', name: 'Child', x: 100, y: 90, width: 40, height: 30, parentId: 'group-1'},
    ],
  }
  const shapes: SceneShapeSnapshot[] = document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: false,
    isSelected: false,
  }))

  const scene = createEngineSceneFromRuntimeSnapshot({document, shapes, revision: 3})
  const group = scene.nodes.find((node) => node.id === 'group-1')
  const child = scene.nodes.find((node) => node.id === 'child-1')

  assert.ok(group)
  assert.equal(group.transform, undefined)
  assert.equal(group.x, 80)
  assert.equal(child?.x, 100)
})

test('scene adapter emits standard Canvas affine matrix order for rotated nodes', () => {
  const document = createMinimalDocument()
  document.shapes[0] = {
    ...document.shapes[0],
    rotation: 30,
  }
  const scene = createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: createMinimalShapeSnapshot(),
    revision: 31,
  })

  const node = scene.nodes.find((item) => item.id === 'shape-1') as Record<string, unknown> | undefined
  const transform = node?.transform as {matrix?: number[]} | undefined
  const matrix = transform?.matrix
  assert.ok(matrix)
  assert.equal(matrix.length, 6)
  assert.equal(Math.abs(matrix[2] ?? 0) < 1, true, 'c component should contain skew/rotation, not translation')
  assert.equal(Math.abs(matrix[4] ?? 0) > 1, true, 'e component should contain translation')
})

test('scene adapter projects clip references into generic engine clip fields', () => {
  const document: EditorDocument = {
    id: 'doc-clip',
    name: 'Clip Document',
    width: 400,
    height: 300,
    shapes: [
      {id: 'clip-1', type: 'ellipse', name: 'Clip', x: 20, y: 30, width: 100, height: 80},
      {
        id: 'image-1',
        type: 'image',
        name: 'Image',
        x: 0,
        y: 0,
        width: 160,
        height: 120,
        assetId: 'asset-1',
        assetUrl: 'data:image/png;base64,fixture',
        clipPathId: 'clip-1',
        clipRule: 'evenodd',
      },
    ],
  }
  const shapes: SceneShapeSnapshot[] = document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: false,
    isSelected: false,
  }))

  const scene = createEngineSceneFromRuntimeSnapshot({document, shapes, revision: 4})
  const image = scene.nodes.find((node) => node.id === 'image-1')

  assert.equal(image?.clipPathId, 'clip-1')
  assert.equal(image?.clipRule, 'evenodd')
  assert.equal(image?.clip, undefined)
})
