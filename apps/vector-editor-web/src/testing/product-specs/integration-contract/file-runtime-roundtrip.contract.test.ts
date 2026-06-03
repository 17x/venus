import assert from 'node:assert/strict'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'

import {
  createEditorDocumentFromFile,
  createFileElementsFromDocument,
} from '../../../runtime/adapters/fileDocument/fileDocument.ts'
import {createRuntimeSceneFromVisionFile} from '../../../runtime/adapters/fileFormatScene.ts'
import {projectSceneSemantic3DForEngine} from '../../../runtime/engine-bridge/engine.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies file -> runtime document round trip preserves release-critical document metadata and asset links.
 */
test('file runtime round trip preserves metadata, style refs, extensions, and asset urls', () => {
  const sourceDocument = createCanonicalDocumentModelFixture()
  const fileDocument = {
    id: sourceDocument.id,
    name: sourceDocument.name,
    version: '1.0.0',
    createdAt: sourceDocument.createdAt ?? 0,
    updatedAt: sourceDocument.updatedAt ?? 0,
    schema: sourceDocument.schema,
    pages: sourceDocument.pages,
    activePageId: sourceDocument.activePageId,
    lifecycle: sourceDocument.lifecycle,
    styleReferences: sourceDocument.styleReferences,
    extensions: sourceDocument.extensions,
    config: {
      page: {
        unit: 'px',
        width: sourceDocument.width,
        height: sourceDocument.height,
        dpi: 72,
      },
    },
    elements: [
      ...createFileElementsFromDocument(sourceDocument),
      {
        id: 'roundtrip-image',
        type: 'image',
        name: 'Roundtrip Image',
        x: 40,
        y: 48,
        width: 128,
        height: 96,
        asset: 'asset-primary',
      },
    ],
    assets: [
      {
        id: 'asset-primary',
        name: 'Primary Asset',
        type: 'image',
        mimeType: 'image/png',
        objectUrl: 'blob:fixture-asset',
      },
    ],
  }

  const roundTripDocument = createEditorDocumentFromFile(fileDocument)
  const imageNode = roundTripDocument.shapes.find((shape) => shape.id === 'roundtrip-image')

  assert.deepEqual(roundTripDocument.schema, sourceDocument.schema)
  assert.deepEqual(roundTripDocument.pages, sourceDocument.pages)
  assert.equal(roundTripDocument.activePageId, sourceDocument.activePageId)
  assert.deepEqual(roundTripDocument.lifecycle, {
    ...sourceDocument.lifecycle,
    recoveryReason: undefined,
  })
  assert.deepEqual(roundTripDocument.styleReferences, sourceDocument.styleReferences)
  assert.deepEqual(roundTripDocument.extensions, sourceDocument.extensions)
  assert.equal(imageNode?.assetUrl, 'blob:fixture-asset')
})

/**
 * Verifies direct file-to-authoring mapping preserves commercial authoring fields that runtime scenes cannot own.
 */
