import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, it} from 'node:test'
import {engineApiCategories} from '../engineApiDocs.ts'

const appSource = readFileSync(resolve(import.meta.dirname, '../App.tsx'), 'utf8')

describe('engine docs app contract', () => {
  it('defines categorized API pages with demos', () => {
    assert.ok(engineApiCategories.length >= 4)

    for (const category of engineApiCategories) {
      assert.ok(category.title)
      assert.ok(category.apis.length > 0)

      for (const api of category.apis) {
        assert.ok(api.title)
        assert.ok(api.signature)
        assert.ok(api.readableDescription)
        assert.ok(api.properties.length > 0)
        assert.ok(api.demo.includes('@venus/engine') || api.demo.includes('engine.'))
        assert.ok(api.demoCaption)
      }
    }
  })

  it('documents required engine object and hit-test pages', () => {
    const apiIds = new Set(engineApiCategories.flatMap((category) => category.apis.map((api) => api.id)))

    for (const expectedId of ['engine-options', 'rect', 'ellipse', 'line', 'text', 'hover-hit', 'clicked-hit', 'bounds-cache']) {
      assert.ok(apiIds.has(expectedId), `missing ${expectedId}`)
    }
  })

  it('uses a readable two-column documentation layout with canvas demos', () => {
    assert.match(appSource, /Engine API navigation/)
    assert.match(appSource, /lg:grid-cols-\[300px_minmax\(0,1fr\)\]/)
    assert.match(appSource, /Canvas demo/)
    assert.match(appSource, /data-theme=\{theme\}/)
    assert.match(appSource, /useState<ThemeMode>\('light'\)/)
    assert.doesNotMatch(appSource, /On this page/)
    assert.doesNotMatch(appSource, /TabsTrigger/)
  })
})
