import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'

import {DOCUMENT_OBJECT_TYPES} from '../documentModel.ts'

const OBJECT_TEST_DOC_BY_TYPE: Record<(typeof DOCUMENT_OBJECT_TYPES)[number], string> = {
  frame: 'frame.md',
  group: 'group.md',
  rectangle: 'rectangle.md',
  ellipse: 'ellipse.md',
  polygon: 'polygon.md',
  star: 'star.md',
  lineSegment: 'line-segment.md',
  path: 'path.md',
  text: 'text.md',
  image: 'image.md',
}

const REQUIRED_TEST_DOC_SECTIONS = [
  '## Object Type',
  '## Model Contract',
  '## Parser Coverage',
  '## Runtime Coverage',
  '## Render Adapter Coverage',
  '## Edge Cases',
]

function resolveObjectModelDocsDir() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../docs/object-model')
}

test('every document object type has an English object test document', () => {
  const docsDir = resolveObjectModelDocsDir()

  for (const objectType of DOCUMENT_OBJECT_TYPES) {
    const docPath = resolve(docsDir, 'tests', OBJECT_TEST_DOC_BY_TYPE[objectType])

    assert.equal(existsSync(docPath), true, `${objectType} is missing ${docPath}`)

    const content = readFileSync(docPath, 'utf8')

    assert.match(content, /^# .+ Test Document/m, `${objectType} doc must have an English title`)
    assert.equal(content.includes(`\`${objectType}\``), true, `${objectType} doc must name the object type`)

    for (const section of REQUIRED_TEST_DOC_SECTIONS) {
      assert.equal(
        content.includes(section),
        true,
        `${objectType} doc must include ${section}`,
      )
    }
  }
})

test('object model overview documents every canonical object type', () => {
  const overviewPath = resolve(resolveObjectModelDocsDir(), 'README.md')
  const content = readFileSync(overviewPath, 'utf8')

  for (const objectType of DOCUMENT_OBJECT_TYPES) {
    assert.equal(content.includes(`\`${objectType}\``), true, `overview must document ${objectType}`)
  }
})
