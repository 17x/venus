import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {MOCK_FILE} from '../../../runtime/presets/mockFile/mockFile.ts'

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

test('mock file fixture covers EditorFileDocument fields', async () => {
  const fileTypeSource = await readRepoFile('apps/vector-editor-web/src/runtime/types/editorFile.ts')
  const fields = collectInterfaceFields(fileTypeSource, 'EditorFileDocument')
  const missingFields = fields.filter((field) => !(field in MOCK_FILE))
  assert.deepEqual(missingFields, [])
})

test('mock file fixture includes one element that covers ElementProps fields', async () => {
  const elementTypeSource = await readRepoFile('apps/vector-editor-web/src/runtime/types/editorElement.ts')
  const fields = collectInterfaceFields(elementTypeSource, 'ElementProps').filter((field) => field !== 'id' && field !== 'type')
  const coverageElement = MOCK_FILE.elements.find((element) => element.id === 'fixture-full-coverage-element')
  assert.ok(coverageElement, 'fixture-full-coverage-element must exist in MOCK_FILE')
  const missingFields = fields.filter((field) => !(field in coverageElement))
  assert.deepEqual(missingFields, [])
})
