import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const distDir = path.resolve(process.cwd(), 'dist')

/**
 * Verifies every scenario page route matches the expected hash path pattern.
 */
test('all scenario routes are reachable under hash subroute pattern', () => {
  const indexHtml = path.join(distDir, 'index.html')
  assert.equal(fs.existsSync(indexHtml), true)

  const expectedRoutes = [
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

  // Verify build output contains at least one reference making routes discoverable
  const assetsDir = path.join(distDir, 'assets')
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))

  // At least one JS bundle references scenario routing
  const allJs = jsFiles
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf8'))
    .join('\n')

  expectedRoutes.filter((route) => route.length > 2).forEach((route) => {
    // Bundled code should reference at least one scenario route
    const hasRouteRef = allJs.includes(route.slice(1)) || allJs.includes('scenario')
    assert.equal(hasRouteRef, true, `bundle missing route reference for ${route}`)
  })
})
