// Core boundary isolation tests protect backend-neutral engine contracts from
// drifting back into renderer backend ownership.
import assert from 'node:assert/strict'
import {readFileSync, readdirSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND_NEUTRAL_DIRS = [
  'scene/types',
  'scene/hitTest',
  'scene/worldBounds',
  'core/cache',
  'core/hit',
  'core/camera',
] as const

const INTERNAL_FOUNDATION_DIRS = [
  'math',
  'time',
  'utils',
  'scene',
  'core/cache',
  'core/hit',
  'core/camera',
] as const

// Compatibility forwarders under renderer/ were removed when all importers
// migrated to canonical core/ locations (ref: A-009 cleanup).

/**
 * Lists TypeScript source files under one relative source directory.
 * @param relativeDir Directory relative to engine src root.
 */
function listTypeScriptFiles(relativeDir: string): string[] {
  const absoluteDir = resolve(SOURCE_ROOT, relativeDir)
  const files: string[] = []

  for (const entry of readdirSync(absoluteDir)) {
    const absolutePath = resolve(absoluteDir, entry)
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      files.push(...listTypeScriptFiles(`${relativeDir}/${entry}`))
      continue
    }

    if (entry.endsWith('.ts')) {
      files.push(absolutePath)
    }
  }

  return files
}

/**
 * Reads one source file as UTF-8.
 * @param filePath Absolute file path.
 */
function readSource(filePath: string) {
  return readFileSync(filePath, 'utf8')
}

test('document model, scene hit-test, and core cache/camera/hit do not import renderer backend modules', () => {
  for (const relativeDir of BACKEND_NEUTRAL_DIRS) {
    for (const filePath of listTypeScriptFiles(relativeDir)) {
      const source = readSource(filePath)

      assert.equal(
        /from ['"].*renderer\//.test(source),
        false,
        `${filePath} must not import renderer backend modules`,
      )
    }
  }
})

test('public engine barrel exports backend-neutral APIs from core instead of renderer backend paths', () => {
  const source = readSource(resolve(SOURCE_ROOT, 'index/index.ts'))

  assert.equal(source.includes("'../renderer/cache"), false)
  assert.equal(source.includes("'../renderer/hit"), false)
  assert.equal(source.includes("'../renderer/camera"), false)
  assert.equal(source.includes("'../core/cache"), true)
  assert.equal(source.includes("'../core/hit"), true)
  assert.equal(source.includes("'../core/camera"), true)
})

test('Venus module contract uses short instance-level modules without a global registry', () => {
  const venusSource = readSource(resolve(SOURCE_ROOT, 'runtime/venus/Venus.ts'))
  const catalogSource = readSource(resolve(SOURCE_ROOT, 'runtime/venus/modules/catalog.ts'))
  const servicesSource = readSource(resolve(SOURCE_ROOT, 'runtime/venus/modules/services.ts'))
  const baseSource = readSource(resolve(SOURCE_ROOT, 'base.ts'))

  for (const moduleName of ['render', 'camera', 'hitTest', 'select', 'snap', 'animate', 'debug', 'scale', 'effects', 'history', 'export']) {
    assert.equal(catalogSource.includes(`'${moduleName}'`), true, `missing module name ${moduleName}`)
  }

  assert.equal(venusSource.includes("from './modules/index.ts'"), true)
  assert.equal(catalogSource.includes('VENUS_MODULE_CATALOG'), true)
  assert.equal(catalogSource.includes("status: 'core-module'"), true)
  assert.equal(catalogSource.includes("| 'core-facade'"), true)
  assert.equal(catalogSource.includes("status: 'reserved'"), true)
  assert.equal(servicesSource.includes('VENUS_INTERNAL_SERVICE_NAMES'), true)
  assert.equal(venusSource.includes('largeScenePerformance'), false)
  assert.equal(venusSource.includes('Venus.use'), false)
  assert.equal(venusSource.includes('static use'), false)
  assert.equal(baseSource.includes('createVenus'), true)
  assert.equal(baseSource.includes('defineVenusModule'), true)
  assert.equal(baseSource.includes('new Venus(parameters)'), true)
})

test('internal foundations do not import user-facing Venus module layer', () => {
  for (const relativeDir of INTERNAL_FOUNDATION_DIRS) {
    for (const filePath of listTypeScriptFiles(relativeDir)) {
      const source = readSource(filePath)

      assert.equal(
        /from ['"].*(runtime\/venus|\/base|'\.\.\/base|"\.\.\/base)/.test(source),
        false,
        `${filePath} must not import Venus runtime or base module layer`,
      )
    }
  }
})

test('package exports expose default compatibility and explicit base entry only', () => {
  const packageJson = JSON.parse(readSource(resolve(SOURCE_ROOT, '../package.json'))) as {
    exports: Record<string, string>
  }

  assert.equal(packageJson.exports['.'], './src/index.ts')
  assert.equal(packageJson.exports['./base'], './src/base.ts')
  assert.equal(packageJson.exports['./largeScenePerformance'], undefined)
  assert.equal(packageJson.exports['./preset'], undefined)
})
