import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {collectDocumentInvariantViolations} from '../../../runtime/model/document-runtime/index.ts'
import {
  createCanonicalDocumentModelFixture,
  createCommercialDocumentFixtureSuite,
  type CommercialDocumentFixtureKind,
} from './canonicalDocumentFixture.ts'

function resolveRepoRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(testDir, '../../../../../..')
}

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.resolve(resolveRepoRoot(), relativePath), 'utf8')
}

function collectInterfaceFields(source: string, interfaceName: string): string[] {
  const match = new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`).exec(source)
  assert.ok(match, `${interfaceName} must exist`)
  const body = match[1] ?? ''
  return [...body.matchAll(/^  ([A-Za-z][A-Za-z0-9]*)\??:/gm)].map((fieldMatch) => fieldMatch[1]).sort()
}

function assertCoverageMatrixContainsFields(matrix: string, fields: readonly string[]): void {
  const missingFields = fields.filter((field) => !matrix.includes(`- ${field}:`))
  assert.deepEqual(missingFields, [])
}

test('canonical document fixture coverage matrix tracks EditorDocument fields', async () => {
  const [modelSource, coverageMatrix] = await Promise.all([
    readRepoFile('apps/vector-editor-web/src/runtime/model/documentModel.ts'),
    readRepoFile('.ai-tasks/vector-editor/vector-fixture-coverage-contract-2026-05-29.md'),
  ])

  assertCoverageMatrixContainsFields(coverageMatrix, collectInterfaceFields(modelSource, 'EditorDocument'))
})

test('canonical document fixture coverage matrix tracks DocumentNode fields', async () => {
  const [modelSource, coverageMatrix] = await Promise.all([
    readRepoFile('apps/vector-editor-web/src/runtime/model/documentModel.ts'),
    readRepoFile('.ai-tasks/vector-editor/vector-fixture-coverage-contract-2026-05-29.md'),
  ])

  assertCoverageMatrixContainsFields(coverageMatrix, collectInterfaceFields(modelSource, 'DocumentNode'))
  assert.equal(coverageMatrix.includes('- fill: deprecated compatibility fixture required.'), true)
  assert.equal(coverageMatrix.includes('- stroke: deprecated compatibility fixture required.'), true)
})

test('canonical document model fixture populates every covered document and node field', async () => {
  const modelSource = await readRepoFile('apps/vector-editor-web/src/runtime/model/documentModel.ts')
  const document = createCanonicalDocumentModelFixture()
  const node = document.shapes.find((shape) => shape.id === 'fixture-styled')

  assert.ok(node)
  collectInterfaceFields(modelSource, 'EditorDocument').forEach((field) => {
    assert.equal(field in document, true, `canonical document fixture missing field: ${field}`)
  })
  collectInterfaceFields(modelSource, 'DocumentNode').forEach((field) => {
    assert.equal(field in node, true, `canonical node fixture missing field: ${field}`)
  })
})

test('commercial document fixture suite exposes every Phase A fixture profile', () => {
  const suite = createCommercialDocumentFixtureSuite()
  const expectedKinds: CommercialDocumentFixtureKind[] = [
    'small',
    'medium',
    'large',
    'text-heavy',
    'image-heavy',
    'group-mask-boolean-heavy',
    'path-heavy',
    'style-heavy',
  ]

  assert.deepEqual(suite.map((fixture) => fixture.kind).sort(), [...expectedKinds].sort())
  suite.forEach((fixture) => {
    assert.equal(fixture.document.extensions?.commercialFixtureKind, fixture.kind)
    assert.deepEqual(fixture.document.extensions?.coverageTags, fixture.coverageTags)
    assert.equal(fixture.document.shapes.length > 0, true)
    assert.deepEqual(collectDocumentInvariantViolations(fixture.document), [])
  })
})

test('commercial document fixture suite gives each product/runtime/adapter gate a reusable sample', () => {
  const suite = createCommercialDocumentFixtureSuite()
  const byKind = new Map(suite.map((fixture) => [fixture.kind, fixture.document]))

  assert.equal((byKind.get('small')?.shapes.length ?? 0) <= 3, true)
  assert.equal((byKind.get('large')?.shapes.length ?? 0) >= 30, true)
  assert.equal((byKind.get('text-heavy')?.shapes.filter((shape) => shape.type === 'text').length ?? 0) >= 8, true)
  assert.equal((byKind.get('image-heavy')?.shapes.filter((shape) => shape.type === 'image').length ?? 0) >= 8, true)
  assert.equal((byKind.get('path-heavy')?.shapes.filter((shape) => shape.type === 'path').length ?? 0) >= 10, true)
  assert.equal(
    (byKind.get('group-mask-boolean-heavy')?.shapes.filter((shape) => shape.booleanOperation).length ?? 0) >= 8,
    true,
  )
  assert.equal(
    (byKind.get('style-heavy')?.shapes.filter((shape) => shape.fills?.some((fill) => fill.gradient)).length ?? 0) >= 6,
    true,
  )
})
