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
