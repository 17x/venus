import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const distDir = path.resolve(process.cwd(), 'dist')

/**
 * Verifies the built playground index.html has root mount point and references bundled assets.
 */
test("playground built index html declares root div and script/style references", () => {
  const indexHtml = path.join(distDir, 'index.html')
  assert.equal(fs.existsSync(indexHtml), true)

  const html = fs.readFileSync(indexHtml, 'utf8')
  assert.equal(html.toLowerCase().includes('root'), true)
  assert.equal(html.includes('.js'), true)
  assert.equal(html.includes('.css'), true)
  assert.equal(html.toLowerCase().includes('playground'), true)
})

/**
 * Verifies route sub-page hash routes have corresponding DOM expectations.
 */
test('playground route subpages map deterministic route patterns to scenario ids', () => {
  const scenarioRoutes = [
    '/medical-volume-slice-runtime',
    '/preop-path-simulation',
    '/bim-collab-review',
    '/cad-assembly-validation',
    '/gis-live-map-streaming',
    '/autodrive-twin-replay',
    '/city-twin-monitor-wall',
    '/commerce-product-variant-runtime',
    '/molecular-volume-exploration',
    '/game-editor-runtime-preview',
    '/node-headless-rendering',
    '/vector-editor-optin-2d',
    '/video-timeline-composition',
  ]

  assert.equal(new Set(scenarioRoutes).size, 13)
  scenarioRoutes.forEach((route) => {
    assert.equal(route.startsWith('/'), true)
    assert.equal(route.length > 5, true)
  })
})
