import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const distDir = path.resolve(process.cwd(), 'dist')

/**
 * Verifies the built playground dist does not regress to an empty or broken output.
 */
test('playground built dist contains nonblank index, script, and style assets', () => {
  if (!fs.existsSync(distDir)) {
    assert.fail('playground dist directory missing; run pnpm build first')
  }

  const indexHtml = path.join(distDir, 'index.html')
  assert.equal(fs.existsSync(indexHtml), true)
  const htmlContent = fs.readFileSync(indexHtml, 'utf8')
  assert.equal(htmlContent.length > 100, true)
  assert.equal(htmlContent.includes('root'), true)

  const assetsDir = path.join(distDir, 'assets')
  assert.equal(fs.existsSync(assetsDir), true)

  const assets = fs.readdirSync(assetsDir)
  const jsFiles = assets.filter((name) => name.endsWith('.js'))
  const cssFiles = assets.filter((name) => name.endsWith('.css'))

  assert.equal(jsFiles.length > 0, true)
  assert.equal(cssFiles.length > 0, true)

  jsFiles.forEach((file) => {
    const jsContent = fs.readFileSync(path.join(assetsDir, file), 'utf8')
    assert.equal(jsContent.length > 500, true)
  })

  cssFiles.forEach((file) => {
    const cssContent = fs.readFileSync(path.join(assetsDir, file), 'utf8')
    assert.equal(cssContent.length > 50, true)
  })
})
