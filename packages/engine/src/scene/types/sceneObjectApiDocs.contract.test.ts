// Engine object API docs tests keep human-readable docs aligned with the
// engine-owned object contract and API-first development rules.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

const DOCS_ROOT = join(import.meta.dirname, '../../../docs/en')

const OBJECT_API_DOCS = [
  'scene-snapshot',
  'group',
  'rect',
  'ellipse',
  'line',
  'polygon',
  'path',
  'text',
  'image',
  'clip',
  'camera',
  'cache',
] as const

const REQUIRED_SECTIONS = [
  '## Purpose',
  '## Required Properties',
  '## Optional Supported Properties',
  '## Render Behavior',
  '## Indexing Behavior',
  '## Hit-Test Behavior',
  '## Patch Behavior',
  '## Cache Behavior',
  '## Demo',
  '## Non-Goals',
] as const

const PROHIBITED_MARKET_LIBRARY_REFERENCES = [
  'inspired',
  'Paper.js',
  'Fabric.js',
  'comparable to',
  'maps to',
  'aligns with',
] as const

/**
 * Reads one engine English documentation file from the docs root.
 */
function readEngineDoc(relativePath: string): string {
  return readFileSync(join(DOCS_ROOT, relativePath), 'utf8')
}

test('engine object API docs use engine-owned language only', () => {
  const docsToCheck = [
    'object-model-api.md',
    ...OBJECT_API_DOCS.map((docName) => `api/scene-objects/${docName}.md`),
  ]

  for (const relativePath of docsToCheck) {
    const content = readEngineDoc(relativePath)

    for (const prohibitedText of PROHIBITED_MARKET_LIBRARY_REFERENCES) {
      assert.equal(
        content.includes(prohibitedText),
        false,
        `${relativePath} should not use market-library comparison wording: ${prohibitedText}`,
      )
    }
  }
})

test('every engine object API doc defines supported properties and behavior', () => {
  for (const docName of OBJECT_API_DOCS) {
    const relativePath = `api/scene-objects/${docName}.md`
    const content = readEngineDoc(relativePath)

    for (const section of REQUIRED_SECTIONS) {
      assert.equal(content.includes(section), true, `${relativePath} should include ${section}`)
    }

    assert.equal(
      content.includes('| Property | Type | Description |'),
      true,
      `${relativePath} should document supported properties in a table`,
    )
  }
})

test('object model API plan preserves API-first development order', () => {
  const content = readEngineDoc('object-model-api.md')

  for (const docName of OBJECT_API_DOCS) {
    assert.equal(
      content.includes(`\`${docName}\``),
      true,
      `object-model-api.md should list ${docName}`,
    )
  }

  assert.equal(content.includes('add type and capability tests'), true)
  assert.equal(content.includes('then add or update render tests'), true)
})

test('engine categorized API catalog links every object API page', () => {
  const content = readEngineDoc('api/README.md')

  assert.equal(content.includes('# Engine API Catalog'), true)
  assert.equal(content.includes('## Runtime and Rendering'), true)
  assert.equal(content.includes('## Scene Object APIs'), true)
  assert.equal(content.includes('## Hit-Test and Query APIs'), true)
  assert.equal(content.includes('## Camera and Cache APIs'), true)

  for (const docName of OBJECT_API_DOCS) {
    assert.equal(
      content.includes(`scene-objects/${docName}.md`),
      true,
      `api/README.md should link ${docName}.md`,
    )
  }
})
