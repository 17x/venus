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
const RENDERER_COMPAT_DIRS = [
  'renderer/cache',
  'renderer/hit',
  'renderer/camera',
] as const

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

test('renderer cache, hit, and camera modules stay compatibility forwarders only', () => {
  for (const relativeDir of RENDERER_COMPAT_DIRS) {
    for (const filePath of listTypeScriptFiles(relativeDir)) {
      const source = readSource(filePath)
      const publicDeclarationPattern = /export\s+(class|function|interface)\s+/

      assert.equal(
        publicDeclarationPattern.test(source),
        false,
        `${filePath} should forward core ownership instead of declaring backend-neutral APIs`,
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
