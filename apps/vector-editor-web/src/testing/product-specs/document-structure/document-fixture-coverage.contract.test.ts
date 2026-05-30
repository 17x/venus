import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {createCanonicalDocumentModelFixture} from './canonicalDocumentFixture.ts'

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
