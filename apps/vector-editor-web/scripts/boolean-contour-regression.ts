import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import type {EditorDocument, DocumentNode, Point} from '@vector/model'
import {createSceneMemory, attachSceneMemory, writeDocumentToScene} from '../src/editor/runtime-local/shared-memory/index.ts'
import {createBooleanReplacePatches} from '../src/editor/runtime-local/worker/scope/shapeCommandHelpers.ts'
import {createLocalHistoryEntry} from '../src/editor/runtime-local/worker/scope/localHistoryEntry.ts'
import {createRemotePatches} from '../src/editor/runtime-local/worker/scope/remotePatches.ts'
import {createFileElementsFromDocument, createDocumentNodeFromElement} from '../src/editor/adapters/fileDocument.ts'
import {resolvePathSubSelectionAtPoint} from '../src/editor/hooks/runtime/pathSubSelection.ts'
import type {HistoryPatch} from '../src/editor/runtime-local/worker/history.ts'

interface CheckResult {
  name: string
  passed: boolean
  details: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.join(__dirname, 'boolean-contour-regression.result.json')

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createPathShape(id: string, name: string, points: Point[]): DocumentNode {
  const bounds = getPointsBounds(points)
  return {
    id,
    type: 'path',
    name,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    fill: {enabled: true, color: '#000000'},
    stroke: {enabled: true, color: '#000000', weight: 1},
  }
}

function getPointsBounds(points: Point[]) {
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function splitClosedContours(points: Point[]) {
  const contours: Point[][] = []
  let cursor = 0

  while (cursor < points.length) {
    const start = points[cursor]
    if (!start) {
      break
    }

    const contour: Point[] = [{x: start.x, y: start.y}]
    let closedIndex = -1

    for (let index = cursor + 1; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }
      contour.push({x: point.x, y: point.y})
      if (point.x === start.x && point.y === start.y && contour.length >= 4) {
        closedIndex = index
        break
      }
    }

    if (closedIndex < 0) {
      break
    }

    contours.push(contour)
    cursor = closedIndex + 1
  }

  return contours
}

function createDocument(shapes: DocumentNode[]): EditorDocument {
  return {
    id: 'doc-contour-regression',
    name: 'Boolean Contour Regression',
    width: 1000,
    height: 1000,
    shapes,
  }
}

function createSceneForDocument(document: EditorDocument) {
  const buffer = createSceneMemory(Math.max(16, document.shapes.length + 8))
  const scene = attachSceneMemory(buffer, Math.max(16, document.shapes.length + 8))
  writeDocumentToScene(scene, document)
  return scene
}

function summarizePatchKinds(patches: Array<{type: string}>) {
  return patches.reduce<Record<string, number>>((acc, patch) => {
    acc[patch.type] = (acc[patch.type] ?? 0) + 1
    return acc
  }, {})
}

function applyShapePatches(document: EditorDocument, patches: HistoryPatch[]): EditorDocument {
  const shapes = [...document.shapes]

  for (const patch of patches) {
    if (patch.type === 'remove-shape') {
      shapes.splice(patch.index, 1)
    }
    if (patch.type === 'insert-shape') {
      shapes.splice(patch.index, 0, patch.shape as DocumentNode)
    }
  }

  return {
    ...document,
    shapes,
  }
}

async function main() {
  const checks: CheckResult[] = []

  try {
    const outer = createPathShape('outer', 'Outer', [
      {x: 0, y: 0},
      {x: 240, y: 0},
      {x: 240, y: 240},
      {x: 0, y: 240},
      {x: 0, y: 0},
    ])
    const inner = createPathShape('inner', 'Inner', [
      {x: 80, y: 80},
      {x: 160, y: 80},
      {x: 160, y: 160},
      {x: 80, y: 160},
      {x: 80, y: 80},
    ])
    const donutDoc = createDocument([outer, inner])
    const donutResolved = createBooleanReplacePatches(donutDoc, ['outer', 'inner'], 'subtract')
    assert(Boolean(donutResolved), 'Expected subtract boolean patches for donut scenario')
    const donutInserted = donutResolved!.patches.filter((patch) => patch.type === 'insert-shape')
    assert(donutInserted.length === 1, `Expected exactly one subtract result shape, got ${donutInserted.length}`)
    const donutShape = donutInserted[0].shape as DocumentNode
    const donutContours = splitClosedContours(donutShape.points ?? [])
    assert(donutContours.length >= 2, `Expected hole contour encoding with >=2 contours, got ${donutContours.length}`)
    checks.push({
      name: 'boolean-subtract-hole-contour',
      passed: true,
      details: `inserted=${donutInserted.length}, contours=${donutContours.length}`,
    })
  } catch (error) {
    checks.push({
      name: 'boolean-subtract-hole-contour',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const bar = createPathShape('intersect-bar', 'Intersect Bar', [
      {x: 0, y: 40},
      {x: 300, y: 40},
      {x: 300, y: 140},
      {x: 0, y: 140},
      {x: 0, y: 40},
    ])
    const pillars = createPathShape('intersect-pillars', 'Intersect Pillars', [
      {x: 40, y: 0},
      {x: 110, y: 0},
      {x: 110, y: 200},
      {x: 40, y: 200},
      {x: 40, y: 0},
      {x: 190, y: 0},
      {x: 260, y: 0},
      {x: 260, y: 200},
      {x: 190, y: 200},
      {x: 190, y: 0},
    ])

    const intersectDoc = createDocument([bar, pillars])
    const intersectResolved = createBooleanReplacePatches(intersectDoc, ['intersect-bar', 'intersect-pillars'], 'intersect')
    assert(Boolean(intersectResolved), 'Expected intersect patches for disconnected overlap scenario')

    const intersectInserted = intersectResolved!.patches.filter((patch) => patch.type === 'insert-shape')
    assert(intersectInserted.length === 2, `Expected two shapes for disconnected intersect regions, got ${intersectInserted.length}`)

    checks.push({
      name: 'boolean-intersect-disconnected-results',
      passed: true,
      details: `inserted=${intersectInserted.length}`,
    })
  } catch (error) {
    checks.push({
      name: 'boolean-intersect-disconnected-results',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const left = createPathShape('chain-left', 'Chain Left', [
      {x: 0, y: 0},
      {x: 180, y: 0},
      {x: 180, y: 180},
      {x: 0, y: 180},
      {x: 0, y: 0},
    ])
    const right = createPathShape('chain-right', 'Chain Right', [
      {x: 120, y: 0},
      {x: 300, y: 0},
      {x: 300, y: 180},
      {x: 120, y: 180},
      {x: 120, y: 0},
    ])
    const cut = createPathShape('chain-cut', 'Chain Cut', [
      {x: 140, y: 60},
      {x: 160, y: 60},
      {x: 160, y: 120},
      {x: 140, y: 120},
      {x: 140, y: 60},
    ])

    const baseDocument = createDocument([left, right, cut])
    const unionResolved = createBooleanReplacePatches(baseDocument, ['chain-left', 'chain-right'], 'union')
    assert(Boolean(unionResolved), 'Expected chained union patches')

    const afterUnion = applyShapePatches(baseDocument, unionResolved!.patches as HistoryPatch[])
    const unionShapes = unionResolved!.patches
      .filter((patch) => patch.type === 'insert-shape')
      .map((patch) => patch.shape as DocumentNode)
    assert(unionShapes.length === 1, `Expected one merged shape after union, got ${unionShapes.length}`)
    const unionContours = splitClosedContours(unionShapes[0].points ?? [])
    assert(unionContours.length === 1, `Expected one contour for overlapping union, got ${unionContours.length}`)

    const mergedId = unionShapes[0].id
    const subtractResolved = createBooleanReplacePatches(afterUnion, [mergedId, 'chain-cut'], 'subtract')
    assert(Boolean(subtractResolved), 'Expected subtract patches in chained boolean flow')

    const subtractInserted = subtractResolved!.patches.filter((patch) => patch.type === 'insert-shape')
    assert(subtractInserted.length === 1, `Expected one final subtract shape, got ${subtractInserted.length}`)

    const finalShape = subtractInserted[0].shape as DocumentNode
    const finalContours = splitClosedContours(finalShape.points ?? [])
    assert(finalContours.length >= 2, `Expected hole-preserving contour after chain, got ${finalContours.length}`)

    checks.push({
      name: 'boolean-chained-union-subtract-contour',
      passed: true,
      details: `final.contours=${finalContours.length}, final.points=${finalShape.points?.length ?? 0}`,
    })
  } catch (error) {
    checks.push({
      name: 'boolean-chained-union-subtract-contour',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const contourShape = createPathShape('contour-shape', 'Contour Shape', [
      {x: 0, y: 0},
      {x: 240, y: 0},
      {x: 240, y: 240},
      {x: 0, y: 240},
      {x: 0, y: 0},
      {x: 80, y: 80},
      {x: 160, y: 80},
      {x: 160, y: 160},
      {x: 80, y: 160},
      {x: 80, y: 80},
    ])
    const contourDocument = createDocument([contourShape])
    const selectedShapes = [{id: 'contour-shape', isSelected: true}] as Array<{id: string; isSelected: boolean}>

    const seamHit = resolvePathSubSelectionAtPoint(
      contourDocument,
      selectedShapes as never,
      {x: 40, y: 40},
      {tolerance: 6},
    )
    assert(seamHit === null, 'Expected no seam bridge hit between contour boundaries')

    const innerAnchorHit = resolvePathSubSelectionAtPoint(
      contourDocument,
      selectedShapes as never,
      {x: 80, y: 80},
      {tolerance: 6},
    )
    assert(Boolean(innerAnchorHit), 'Expected anchor hit on inner contour start')
    assert(innerAnchorHit!.hitType === 'anchorPoint', `Expected anchor hit type, got ${innerAnchorHit!.hitType}`)
    assert(
      (innerAnchorHit as {anchorPoint?: {index: number}}).anchorPoint?.index === 5,
      `Expected inner contour start source index 5, got ${(innerAnchorHit as {anchorPoint?: {index?: number}}).anchorPoint?.index ?? 'unknown'}`,
    )

    const holeSegmentHit = resolvePathSubSelectionAtPoint(
      contourDocument,
      selectedShapes as never,
      {x: 120, y: 80},
      {tolerance: 6},
    )
    assert(Boolean(holeSegmentHit), 'Expected segment hit near hole boundary')
    assert(holeSegmentHit!.hitType === 'segment', `Expected segment hit type, got ${holeSegmentHit!.hitType}`)
    assert(
      (holeSegmentHit as {segment?: {index: number}}).segment?.index === 5,
      `Expected hole boundary segment index 5, got ${(holeSegmentHit as {segment?: {index?: number}}).segment?.index ?? 'unknown'}`,
    )

    checks.push({
      name: 'contour-anchor-subselection-edge-cases',
      passed: true,
      details: 'seam-hit=null, inner-anchor-index=5, hole-segment-index=5',
    })
  } catch (error) {
    checks.push({
      name: 'contour-anchor-subselection-edge-cases',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const left = createPathShape('left', 'Left', [
      {x: 0, y: 0},
      {x: 100, y: 0},
      {x: 100, y: 100},
      {x: 0, y: 100},
      {x: 0, y: 0},
    ])
    const right = createPathShape('right', 'Right', [
      {x: 180, y: 0},
      {x: 280, y: 0},
      {x: 280, y: 100},
      {x: 180, y: 100},
      {x: 180, y: 0},
    ])
    const disjointDoc = createDocument([left, right])
    const unionResolved = createBooleanReplacePatches(disjointDoc, ['left', 'right'], 'union')
    assert(Boolean(unionResolved), 'Expected union boolean patches for disjoint scenario')
    const unionInserted = unionResolved!.patches.filter((patch) => patch.type === 'insert-shape')
    assert(unionInserted.length === 2, `Expected two result shapes for disjoint union, got ${unionInserted.length}`)

    const scene = createSceneForDocument(disjointDoc)
    const localEntry = createLocalHistoryEntry({
      type: 'shape.boolean',
      shapeIds: ['left', 'right'],
      mode: 'union',
    }, scene, disjointDoc)
    const backwardKinds = summarizePatchKinds(localEntry.backward)
    assert((backwardKinds['remove-shape'] ?? 0) === unionInserted.length, `Expected backward remove-shape count ${unionInserted.length}, got ${backwardKinds['remove-shape'] ?? 0}`)

    checks.push({
      name: 'local-history-multi-insert-undo',
      passed: true,
      details: `inserted=${unionInserted.length}, backward.remove=${backwardKinds['remove-shape'] ?? 0}`,
    })
  } catch (error) {
    checks.push({
      name: 'local-history-multi-insert-undo',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const base = createPathShape('base', 'Base', [
      {x: 0, y: 0},
      {x: 220, y: 0},
      {x: 220, y: 220},
      {x: 0, y: 220},
      {x: 0, y: 0},
    ])
    const cut = createPathShape('cut', 'Cut', [
      {x: 60, y: 60},
      {x: 180, y: 60},
      {x: 180, y: 180},
      {x: 60, y: 180},
      {x: 60, y: 60},
    ])
    const remoteDoc = createDocument([base, cut])
    const scene = createSceneForDocument(remoteDoc)

    const baseline = createBooleanReplacePatches(remoteDoc, ['base', 'cut'], 'subtract')
    assert(Boolean(baseline), 'Expected baseline boolean patches for remote parity')

    const remote = createRemotePatches({
      id: 'op-boolean-1',
      actorId: 'remote-user',
      type: 'shape.boolean',
      payload: {
        shapeIds: ['base', 'cut'],
        mode: 'subtract',
      },
    }, scene, remoteDoc)

    const baselineKinds = summarizePatchKinds(baseline!.patches)
    const remoteKinds = summarizePatchKinds(remote)
    assert((baselineKinds['insert-shape'] ?? 0) === (remoteKinds['insert-shape'] ?? 0), 'Remote insert-shape count mismatch with local baseline')
    assert((baselineKinds['remove-shape'] ?? 0) === (remoteKinds['remove-shape'] ?? 0), 'Remote remove-shape count mismatch with local baseline')

    checks.push({
      name: 'remote-replay-patch-parity',
      passed: true,
      details: `insert=${remoteKinds['insert-shape'] ?? 0}, remove=${remoteKinds['remove-shape'] ?? 0}`,
    })
  } catch (error) {
    checks.push({
      name: 'remote-replay-patch-parity',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const outer = createPathShape('rt-outer', 'RT Outer', [
      {x: 0, y: 0},
      {x: 240, y: 0},
      {x: 240, y: 240},
      {x: 0, y: 240},
      {x: 0, y: 0},
    ])
    const inner = createPathShape('rt-inner', 'RT Inner', [
      {x: 80, y: 80},
      {x: 160, y: 80},
      {x: 160, y: 160},
      {x: 80, y: 160},
      {x: 80, y: 80},
    ])
    const sourceDoc = createDocument([outer, inner])
    const resolved = createBooleanReplacePatches(sourceDoc, ['rt-outer', 'rt-inner'], 'subtract')
    assert(Boolean(resolved), 'Expected subtract patches for round-trip')
    const inserted = resolved!.patches.filter((patch) => patch.type === 'insert-shape')
    assert(inserted.length === 1, 'Expected one inserted shape for round-trip test')

    const resultShape = inserted[0].shape as DocumentNode
    const beforeContours = splitClosedContours(resultShape.points ?? []).length
    const element = createFileElementsFromDocument(createDocument([resultShape]))[0]
    const roundTripShape = createDocumentNodeFromElement(element)
    const afterContours = splitClosedContours(roundTripShape.points ?? []).length

    assert((resultShape.points?.length ?? 0) === (roundTripShape.points?.length ?? 0), 'Round-trip point count mismatch')
    assert(beforeContours === afterContours, `Round-trip contour count mismatch: before=${beforeContours}, after=${afterContours}`)

    checks.push({
      name: 'file-roundtrip-contour-points',
      passed: true,
      details: `points=${roundTripShape.points?.length ?? 0}, contours=${afterContours}`,
    })
  } catch (error) {
    checks.push({
      name: 'file-roundtrip-contour-points',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  const passed = checks.every((check) => check.passed)
  const report = {
    generatedAt: new Date().toISOString(),
    passed,
    checks,
  }

  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`Boolean contour regression report: ${outputPath}`)
  checks.forEach((check) => {
    const marker = check.passed ? 'PASS' : 'FAIL'
    console.log(`[${marker}] ${check.name} :: ${check.details}`)
  })

  if (!passed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
