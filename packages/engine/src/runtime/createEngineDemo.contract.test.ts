// Engine demo contract tests keep the package-local HTML demo wired to the
// public engine runtime instead of a hand-written drawing mock.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

const PACKAGE_ROOT = join(import.meta.dirname, '../..')

/**
 * Reads one package-local file for demo contract assertions.
 */
function readPackageFile(relativePath: string) {
  return readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8')
}

test('engine package exposes a local rendering demo command', () => {
  const packageJson = JSON.parse(readPackageFile('package.json')) as {
    scripts?: Record<string, string>
  }

  assert.equal(packageJson.scripts?.demo, 'vite --host 127.0.0.1')
})

test('engine local HTML demo loads the engine TypeScript entrypoint', () => {
  const html = readPackageFile('demo/index.html')
  const main = readPackageFile('demo/main.ts')

  assert.equal(html.includes('<canvas id="engine-canvas"'), true)
  assert.equal(html.includes('<aside class="panels"'), true)
  assert.equal(html.includes('id="hover-hit"'), true)
  assert.equal(html.includes('id="click-hit"'), true)
  assert.equal(html.includes('id="self-test"'), true)
  assert.equal(html.includes('./main.ts'), true)
  assert.equal(main.includes("from '../src/index.ts'"), true)
  assert.equal(main.includes('createEngine({'), true)
  assert.equal(main.includes("backend: 'canvas2d'"), true)
  assert.equal(main.includes('engine.hitTest('), true)
  assert.equal(main.includes("'hover'"), true)
  assert.equal(main.includes("'clicked'"), true)
  assert.equal(main.includes('queryPointCandidates'), true)
  assert.equal(main.includes('venusEngineDemo'), true)
  assert.equal(main.includes('const demoWindow = window as'), true)
  assert.equal(main.includes('formatSelfTestBlock'), true)
})