test('file authoring round trip preserves modern node style, text, mask, component, and extension fields', () => {
  const sourceDocument = createCanonicalDocumentModelFixture()
  const fileDocument = {
    id: sourceDocument.id,
    name: sourceDocument.name,
    version: '1.0.0',
    createdAt: sourceDocument.createdAt ?? 0,
    updatedAt: sourceDocument.updatedAt ?? 0,
    schema: sourceDocument.schema,
    pages: sourceDocument.pages,
    activePageId: sourceDocument.activePageId,
    lifecycle: sourceDocument.lifecycle,
    styleReferences: sourceDocument.styleReferences,
    extensions: sourceDocument.extensions,
    config: {
      page: {
        unit: 'px',
        width: sourceDocument.width,
        height: sourceDocument.height,
        dpi: 72,
      },
    },
    elements: createFileElementsFromDocument(sourceDocument),
    assets: [
      {
        id: 'asset-primary',
        name: 'Primary Asset',
        type: 'image',
        mimeType: 'image/png',
        objectUrl: 'blob:fixture-asset',
      },
    ],
  }

  const roundTripDocument = createEditorDocumentFromFile(fileDocument)
  const sourceNode = sourceDocument.shapes.find((shape) => shape.id === 'fixture-styled')
  const roundTripNode = roundTripDocument.shapes.find((shape) => shape.id === 'fixture-styled')
  assert.ok(sourceNode, 'source fixture-styled node should exist')
  assert.ok(roundTripNode, 'round-trip fixture-styled node should exist')

  assert.deepEqual(roundTripNode.fills, sourceNode.fills)
  assert.deepEqual(roundTripNode.strokes, sourceNode.strokes)
  assert.deepEqual(roundTripNode.shadow, sourceNode.shadow)
  assert.deepEqual(roundTripNode.blur, sourceNode.blur)
  assert.equal(roundTripNode.opacity, sourceNode.opacity)
  assert.equal(roundTripNode.blendMode, sourceNode.blendMode)
  assert.equal(roundTripNode.locked, sourceNode.locked)
  assert.equal(roundTripNode.visible, sourceNode.visible)
  assert.deepEqual(roundTripNode.textRuns, sourceNode.textRuns)
  assert.equal(roundTripNode.textAutoHeight, sourceNode.textAutoHeight)
  assert.equal(roundTripNode.textTruncation, sourceNode.textTruncation)
  assert.equal(roundTripNode.textMaxLines, sourceNode.textMaxLines)
  assert.equal(roundTripNode.booleanOperation, sourceNode.booleanOperation)
  assert.equal(roundTripNode.componentId, sourceNode.componentId)
  assert.deepEqual(roundTripNode.componentProperties, sourceNode.componentProperties)
  assert.equal(roundTripNode.schema?.maskGroupId, sourceNode.schema?.maskGroupId)
  assert.equal(roundTripNode.schema?.maskRole, sourceNode.schema?.maskRole)
  assert.deepEqual(roundTripNode.styleRefs, sourceNode.styleRefs)
  assert.deepEqual(roundTripNode.extensions, sourceNode.extensions)
  assert.equal(roundTripNode.assetUrl, 'blob:fixture-asset')
})

/**
 * Verifies file -> runtime scene -> engine graph projection keeps deterministic 3D semantics.
 */
test('file runtime round trip projects stable semantic3d engine graph fields', () => {
  const sourceDocument = createCanonicalDocumentModelFixture()
  const fileDocument = {
    id: sourceDocument.id,
    name: sourceDocument.name,
    version: '1.0.0',
    createdAt: sourceDocument.createdAt ?? 0,
    updatedAt: sourceDocument.updatedAt ?? 0,
    schema: sourceDocument.schema,
    config: {
      page: {
        unit: 'px',
        width: sourceDocument.width,
        height: sourceDocument.height,
        dpi: 72,
      },
    },
    elements: createFileElementsFromDocument(sourceDocument),
  }
  const runtimeScene = createRuntimeSceneFromVisionFile(fileDocument)
  const shapeById = new Map(sourceDocument.shapes.map((shape) => [shape.id, shape]))
  const projected = projectSceneSemantic3DForEngine({
    revision: 3,
    width: runtimeScene.canvasWidth,
    height: runtimeScene.canvasHeight,
    nodes: runtimeScene.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      parentId: node.parentId ?? undefined,
      x: shapeById.get(node.id)?.x,
      y: shapeById.get(node.id)?.y,
      width: shapeById.get(node.id)?.width,
      height: shapeById.get(node.id)?.height,
    })),
  }, sourceDocument)

  assert.equal(projected.revision, 3)
  assert.equal(projected.nodes.length > 0, true)
  const engine = createEngine({
    surface: createTestSurface(projected.width, projected.height),
    backend: 'headless',
  })
  engine.setGraph({
    revision: projected.revision,
    nodes: projected.nodes,
  })
  const engineGraph = engine.getGraph()

  assert.equal(engineGraph.revision, projected.revision)
  assert.deepEqual(engineGraph.nodes.map((node) => node.id), projected.nodes.map((node) => node.id))
  projected.nodes.forEach((node, index) => {
    assert.equal(node.semantic3d?.bounds.z, index)
    assert.equal(node.semantic3d?.transform.scaleZ, 1)
    assert.equal(node.semantic3d?.renderOrder, index)
    assert.equal(node.visible, true)
  })
  engine.dispose()
})
